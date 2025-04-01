const { ipcRenderer, shell, dialog } = require("electron");
const Store = require("electron-store");
const store = new Store();
const os = require("os");
const path = require("path");
const fs = require("fs");
const Downloader = require("nodejs-file-downloader");
const dataPath = path.join(app.getPath('userData'), ".neoearth-mc");

// Définition des identifiants des différents menus pour simplifier la navigation
const MENUS = {
  PROFILE: "ProfilAccount",
  RAM: "SettingsRam",
  MODS: "SettingsModsAddionnel",
  LAUNCHER: "SettingsLauncher",
  RESOURCEPACKS: "SettingsSrcPack",
  SHADERS: "SettingsShaders"
};

// Variable pour suivre le menu actif
let activeMenu = null;

// Fonction pour changer de menu sans avoir à fermer puis réouvrir
function switchMenu(menuId) {
  // Affiche le conteneur principal s'il n'est pas déjà affiché
  document.getElementById("menu").style.display = "block";

  // Cache tous les menus
  document.getElementById("ProfilAccount").style.display = "none";
  document.getElementById("SettingsRam").style.display = "none";
  document.getElementById("SettingsModsAddionnel").style.display = "none";
  document.getElementById("SettingsLauncher").style.display = "none";
  document.getElementById("SettingsSrcPack").style.display = "none";
  document.getElementById("SettingsShaders").style.display = "none";

  // Affiche le menu demandé
  document.getElementById(menuId).style.display = "inherit";

  // Met à jour le menu actif
  activeMenu = menuId;
}

document.getElementById("rules").addEventListener("click", (event) => {
  event.preventDefault()
  shell.openExternal("https://wikimc.neoearth-mc.fr")
})
document.getElementById("radio").addEventListener("click", (event) => {
  shell.openExternal("https://radio.neoearth-mc.fr")
})
document.getElementById("disconnect1").addEventListener("click", () => {
  store.clear();
  ipcRenderer.send("login");
})

document.getElementById("ram").addEventListener("click", () => {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.RAM && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
  } else {
    // Sinon, on passe au menu RAM
    switchMenu(MENUS.RAM);
  }
})

var modoptionnel = [];

function handleCheckboxChange(event) {
  const input = event.target;
  const modId = input.id;
  const isChecked = input.checked;

  const modIndex = modoptionnel.findIndex(mod => mod.id === modId);
  if (modIndex !== -1) {
    modoptionnel[modIndex].value = isChecked ? "on" : "off";
  } else {
    modoptionnel.push({ id: modId, value: isChecked ? "on" : "off" });
  }

  store.set("mods-additionnels", modoptionnel);

  for (let i = 0; i < document.getElementsByTagName("input").length; i++) {
    if (document.getElementsByTagName("input")[i].id.includes("mod-")) {
      const input = document.getElementsByTagName("input")[i];
      const ModOptionnalFileName = input.id.replace("mod-", "");

      let AppData;
      if (os.platform() === "win32" || os.platform() === "win64") {
        AppData = path.join(os.homedir(), "AppData", "Roaming", ".neoearth-mc/mods");
      } else if (os.platform() === "darwin") {
        AppData = path.join(os.homedir(), "Library", "Application Support", ".neoearth-mc/mods");
      } else if (os.platform() === "linux") {
        AppData = path.join(os.homedir(), ".config", ".neoearth-mc/mods");
      }

      fs.readdir(path.join(AppData), (err, files) => {
        if (err) {
          console.error("Erreur lors de la lecture du dossier mods :", err);
          return;
        }

        const validFileNames = files.filter(file => typeof file === 'string' && file.toLowerCase().endsWith('.jar'));
        const ModOptionnalFile = validFileNames.find(file => file.toLowerCase() === ModOptionnalFileName.toLowerCase());
        if (!ModOptionnalFile && input.checked) {
          fetch("https://apiprod.neoearth-mc.fr/launcher/mods-additionnels/").then(async response => {
          console.info("Téléchargement en cours. (mods-additionnels)");
          let data = await response.json();
              const downloadFile = new Downloader({
                url: data.files[i].url,
                directory: AppData,
                fileName: data.files[i].name,
                cloneFiles: false,
              });
              await downloadFile.download();
              console.info("Téléchargement fini. (mods-additionnels)");
          }).catch(error => console.error('Fetch error:', error));
        } else if (!input.checked && ModOptionnalFile != null) {
          fs.unlink(path.join(AppData, ModOptionnalFile), (err) => {
            if (err) {
              console.error(`Erreur lors de la suppression de ${ModOptionnalFile} :`, err);
            }
            console.info(`Suppression de ${ModOptionnalFile}`);
          });
        }
      });
    }
  }
}

