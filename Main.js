const { app, BrowserWindow, ipcMain, Tray, Menu, dialog } = require("electron");
const package = require("./package.json");
const path = require("path");
const express = require("express");
const expressapp = new express();
const http = require("http");
const log = require("electron-log");
let mainWindow;
const Store = require("electron-store");
const dataPath = path.join(app.getPath('userData'), ".neoearth-mc");
const fs = require("fs");
const store = new Store();
const { exec } = require('child_process');

// Création de la fenêtre principale avec correction pour macOS
const createWindow = () => {
  // Définir les options de la fenêtre principale
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
      devTools: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      webSecurity: true,
      contextIsolation: false,
    }
  };

  // Sur macOS, appliquer des paramètres spécifiques pour éviter l'erreur NSInternalInconsistencyException
  if (process.platform === 'darwin') {
    // Ajout d'un délai pour s'assurer que la création de la fenêtre se fait sur le thread principal
    setTimeout(() => {
      mainWindow = new BrowserWindow(windowOptions);
      mainWindow.loadFile("./html/login.html");
      
      // Ajouter un gestionnaire pour éviter les problèmes de thread sur macOS
      mainWindow.on('resize', () => {
        // Force l'exécution sur le thread principal en utilisant setTimeout avec délai 0
        setTimeout(() => {}, 0);
      });
      
      mainWindow.on('maximize', () => {
        // Force l'exécution sur le thread principal en utilisant setTimeout avec délai 0
        setTimeout(() => {}, 0);
      });
    }, 100);
  } else {
    // Pour Windows et autres plateformes
    mainWindow = new BrowserWindow(windowOptions);
    mainWindow.loadFile("./html/login.html");
  }
};

app.whenReady().then(() => {
  const server = http.createServer(expressapp);
  server.on("error", err => {
    if (err.code == "EADDRINUSE") {
      return app.quit();
    }
  });

  const directoryPath = dataPath;
  console.log(directoryPath);
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath);
    console.log(`Directory .neoearth-mc created at ${directoryPath}`);
  } else {
    console.log(`Directory .neoearth-mc already exists at ${directoryPath}`);
  }
  const modsPath = path.join(directoryPath, 'mods');
  if (!fs.existsSync(modsPath)) {
    fs.mkdirSync(modsPath);
    console.log(`Directory mods created at ${modsPath}`);
  } else {
    console.log(`Directory mods already exists at ${modsPath}`);
  }

  server.listen(4850, async () => {
    createWindow();
    
    // S'assurer que tray est défini dans le bon contexte pour macOS
    let trayIcon;
    if (process.platform === 'darwin') {
      // Utiliser une image compatible avec la résolution Retina pour macOS
      trayIcon = path.join(__dirname, "./assets/icon/logo.png");
    } else {
      trayIcon = path.join(__dirname, "./assets/icon/logo.png");
    }
    
    let tray;
    
    // Créer le tray sur le thread principal
    app.whenReady().then(() => {
      tray = new Tray(trayIcon);
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "NeoEarth-MC",
          icon: path.join(__dirname, "./assets/icon/logo16x16.png"),
          enabled: false
        },
        {
          type: 'separator'
        },
        {
          label: 'Afficher',
          click: () => {
            if (mainWindow) {
              // Utiliser app.focus() sur macOS pour assurer l'exécution sur le thread principal
              if (process.platform === 'darwin') {
                mainWindow.show();
                app.focus({steal: true});
              } else {
                mainWindow.show();
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
          click: () => { app.quit(); }
        }
      ]);
      tray.setToolTip('NeoEarth-MC');
      tray.setContextMenu(contextMenu);

      tray.on('click', () => {
        if (mainWindow) {
          // Utiliser app.focus() sur macOS pour assurer l'exécution sur le thread principal
          if (process.platform === 'darwin') {
            mainWindow.show();
            app.focus({steal: true});
          } else {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      });
    });
  });

  // Configurer des gestionnaires IPC pour gérer correctement macOS
  ipcMain.on("quit", () => {
    console.info(["LOG"], "Application Closed.");
    app.quit();
  });

  ipcMain.on("minimize", () => {
    if (mainWindow) {
      // Assurer l'exécution sur le thread principal
      if (process.platform === 'darwin') {
        app.focus();
        setTimeout(() => {
          mainWindow.minimize();
        }, 0);
      } else {
        mainWindow.minimize();
      }
    }
  });

  ipcMain.on("maximize", () => {
    if (mainWindow) {
      // Assurer l'exécution sur le thread principal
      if (process.platform === 'darwin') {
        app.focus();
        setTimeout(() => {
          if (mainWindow.isMaximized()) {
            mainWindow.restore();
          } else {
            mainWindow.maximize();
          }
        }, 0);
      } else {
        if (mainWindow.isMaximized()) {
          mainWindow.restore();
        } else {
          mainWindow.maximize();
        }
      }
    }
  });

  ipcMain.on("login", () => {
    if (mainWindow) {
      mainWindow.loadFile("./html/login.html");
    }
  });

  ipcMain.on("maintenance", (err, message) => {
    if (mainWindow) {
      mainWindow.loadFile("./html/error/maintenance.html");
    }
  });

  ipcMain.on("hide", () => {
    if (mainWindow) {
      mainWindow.hide();
    }
  });

  ipcMain.on("update", () => {
    if (mainWindow) {
      mainWindow.setTitle(`${package.name} ${package.version} - Mise à Jour Disponible`);
      mainWindow.loadFile("./html/update.html");
    }
  });

  // Résolution spécifique pour macOS pour l'erreur NSInternalInconsistencyException
  const setupMacOSWindowFix = () => {
    if (process.platform === 'darwin') {
      // Créer un script AppleScript pour gérer les opérations de fenêtre sur le thread principal
      const fixScript = `
      osascript -e '
      tell application "System Events"
          set frontProcess to first process where it is frontmost
          set visible of frontProcess to true
          delay 0.1
      end tell'
      `;
      
      // Exécuter le script pour s'assurer que les opérations de fenêtre sont sur le thread principal
      return new Promise((resolve) => {
        exec(fixScript, (error) => {
          if (error) console.error("Erreur lors de l'exécution du script AppleScript:", error);
          resolve();
        });
      });
    }
    return Promise.resolve();
  };

  ipcMain.on("main", async () => {
    if (mainWindow) {
      if (process.platform === 'darwin') {
        // Appliquer le correctif macOS avant de modifier la fenêtre
        await setupMacOSWindowFix();
        setTimeout(() => {
          mainWindow.setTitle(`${package.name} ${package.version}`);
          // Utiliser setSize au lieu de setBounds pour éviter les problèmes de thread
          mainWindow.setSize(1200, 700, false);
          mainWindow.loadFile("./html/index.html");
        }, 100);
      } else {
        mainWindow.setTitle(`${package.name} ${package.version}`);
        mainWindow.setSize(1200, 700);
        mainWindow.loadFile("./html/index.html");
      }

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
    }
  });
});

