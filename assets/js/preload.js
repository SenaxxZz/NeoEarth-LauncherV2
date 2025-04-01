
const os = require("os");
const path = require("path");
const { ipcRenderer, ipcMain, shell, app } = require("electron");
const Store = require("electron-store")
const axios = require("axios");
const dataPath = path.join(os.homedir(), "AppData", "Roaming", ".neoearth-mc");
const package = require("../package.json");
const Downloader = require("nodejs-file-downloader")

const store = new Store(); 
(async() => {
const response = await axios.get("https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/maintenance");
const data = await response.data;
if(data.active == true) {
    ipcRenderer.send("maintenance", data.reason);
}
const response1 = await axios.get("https://launcher.neoearth-mc.fr/items/update");
const data1 = await response1.data.data[0];
if(package.publicVersion < data1.version) {
    return ipcRenderer.send("update");
}

})();