async function initializeMods() {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.MODS && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
    return;
  }

  // Sinon, on passe au menu MODS
  switchMenu(MENUS.MODS);

  let catThreeDiv = document.getElementById("SettingsModsAddionnel");
  let child = catThreeDiv.firstElementChild;
  while (child.nextElementSibling) {
    catThreeDiv.removeChild(child.nextElementSibling);
  }

  // Créer un conteneur pour les mods avec une meilleure présentation
  const modContainer = document.createElement("div");
  modContainer.className = "mods-list";
  modContainer.style.cssText = "margin-top: 15px;";
  catThreeDiv.appendChild(modContainer);

  const response = await fetch("https://apiprod.neoearth-mc.fr/launcher/mods-additionnels/");
  const data = await response.json();

  for (let i = 0; i < data.files.length; i++) {
    // Créer un conteneur pour chaque mod
    const modRow = document.createElement("div");
    modRow.style.cssText = "display: flex; align-items: center; margin-bottom: 8px;";

    // Créer la checkbox (à gauche maintenant)
    let input = document.createElement("input");
    input.type = "checkbox";
    input.id = `mod-${data.files[i].name}`;
    input.style.cssText = "margin-right: 10px;";

    // Créer le label avec le nom du mod
    let label = document.createElement("label");
    label.htmlFor = input.id; // Association avec l'input
    label.textContent = data.files[i].name;
    label.style.cssText = "color: #fff; font-size: 14px;";

    // Ajouter les éléments dans l'ordre: input (checkbox) puis label
    modRow.appendChild(input);
    modRow.appendChild(label);
    modContainer.appendChild(modRow);

    input.addEventListener("change", handleCheckboxChange);

    const storedMods = store.get("mods-additionnels") || [];
    const storedMod = storedMods.find(mod => mod.id === input.id);
    input.checked = storedMod ? storedMod.value === "on" : false;
  }
}

document.getElementById("mods-additionnels").addEventListener("click", initializeMods);

document.getElementById("copyFileButton").addEventListener("click", async (event) => {
  ipcRenderer.send("openDialogFile", "resourcepacks");
})
document.getElementById("copyFileButton1").addEventListener("click", async (event) => {
  ipcRenderer.send("openDialogFile", "shaderpacks");
})

document.getElementById("ressources-pack").addEventListener("click", () => {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.RESOURCEPACKS && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
  } else {
    // Sinon, on passe au menu des ressource packs
    switchMenu(MENUS.RESOURCEPACKS);

    let catThreeDiv = document.getElementById("SettingsSrcPack");
    let child = catThreeDiv.firstElementChild;

    while (child && child.nextElementSibling) {
      let nextChild = child.nextElementSibling;
      if (nextChild.tagName.toLowerCase() !== 'button') {
        catThreeDiv.removeChild(nextChild);
      } else {
        child = nextChild;
      }
    }
    fs.readdir(path.join(dataPath, "resourcepacks"), (err, modList) => {
      if (err) return;
      for (let i = 0; i < modList.length; i++) {
        let label = document.createElement("label");
        label.innerText = modList[i];
        label.className = "srcpack-file";
        catThreeDiv.appendChild(label);
      }
    })
  }
})

