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

// Configuration spéciale pour macOS afin d'éviter l'erreur NSInternalInconsistencyException
if (process.platform === 'darwin') {
  // Ces options aident à prévenir les problèmes de thread sur macOS
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-threaded-scrolling');
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  
  // Ces options sont cruciales pour éviter les problèmes de thread sur macOS
  app.allowRendererProcessReuse = false;
  app.enableSandbox = false;
}

// Script AppleScript pour garantir les opérations de fenêtre sur le thread principal
const runMacOSThreadFix = () => {
  if (process.platform !== 'darwin') return Promise.resolve();
  
  return new Promise((resolve) => {
    const fixScript = `
    osascript -e '
    tell application "System Events"
      set frontProcess to first process where it is frontmost
      set visible of frontProcess to true
    end tell'
    `;
    
    exec(fixScript, (error) => {
      if (error) console.error("Erreur lors de l'exécution du script AppleScript:", error);
      resolve();
    });
  });
};

// Création de la fenêtre principale
const createWindow = async () => {
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

  if (process.platform === 'darwin') {
    // Pour macOS, on attend un court instant pour s'assurer que l'application est prête
    await new Promise(resolve => setTimeout(resolve, 100));
    // S'assurer que l'application apparaît dans le Dock
    app.dock.show();
    // Exécuter le fix thread avant de créer la fenêtre
    await runMacOSThreadFix();
  }
  
  // Créer la fenêtre
  mainWindow = new BrowserWindow(windowOptions);
  
  // Configuration spécifique pour macOS
  if (process.platform === 'darwin') {
    // Ajouter des listeners qui évitent les modifications directes au style
    mainWindow.on('resize', () => {
      app.focus();
    });
    
    mainWindow.on('maximize', () => {
      app.focus();
    });
  }
  
  // Charger la page de démarrage
  mainWindow.loadFile("./html/login.html");
  
  // Gestionnaire d'événement pour la fermeture
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Configuration des dossiers nécessaires
const setupDirectories = () => {
  console.log(`Dossier de données: ${dataPath}`);
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
    console.log(`Directory .neoearth-mc created at ${dataPath}`);
  } else {
    console.log(`Directory .neoearth-mc already exists at ${dataPath}`);
  }
  
  // Création des sous-dossiers requis
  const requiredFolders = ['mods', 'resourcepacks', 'screenshots', 'saves', 'natives'];
  
  requiredFolders.forEach(folder => {
    const folderPath = path.join(dataPath, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`Directory ${folder} created at ${folderPath}`);
    }
  });
};

// Configurer les paramètres macOS spécifiques pour LWJGL
const setupMacOSSpecificSettings = () => {
  if (process.platform !== 'darwin') return;
  
  // Créer un script pour configurer les paramètres système nécessaires
  const macFixScript = `
  osascript -e '
  do shell script "defaults write org.lwjgl.opengl.Display NSRequiresAquaSystemAppearance -bool YES"
  do shell script "defaults write org.lwjgl.opengl.Window NSRequiresAquaSystemAppearance -bool YES"
  do shell script "defaults write com.apple.CrashReporter DialogType none"
  '
  `;
  
  exec(macFixScript, (error) => {
    if (error) console.error('Erreur lors de la configuration macOS:', error);
    else console.log('Configuration macOS pour LWJGL appliquée');
  });
};

