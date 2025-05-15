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

process.on('uncaughtException', (error) => {
  log.error(error);
  if (error.message && error.message.includes('NSWindow geometry')) {
    app.quit();
  }
});

const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();

  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, "./assets/icon/logo.png"),
    autoHideMenuBar: true,
    title: `${package.name} ${package.version}`,
    width: 1200,
    height: 700,
    frame: false,
    fullscreenable: false,
    maximizable: false,
    movable: false,
    resizable: false,
    show: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,           // Désactive Node.js dans le renderer
      devTools: true,
      contextIsolation: true,           // Isole le contexte JS
      webSecurity: true,                // Empêche le chargement de ressources locales
      preload: path.join(__dirname, "preload.js") // Utilise un preload sécurisé
    }
  });

// Bloque toute navigation vers file:// sauf le fichier principal
mainWindow.webContents.on('will-navigate', (event, url) => {
  if (url.startsWith('file://') && !url.endsWith('login.html') && !url.endsWith('index.html')) {
    event.preventDefault();
  }
});

mainWindow.webContents.setWindowOpenHandler(({ url }) => {
  if (url.startsWith('file://')) {
    return { action: 'deny' };
  }
  return { action: 'allow' };
});

  mainWindow.isCustomMaximized = false;
  
  mainWindow.normalBounds = { 
    width: 1200, 
    height: 700,
    x: Math.floor((primaryDisplay.workAreaSize.width - 1200) / 2),
    y: Math.floor((primaryDisplay.workAreaSize.height - 700) / 2)
  };

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    const bounds = mainWindow.getBounds();
    mainWindow.normalBounds = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    };
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const { ipcRenderer } = require('electron');
        
        const noDragTags = ['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A', 'IFRAME', 'VIDEO', 'AUDIO'];
        const noDragClasses = ['card-news', 'launch', 'navbar-icon', 'badge', 'window-control', 'LogConsole', 'eventLog'];
        const noDragIds = ['menuBtn', 'minimize', 'maximize', 'close', 'cards-container'];
        
        let isMaximized = false;
        let isDragging = false;
        let initialMouseX, initialMouseY;
        
        function shouldNotDrag(element) {
          if (!element) return false;
          
          let current = element;
          while (current && current !== document.body) {
            if (noDragTags.includes(current.tagName)) return true;
            
            if (current.classList) {
              for (const cls of noDragClasses) {
                if (current.classList.contains(cls)) return true;
              }
            }
            
            if (current.id && noDragIds.includes(current.id)) return true;
            
            current = current.parentElement;
          }
          
          return false;
        }
        
        ipcRenderer.on('window-state-update', (_, maximized) => {
          isMaximized = maximized;
          
          const maximizeButton = document.getElementById('maximize');
          if (maximizeButton) {
            maximizeButton.classList.toggle('maximized', isMaximized);
          }
        });
        
        document.addEventListener('click', (e) => {
          const target = e.target;
          
          if (target.id === 'minimize' || target.closest('#minimize')) {
            ipcRenderer.send('minimize');
          } else if (target.id === 'maximize' || target.closest('#maximize')) {
            ipcRenderer.send('maximize');
          } else if (target.id === 'close' || target.closest('#close')) {
            ipcRenderer.send('quit');
          }
        });
        
        document.addEventListener('mousedown', (e) => {
          if (isMaximized || shouldNotDrag(e.target) || e.button !== 0) return;
          
          isDragging = true;
          initialMouseX = e.screenX;
          initialMouseY = e.screenY;
          
          ipcRenderer.send('drag-start', { x: e.screenX, y: e.screenY });
          
          document.body.style.cursor = 'grabbing';
          e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          
          ipcRenderer.send('drag-move', { 
            x: e.screenX - initialMouseX, 
            y: e.screenY - initialMouseY 
          });
        });
        
        function endDrag() {
          if (!isDragging) return;
          isDragging = false;
          document.body.style.cursor = '';
          ipcRenderer.send('drag-end');
        }
        
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mouseleave', endDrag);
      })();
    `);
  });

  mainWindow.loadFile("./html/login.html");

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log.error(details);
    if (details.reason !== 'clean-exit') {
      createWindow();
    }
  });
};

app.whenReady().then(() => {
  const server = http.createServer(expressapp);
  server.on("error", err => {
    if (err.code == "EADDRINUSE") {
      log.error(err);
      return app.quit();
    }
  });

  const directoryPath = dataPath;

  const createDirectoryIfNeeded = (dir, name) => {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        log.error(err);
      }
    }
  };

  createDirectoryIfNeeded(directoryPath, ".neoearth-mc");
  createDirectoryIfNeeded(path.join(directoryPath, 'mods'), "mods");

  if (process.platform === 'darwin') {
    createDirectoryIfNeeded(path.join(directoryPath, 'natives'), "natives");
  }

  server.listen(4850, async () => {
    createWindow();

    if (mainWindow) {
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });

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

  let windowStartBounds = null;

  ipcMain.on('drag-start', () => {
    if (mainWindow && !mainWindow.isCustomMaximized) {
      windowStartBounds = mainWindow.getBounds();
    }
  });

  ipcMain.on('drag-move', (event, { x, y }) => {
    if (!windowStartBounds || mainWindow.isCustomMaximized) return;

    const newBounds = {
      x: windowStartBounds.x + x,
      y: windowStartBounds.y + y,
      width: windowStartBounds.width,
      height: windowStartBounds.height
    };

    mainWindow.setBounds(newBounds, false);
  });

  ipcMain.on('drag-end', () => {
    windowStartBounds = null;
  });

  ipcMain.handle('get-window-position', () => {
    if (mainWindow) {
      const position = mainWindow.getPosition();
      return { x: position[0], y: position[1] };
    }
    return { x: 0, y: 0 };
  });

  ipcMain.on("quit", () => {
    app.quit();
  });

  ipcMain.on("minimize", () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on("maximize", () => {
    if (!mainWindow) return;
    
    try {
      if (mainWindow.isCustomMaximized) {
        mainWindow.isCustomMaximized = false;
        mainWindow.webContents.send('window-state-update', false);
        mainWindow.setBounds(mainWindow.normalBounds, false);
      } else {
        mainWindow.normalBounds = mainWindow.getBounds();
        mainWindow.isCustomMaximized = true;
        mainWindow.webContents.send('window-state-update', true);
        const { width, height } = screen.getPrimaryDisplay().size;
        mainWindow.setBounds({ x: 0, y: 0, width, height }, false);
      }
    } catch (error) {
      log.error(error);
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
      mainWindow.setTitle(`${package.name} ${package.version}`);
      mainWindow.loadFile("./html/index.html");

      try {
        const RPC = require("discord-rpc");
        const rpc = new RPC.Client({ transport: 'ipc' });
        rpc.on("ready", () => {
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
          log.error(err);
        });
      } catch (error) {
        log.error(error);
      }
    }
  });
});

ipcMain.on("log", (err, text) => {
  log.info(text);
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
            log.error(err);
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
    log.error(error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});