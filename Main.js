const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, screen } = require("electron");
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
let tray = null;

// Configuration du gestionnaire d'erreurs non capturées
process.on('uncaughtException', (error) => {
  log.error('Erreur non gérée:', error);
  if (error.message && error.message.includes('NSWindow geometry')) {
    log.info('Erreur de géométrie de fenêtre détectée, tentative de récupération...');
    // Ne pas quitter l'application pour cette erreur spécifique
  } else {
    app.quit();
  }
});

const createWindow = () => {
  // Utiliser le thread principal pour toute création de fenêtre
  app.whenReady().then(() => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    mainWindow = new BrowserWindow({
      icon: path.join(__dirname, "./assets/icon/logo.png"),
      autoHideMenuBar: true,
      title: `${package.name} ${package.version}`,
      width: Math.min(1200, width * 0.8),
      height: Math.min(700, height * 0.8),
      fullscreenable: true,
      maximizable: true,
      movable: true,
      resizable: true,
      show: false, // Cacher la fenêtre jusqu'à ce qu'elle soit prête
      webPreferences: {
        nodeIntegration: true,
        devTools: true,
        nodeIntegrationInWorker: true,
        enableRemoteModule: true,
        webSecurity: true,
        contextIsolation: false,
      }
    });

    // Attendre que la fenêtre soit prête avant de l'afficher
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    mainWindow.loadFile("./html/login.html");
    
    // Capturer les erreurs de rendu
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      log.error('Processus de rendu terminé:', details);
      if (details.reason !== 'clean-exit') {
        createWindow(); // Recréer la fenêtre en cas de crash
      }
    });
  });
};

app.whenReady().then(() => {
  const server = http.createServer(expressapp);
  server.on("error", err => {
    if (err.code == "EADDRINUSE") {
      log.error("Port déjà utilisé:", err);
      return app.quit();
    }
  });

  const directoryPath = dataPath;
  log.info(`Chemin des données: ${directoryPath}`);
  
  // Créer les répertoires nécessaires
  const createDirectoryIfNeeded = (dir, name) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`Répertoire ${name} créé à ${dir}`);
      } catch (err) {
        log.error(`Erreur lors de la création du répertoire ${name}:`, err);
      }
    } else {
      log.info(`Répertoire ${name} existe déjà à ${dir}`);
    }
  };
  
  createDirectoryIfNeeded(directoryPath, ".neoearth-mc");
  createDirectoryIfNeeded(path.join(directoryPath, 'mods'), "mods");
  
  // Ajout des répertoires pour macOS
  if (process.platform === 'darwin') {
    createDirectoryIfNeeded(path.join(directoryPath, 'natives'), "natives");
  }

  server.listen(4850, async () => {
    createWindow();
    
    if (mainWindow) {
      app.on('activate', () => {
        // Sur macOS, il est courant de re-créer une fenêtre dans l'application quand
        // l'icône du dock est cliquée et qu'il n'y a pas d'autres fenêtres ouvertes.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
      
      // Créer le tray icon
      tray = new Tray(path.join(__dirname, "./assets/icon/logo.png"));
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
            // S'assurer que ces actions se font sur le thread principal
            app.focus();
            if (mainWindow) {
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

      tray.on('click', () => {
        app.focus();
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    }
  });

  // Gestionnaires d'événements IPC
  ipcMain.on("quit", () => {
    log.info("Application fermée par l'utilisateur.");
    app.quit();
  });

  ipcMain.on("minimize", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on("login", () => {
    if (mainWindow) {
      mainWindow.loadFile("./html/login.html");
    }
  });

  ipcMain.on("maintenance", () => {
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

  ipcMain.on("main", () => {
    if (mainWindow) {
      // Exécuter sur le thread principal
      mainWindow.setTitle(`${package.name} ${package.version}`);
      // Utiliser setBounds au lieu de setSize pour macOS
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({ 
        x: bounds.x, 
        y: bounds.y, 
        width: 1200, 
        height: 700 
      });
      mainWindow.loadFile("./html/index.html");
      
      // Configuration Discord RPC
      try {
        const RPC = require("discord-rpc");
        const rpc = new RPC.Client({ transport: 'ipc' });
        rpc.on("ready", () => {
          log.info("Rich Presence configuré avec succès");
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

        rpc.login({ clientId: "1216094434899263568" }).catch(err => {
          log.error("Erreur Discord RPC:", err);
        });
      } catch (error) {
        log.error("Erreur lors de l'initialisation de Discord RPC:", error);
      }
    }
  });
});

ipcMain.on("log", (err, text) => {
  log.info(["LOG"], text);
});

ipcMain.on("openDialogFile", async (event, location) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      for (let i = 0; i < result.filePaths.length; i++) {
        const fileName = path.basename(result.filePaths[i]);
        const destinationPath = path.join(dataPath, location, fileName);
        
        fs.copyFile(result.filePaths[i], destinationPath, (err) => {
          if (err) {
            log.error(`Erreur lors de la copie du fichier ${fileName}:`, err);
            return;
          }
          
          let settingsPath = location;
          if (location === "resourcepacks") {
            settingsPath = "SettingsSrcPack";
          } else {
            settingsPath = "SettingsShaders";
          }
          
          event.sender.send('update-file-list', { path: settingsPath, fileName: fileName });
        });
      }
    }
  } catch (error) {
    log.error("Erreur lors de l'ouverture du dialogue de fichiers:", error);
  }
});

// Prévenir la fermeture de l'application quand toutes les fenêtres sont fermées (important pour macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