// Initialisation de l'application
app.whenReady().then(async () => {
  // Configurer les répertoires et paramètres spécifiques
  setupDirectories();
  
  if (process.platform === 'darwin') {
    setupMacOSSpecificSettings();
  }
  
  // Démarrer le serveur express
  const server = http.createServer(expressapp);
  server.on("error", err => {
    if (err.code === "EADDRINUSE") {
      console.log("Port déjà utilisé, fermeture de l'application...");
      return app.quit();
    }
  });

  // Lancement du serveur et création de la fenêtre
  server.listen(4850, async () => {
    await createWindow();
    
    // Configuration de l'icône tray
    const trayIcon = path.join(__dirname, "./assets/icon/logo.png");
    
    // Création du tray dans un bloc sécurisé
    try {
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
          click: async () => {
            if (!mainWindow) return;
            
            if (process.platform === 'darwin') {
              await runMacOSThreadFix();
              setTimeout(() => {
                mainWindow.show();
                app.focus({ steal: true });
              }, 0);
            } else {
              mainWindow.show();
              mainWindow.focus();
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
  
      tray.on('click', async () => {
        if (!mainWindow) return;
        
        if (process.platform === 'darwin') {
          await runMacOSThreadFix();
          setTimeout(() => {
            mainWindow.show();
            app.focus({ steal: true });
          }, 0);
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } catch (error) {
      console.error("Erreur lors de la création du tray:", error);
    }
  });
});

// Gestionnaires IPC

// Quitter l'application
ipcMain.on("quit", () => {
  console.info(["LOG"], "Application Closed.");
  app.quit();
});

// Minimiser la fenêtre en toute sécurité
ipcMain.on("minimize", async () => {
  if (!mainWindow) return;
  
  if (process.platform === 'darwin') {
    // Exécuter le fix thread avant de minimiser
    await runMacOSThreadFix();
    setTimeout(() => {
      mainWindow.minimize();
    }, 0);
  } else {
    mainWindow.minimize();
  }
});

// Maximiser ou restaurer la fenêtre en toute sécurité
ipcMain.on("maximize", async () => {
  if (!mainWindow) return;
  
  if (process.platform === 'darwin') {
    // Exécuter le fix thread avant de maximiser/restaurer
    await runMacOSThreadFix();
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

// Charger la page principale avec sécurité pour macOS
ipcMain.on("main", async () => {
  if (!mainWindow) return;
  
  if (process.platform === 'darwin') {
    // Exécuter le fix thread avant les modifications de la fenêtre
    await runMacOSThreadFix();
    
    // Utiliser setTimeout pour s'assurer que les opérations sont sur le thread principal
    setTimeout(() => {
      mainWindow.setTitle(`${package.name} ${package.version}`);
      mainWindow.setSize(1200, 700, false);
      mainWindow.loadFile("./html/index.html");
    }, 100);
  } else {
    // Comportement normal pour Windows
    mainWindow.setTitle(`${package.name} ${package.version}`);
    mainWindow.setSize(1200, 700);
    mainWindow.loadFile("./html/index.html");
  }

  // Configuration de Discord Rich Presence
  try {
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

    rpc.login({ clientId: "1216094434899263568" }).catch(console.error);
  } catch (error) {
    console.error("Erreur lors de la configuration de Discord RPC:", error);
  }
});

// Gestion des logs
ipcMain.on("log", (err, text) => {
  log.info(["LOG"], text);
});

// Gestion sécurisée des dialogues de sélection de fichier
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
  
  // Méthode sécurisée pour ouvrir un dialogue
  const openDialogSafely = async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
      });
      processDialogResult(result);
    } catch (error) {
      console.error("Erreur dialog:", error);
    }
  };
  
  if (process.platform === 'darwin') {
    // Pour macOS, exécuter le fix thread et utiliser setTimeout
    await runMacOSThreadFix();
    setTimeout(openDialogSafely, 0);
  } else {
    // Pour Windows, comportement normal
    await openDialogSafely();
  }
});

// Gestion spéciale pour macOS
if (process.platform === 'darwin') {
  // Réactiver l'application quand on clique sur l'icône du Dock
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });

  // Empêcher l'application de quitter quand toutes les fenêtres sont fermées
  app.on('window-all-closed', () => {
    // Ne rien faire, on ne quitte pas l'application sur macOS quand on ferme la fenêtre
  });
} else {
  // Pour toutes les autres plateformes, quitter l'application quand toutes les fenêtres sont fermées
  app.on('window-all-closed', () => {
    app.quit();
  });
}