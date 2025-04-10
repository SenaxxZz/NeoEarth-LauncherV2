const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require("electron");
const package = require("./package.json");
const path = require("path");
const express = require("express");
const expressapp = new express();
const http = require("http");
const log = require("electron-log");
const Store = require("electron-store");
const dataPath = path.join(app.getPath('userData'), ".neoearth-mc");
const fs = require("fs");
const store = new Store();
const { exec } = require('child_process');
let mainWindow;
let tray = null;

// Configuration spécifique pour macOS pour éviter les problèmes de thread
if (process.platform === 'darwin') {
  // Activer ces options aide à prévenir certains problèmes sur macOS
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  
  // Cette option est cruciale pour l'erreur NSInternalInconsistencyException
  app.allowRendererProcessReuse = false;

  // Désactiver le sandbox pour permettre l'utilisation de librairies natives
  app.enableSandbox = false;
}

// Création de la fenêtre principale
const createWindow = () => {
  // Configuration commune de la fenêtre
  const windowOptions = {
    icon: path.join(__dirname, "./assets/icon/logo.png"),
    autoHideMenuBar: true,
    title: `${package.name} ${package.version}`,
    width: 1200,
    height: 700,
    fullscreenable: true,
    maximizable: true,
    movable: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true, 
      nodeIntegrationInWorker: true,
      devTools: true
    }
  };

  // Ajuster pour macOS - vitale pour l'erreur NSInternalInconsistencyException
  if (process.platform === 'darwin') {
    // Sur macOS, on utilise une approche différente pour créer la fenêtre afin d'éviter les problèmes de thread
    app.dock.show(); // S'assurer que l'application apparaît dans le Dock
    
    // Créer la fenêtre sur le thread principal
    mainWindow = new BrowserWindow(windowOptions);
    
    // Éviter les modifications directes au style qui peuvent causer l'erreur
    mainWindow.on('resize', () => {
      // Force render on main thread
      app.focus();
    });
    
    mainWindow.on('maximize', () => {
      // Force render on main thread
      app.focus();
    });
  } else {
    // Configuration normale pour Windows et autres plateformes
    mainWindow = new BrowserWindow(windowOptions);
  }

  // Charger la page de démarrage
  mainWindow.loadFile("./html/login.html");
  
  // Gestionnaires d'événements pour la fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Création des dossiers nécessaires au démarrage