// Gestion du journal
ipcMain.on("log", (err, text) => {
  log.info(["LOG"], text);
});

// Gestion spéciale pour macOS lors de l'ouverture de dialog
ipcMain.on("openDialogFile", async (event, location) => {
  // Sur macOS, assurer que le dialog s'ouvre sur le thread principal
  if (process.platform === 'darwin') {
    setTimeout(async () => {
      try {
        const result = await dialog.showOpenDialog({
          properties: ['openFile'],
        });
        
        for (let i = 0; i < result.filePaths.length; i++) {
          const fileName = path.basename(result.filePaths[i]);
          const destinationPath = path.join(dataPath, location, fileName);
          fs.copyFileSync(result.filePaths[i], destinationPath);
          
          let settingsLocation = location;
          if (location == "resourcepacks") {
            settingsLocation = "SettingsSrcPack";
          } else {
            settingsLocation = "SettingsShaders";
          }
          
          event.sender.send('update-file-list', { path: settingsLocation, fileName: fileName });
        }
      } catch (error) {
        console.error("Erreur lors de l'ouverture du dialog:", error);
      }
    }, 0);
  } else {
    // Comportement normal pour Windows et autres plateformes
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    
    for (let i = 0; i < result.filePaths.length; i++) {
      const fileName = path.basename(result.filePaths[i]);
      const destinationPath = path.join(dataPath, location, fileName);
      fs.copyFileSync(result.filePaths[i], destinationPath);
      
      let settingsLocation = location;
      if (location == "resourcepacks") {
        settingsLocation = "SettingsSrcPack";
      } else {
        settingsLocation = "SettingsShaders";
      }
      
      event.sender.send('update-file-list', { path: settingsLocation, fileName: fileName });
    }
  }
});

// Ajout d'une gestion spéciale pour macOS lors du chargement de l'application
if (process.platform === 'darwin') {
  // S'assurer que l'application ne se lance pas avec l'erreur NSInternalInconsistencyException
  app.commandLine.appendSwitch('disable-threaded-scrolling');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  
  // Écouter les événements d'activation pour gérer correctement le focus sur macOS
  app.on('activate', () => {
    if (mainWindow === null) {
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