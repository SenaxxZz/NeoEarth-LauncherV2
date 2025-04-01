const { app, BrowserWindow, ipcMain, Tray, Menu, dialog} = require("electron");
const package = require("./package.json");
const path = require("path");
const express = require("express");
const expressapp = new express();
const http = require("http");
const log = require("electron-log");
let mainWindow;
const os = require("os");
const Store = require("electron-store");
const dataPath = path.join(os.homedir(), "AppData", "Roaming", ".neoearth-mc");
const fs = require("fs");
const store = new Store();
 
const createWindow = () => {
  mainWindow = new BrowserWindow({
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
  })
  mainWindow.loadFile("./html/login.html");
}

  app.whenReady().then(() => {
    const server = http.createServer(expressapp);
    server.on("error", err => {
      if (err.code == "EADDRINUSE") {
        return app.quit();
      };
    });
    const directoryPath = path.join(os.homedir(), "AppData", "Roaming", '.neoearth-mc');
    console.log(directoryPath)
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
            mainWindow.show();
            mainWindow.focus();
          }
        },
        { 
          label: 'Cacher', 
          click: () => { 
            mainWindow.hide();
            mainWindow.focus();
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
        mainWindow.show();
        mainWindow.focus();
      });
    });

    ipcMain.on("quit", () => {
      console.info(["LOG"], "Application Closed.");
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
      mainWindow.loadFile("./html/login.html");
    });

    ipcMain.on("maintenance", (err, message) => {
      mainWindow.loadFile("./html/error/maintenance.html");
    });

    ipcMain.on("hide", () => {
      mainWindow.hide();
    })

    ipcMain.on("update", () => {
      mainWindow.setTitle(`${package.name} ${package.version} - Mise à Jour Disponible`);
      mainWindow.loadFile("./html/update.html");
    });

    ipcMain.on("main", () => {
  
      mainWindow.setTitle(`${package.name} ${package.version}`);
      mainWindow.setSize(1200, 700);
      mainWindow.loadFile("./html/index.html");
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
  });


  ipcMain.on("log", (err, text) => {
    log.info(["LOG"], text);
  });
  
  ipcMain.on("openDialogFile", async (event, location) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
    });
    for(i = 0; i < result.filePaths.length; i++) {
      const fileName = path.basename(result.filePaths[i]);
      const destinationPath = path.join(path.join(os.homedir(), "AppData", "Roaming", ".neoearth-mc", location), fileName);
      fs.copyFileSync(result.filePaths[i], destinationPath);
      if(location == "resourcepacks") {
        location = "SettingsSrcPack";
      } else {
        location = "SettingsShaders";
      }
      event.sender.send('update-file-list', {path: location, fileName:  fileName});
    }
  })