document.getElementById("shaders").addEventListener("click", () => {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.SHADERS && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
  } else {
    // Sinon, on passe au menu des shaders
    switchMenu(MENUS.SHADERS);

    let catThreeDiv = document.getElementById("SettingsShaders");
    let child = catThreeDiv.firstElementChild;

    while (child && child.nextElementSibling) {
      let nextChild = child.nextElementSibling;
      if (nextChild.tagName.toLowerCase() !== 'button') {
        catThreeDiv.removeChild(nextChild);
      } else {
        child = nextChild;
      }
    }
    fs.readdir(path.join(dataPath, "shaderpacks"), (err, modList) => {
      if (err) return;
      for (let i = 0; i < modList.length; i++) {
        let label = document.createElement("label");
        label.innerText = modList[i];
        label.className = "shaders-file";
        catThreeDiv.appendChild(label);
      }
    })
  }
})

ipcRenderer.on('update-file-list', (event, fileList) => {
  let catThreeDiv = document.getElementById(fileList.path);
    let label = document.createElement("label");
    label.innerText = fileList.fileName;
    label.style.color = "white";
    label.className = "srcpack-file";
    catThreeDiv.appendChild(label);
  });

document.getElementById("parametres").addEventListener("click", () => {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.LAUNCHER && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
  } else {
    // Sinon, on passe au menu des paramètres
    switchMenu(MENUS.LAUNCHER);
  }
})

document.getElementById("profil").addEventListener("click", () => {
  // Si on clique sur le menu actif, on ferme tout
  if(activeMenu === MENUS.PROFILE && document.getElementById("menu").style.display === "block") {
    document.getElementById("menu").style.display = "none";
    activeMenu = null;
  } else {
    // Sinon, on passe au menu profil
    switchMenu(MENUS.PROFILE);

    let username = store.get("username");
    let uuid = store.get("uuid");
    document.getElementById("skin").src = `https://www.neoearth-mc.fr/api/storage/skins/${username}.png`;
    document.getElementById("skin").onerror = () => {
  };
    document.getElementById("head").src = `https://www.neoearth-mc.fr/api/storage/head/${username}.png`;
    document.getElementById("head").onerror = () => {
      document.getElementById("head").src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${username}.png`;
  };
    document.getElementById("username").innerText = `Pseudo : ${username}`;
    document.getElementById("uuid").innerText = `UUID : ${uuid}`;
  }
})

document.getElementById("option-launcher").addEventListener("change", function () {
  var selectedValue = this.checked;
  store.set("KeepLauncherOpen", selectedValue);
})

document.getElementById("option-hide").addEventListener("change", function () {
  var selectedValue = this.checked;
  store.set("HideLauncher", selectedValue);
  if(selectedValue == true) return ipcRenderer.send("hide");
})
document.getElementById("option-launcher").checked = store.get("KeepLauncherOpen");
document.getElementById("option-hide").checked = store.get("HideLauncher");

if (store.get("ramSettings") && store.get("ramSettings").ramMin) {
  document.getElementById("RamMin").value = store.get("ramSettings").ramMin.replace(/[a-zA-Z]/g, '');
}
if (store.get("ramSettings") && store.get("ramSettings").ramMax) {
  document.getElementById("RamMax").value = store.get("ramSettings").ramMax.replace(/[a-zA-Z]/g, '');
}

document.getElementById("RamMin").addEventListener("change", function () {
  var selectedValue = this.value;
  store.set("ramSettings", { ramMin: `${selectedValue}G`, ramMax: `${store.get("ramSettings").ramMax}` })
})
document.getElementById("RamMax").addEventListener("change", function () {
  var selectedValue = this.value;
  store.set("ramSettings", { ramMin: `${store.get("ramSettings").ramMin}`, ramMax: `${selectedValue}G` })
})