const axios = require("axios");
const Downloader = require("nodejs-file-downloader");
const path = require("path");
const os = require("os");
const { ipcRenderer, shell, app } = require("electron");

(async () => {
  var FileName = "";
  const response = await axios.get("https://launcher.neoearth-mc.fr/items/update");
  const data = await response.data.data[0];
  const response1 = await axios.get(`https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/download/${data.version}`);
  const file = await response1.data.files[0];
  FileName = file.name;
  const downloadFile = new Downloader({
    url: file.url,
    directory: path.join(app.getPath('userData'), ".neoearth-mc", file.path.replace("files", ""), "../"),
    fileName: file.name,
    cloneFiles: false,
    onProgress: function(percentage) {
      ipcRenderer.send("log", percentage);
      if (percentage === "100.00") {
        document.getElementById("download-launcher").disabled = false;
      }
    },
  });

  await downloadFile.download();

  document.getElementById("download-launcher")?.addEventListener("click", async (event) => {
    let AppData = path.join(app.getPath('userData'), ".neoearth-mc", FileName);
    event.preventDefault();
    shell.openExternal(AppData);
    await sleep(10000);
    ipcRenderer.send("quit");
  });

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
})();