const setupDirectories = () => {
  console.log(`Dossier de données: ${dataPath}`);
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    console.log(`Directory .neoearth-mc created at ${dataPath}`);
  } else {
    console.log(`Directory .neoearth-mc already exists at ${dataPath}`);
  }
  
  const modsPath = path.join(dataPath, 'mods');
  if (!fs.existsSync(modsPath)) {
    fs.mkdirSync(modsPath, { recursive: true });
    console.log(`Directory mods created at ${modsPath}`);
  } else {
    console.log(`Directory mods already exists at ${modsPath}`);
  }

  // Autres dossiers nécessaires
  const foldersThatShouldExist = ['resourcepacks', 'screenshots', 'saves', 'natives'];
  
  foldersThatShouldExist.forEach(folder => {
    const folderPath = path.join(dataPath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Directory ${folder} created at ${folderPath}`);
    }
  });
};

// Configuration du correctif pour macOS pour résoudre l'erreur NSInternalInconsistencyException
const setupMacOSFix = () => {
  if (process.platform !== 'darwin') return;
  
  // Script qui force l'application à s'exécuter sur le thread principal
  const macFixScript = `
  function fixThreadIssues() {
    const app = Application.currentApplication();
    app.includeStandardAdditions = true;
    
    try {
      app.doShellScript('defaults write org.lwjgl.opengl.Display NSRequiresAquaSystemAppearance -bool YES');
      app.doShellScript('defaults write org.lwjgl.opengl.Window NSRequiresAquaSystemAppearance -bool YES');
    } catch(err) {
      console.log('Error setting defaults: ' + err);
    }
  }
  
  fixThreadIssues();
  `;
  
  // Créer le fichier de script
  const scriptPath = path.join(dataPath, 'mac-fix.scpt');
  try {
    fs.writeFileSync(scriptPath, macFixScript);
    console.log('Script de correctif macOS créé');
    
    // Exécuter le script
    exec(`osascript "${scriptPath}"`, (error) => {
      if (error) console.error('Erreur lors de l\'exécution du script de correctif:', error);
    });
  } catch (err) {
    console.error('Erreur lors de la création du script de correctif:', err);
  }
};

// Initialisation de l'application
app.whenReady().then(() => {
  // Configurer les répertoires nécessaires
  setupDirectories();
  
  // Configurer le correctif macOS si nécessaire
  if (process.platform === 'darwin') {
    setupMacOSFix();
  }
  
  // Démarrer le serveur express
  const server = http.createServer(expressapp);
  server.on("error", err => {
    if (err.code === "EADDRINUSE") {
      console.log("Port déjà utilisé, fermeture de l'application...");
      return app.quit();
    }
  });

  // Lancement du serveur et de l'application
  server.listen(4850, async () => {
    createWindow();
    
    // Configuration de l'icône dans le plateau système (tray)
    const trayIcon = path.join(__dirname, "./assets/icon/logo.png");
    
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "NeoEarth-MC",
        icon: path.join(__dirname, "./assets/icon/logo16x16.png"),
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Afficher',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            if (process.platform === 'darwin') {
              app.focus({ steal: true });
            } else {
              mainWindow.focus();
            }
          }
        }
      },
      {
        label: 'Cacher',
        click: () => {
          if (mainWindow) {
            mainWindow.hide();
          }
        }
      },
      {
        label: 'Quitter',
        click: () => { 
          app.quit(); 
        }
      }
    ]);
    
    tray.setToolTip('NeoEarth-MC');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        if (process.platform === 'darwin') {
          app.focus({ steal: true });
        } else {
          mainWindow.focus();
        }
      }
    });
  });
});

// Gestionnaires IPC

// Quitter l'application
ipcMain.on("quit", () => {
  console.info(["LOG"], "Application Closed.");
  app.quit();
});

// Minimiser la fenêtre
ipcMain.on("minimize", () => {
  if (!mainWindow) return;
  
  if (process.platform === 'darwin') {
    // Sur macOS, on s'assure que l'opération est faite sur le thread principal
    setTimeout(() => {
      mainWindow.minimize();
    }, 0);
  } else {
    mainWindow.minimize();
  }
});

// Maximiser ou restaurer la fenêtre
ipcMain.on("maximize", () => {
  if (!mainWindow) return;
  
  if (process.platform === 'darwin') {
    // Sur macOS, on s'assure que l'opération est faite sur le thread principal
    setTimeout(() => {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }, 0);
  } else {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// Charger la page de login
ipcMain.on("login", () => {
  if (mainWindow) {
    mainWindow.loadFile("./html/login.html");
  }
});

// Afficher la page de maintenance
ipcMain.on("maintenance", (err, message) => {
  if (mainWindow) {
    mainWindow.loadFile("./html/error/maintenance.html");
  }
});

// Cacher la fenêtre
ipcMain.on("hide", () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Afficher la page de mise à jour
ipcMain.on("update", () => {
  if (mainWindow) {
    mainWindow.setTitle(`${package.name} ${package.version} - Mise à Jour Disponible`);
    mainWindow.loadFile("./html/update.html");
  }
});

// Charger la page principale
ipcMain.on("main", async () => {
  if (!mainWindow) return;
  
  // Fonction spéciale pour macOS pour éviter les problèmes de thread
  const setupMacOSWindowFix = () => {
    if (process.platform !== 'darwin') return Promise.resolve();
    
    return new Promise((resolve) => {
      // Script AppleScript qui s'assure que les opérations de fenêtre se passent sur le thread principal
      const fixScript = `
      osascript -e '
      tell application "System Events"
        set frontProcess to first process where it is frontmost
        set visible of frontProcess to true
      end tell'
      `;
      
      exec(fixScript, () => resolve());
    });
  };
  
  if (process.platform === 'darwin') {
    // Appliquer le correctif sur macOS avant les modifications de fenêtre
    await setupMacOSWindowFix();
    
    // Utiliser setTimeout pour s'assurer que les opérations sont sur le thread principal
    setTimeout(() => {
      mainWindow.setTitle(`${package.name} ${package.version}`);
      mainWindow.setSize(1200, 700, false);
      mainWindow.loadFile("./html/index.html");
    }, 50);
  } else {
    // Comportement normal sur Windows
    mainWindow.setTitle(`${package.name} ${package.version}`);
    mainWindow.setSize(1200, 700);
    mainWindow.loadFile("./html/index.html");
  }

  // Configuration de Discord Rich Presence
  const RPC = require("discord-rpc");
  const rpc = new RPC.Client({ transport: 'ipc' });
  rpc.on("ready", () => {
    console.log("Rich Presence set!");
    rpc.setActivity({
      largeImageKey: "https://cdn.discordapp.com/emojis/1217490756688936980.png",
      largeImageText: "NeoEarth-MC",
      smallImageKey: `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${store.get("username")}.png`,
      smallImageText: `${store.get("username")}`,
      state: "⚒️ Gère une nation",
      details: "🎮 Actuellement sur NeoEarth-MC",
      startTimestamp: new Date(),
      buttons: [
        {
          label: 'Discord',
          url: 'https://discord.gg/NRrwNm39G8'
        },
        {
          label: 'Site Web',
          url: 'https://www.neoearth-mc.fr'
        }
      ]
    });
  });

  rpc.login({ clientId: "1216094434899263568" });
});

// Gestion des logs
ipcMain.on("log", (err, text) => {
  log.info(["LOG"], text);
});

// Gestion des dialogues pour sélection de fichier
ipcMain.on("openDialogFile", async (event, location) => {
  // Fonction commune pour traiter le résultat
  const processDialogResult = (result) => {
    if (!result.filePaths || result.filePaths.length === 0) return;
    
    for (let i = 0; i < result.filePaths.length; i++) {
      const fileName = path.basename(result.filePaths[i]);
      const destinationPath = path.join(dataPath, location, fileName);
      
      try {
        fs.copyFileSync(result.filePaths[i], destinationPath);
        
        let settingsLocation = location;
        if (location === "resourcepacks") {
          settingsLocation = "SettingsSrcPack";
        } else {
          settingsLocation = "SettingsShaders";
        }
        
        event.sender.send('update-file-list', { 
          path: settingsLocation, 
          fileName: fileName 
        });
      } catch (error) {
        console.error(`Erreur copie fichier ${fileName}:`, error);
      }
    }
  };
  
  // Sur macOS, assurer que le dialog s'exécute sur le thread principal
  if (process.platform === 'darwin') {
    setTimeout(async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
        });
        processDialogResult(result);
      } catch (error) {
        console.error("Erreur dialog:", error);
      }
    }, 0);
  } else {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
      });
      processDialogResult(result);
    } catch (error) {
      console.error("Erreur dialog:", error);
    }
  }
});

// Gestion spéciale pour macOS
if (process.platform === 'darwin') {
  // Réactiver l'application quand on clique sur l'icône du Dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}

// Pour toutes les plateformes, gérer la fermeture de l'application
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});