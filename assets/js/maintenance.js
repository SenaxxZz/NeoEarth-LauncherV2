const { ipcRenderer } = require("electron");

document.addEventListener('DOMContentLoaded', () => {
    // Window controls
    document.getElementById("close")?.addEventListener("click", () => {
      ipcRenderer.send("quit");
    });
  
    document.getElementById("minimize")?.addEventListener("click", () => {
      ipcRenderer.send("minimize");
    });
  
    document.getElementById("maximize")?.addEventListener("click", () => {
      ipcRenderer.send("maximize");
    });
  });

(async () => {
    const response = await fetch("https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/maintenance");
    const data = await response.json();
    if(data.active == true) {
        document.getElementById("error-maintenance").innerHTML = data.reason;
    } else {
        ipcRenderer.send("login")
    }
    })()
const { ipcRenderer } = require("electron");

(async () => {
    const response = await fetch("https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/maintenance");
    const data = await response.json();
    if(data.active == true) {
        document.getElementById("error-maintenance").innerHTML = data.reason;
    } else {
        ipcRenderer.send("login")
    }
    })()
