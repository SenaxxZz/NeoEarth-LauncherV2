const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();
const fs = require("fs");
require('dotenv').config();
const { xml2json } = require("xml-js");
const { formToJSON } = require("axios");
const { exec } = require('child_process');

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault(); 
    const logConsole = document.getElementById("LogConsole");
    if (logConsole) {
      logConsole.style.display = logConsole.style.display === 'block' ? 'none' : 'block';
    }
  }
});

let isGameRunning = false;

// Charger la liste des mods
let modsList = [];
try {
  fs.readdir(path.join(dataPath, "mods"), (err, modList) => {
    if (err) return;
    for (let i = 0; i < modList.length; i++) {
      const modName = modList[i];
      const modCheck = modList[i].split(/[^a-zA-Z0-9]/)[0];
      const existingIndex = modsList.findIndex(mod => mod.startsWith(modCheck));

      if (existingIndex !== -1) {
        let filePath = `${modsList[existingIndex]}`;
        modsList.splice(existingIndex, 1);
        fs.unlinkSync(path.join(dataPath, "mods", filePath), (err) => {
          if (err) return console.error(`Erreur lors de la suppression de ${modsList[existingIndex]} :`, err);
        });
        console.info(`Suppression de la version précédente du mod : ${modsList[existingIndex]}`);
      }
      modsList.push(modName);
    }
  });
} catch (error) {
  console.warn("Impossible de charger les mods:", error);
}

const username = store.get("username");
const rank = store.get("rank");

const usernameElement = document.getElementById("username");
const rankElement = document.getElementById("rank");
const avatarElement = document.getElementById("avatar");

if (usernameElement) {
  usernameElement.innerText = username;
}

if (rankElement) {
  rankElement.innerText = rank;
}

if (avatarElement) {
  avatarElement.src = `https://www.neoearth-mc.fr/api/storage/head/${username}`;
  avatarElement.onerror = () => {
    avatarElement.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${username}.png`;
  };
}

(async () => {
  const divNews = document.getElementById("cards-container");

  if (divNews) {
    let data = [];

    try {
      const response = await axios.get("https://apiprod.neoearth-mc.fr/news");
      data = response.data.slice(response.data.length - 2, response.data.length);
    } catch (error) {
      console.error("Erreur avec l'API principale, tentative avec RSS : ", error);
      try {
        const fallbackResponse = await axios.get("https://www.neoearth-mc.fr/api/rss");
        const json = xml2json(fallbackResponse.data);
        for (i = 6; i < JSON.parse(json).elements[0].elements[0].elements.length && i < 8; i++) {
          let date = JSON.parse(json).elements[0].elements[0].elements[i].elements[4].elements[0]?.text;
          if (date) {
            let dateObj = new Date(date);
            let day = String(dateObj.getUTCDate()).padStart(2, '0');
            let month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); 
            let year = dateObj.getUTCFullYear();
            let hours = String(dateObj.getUTCHours()).padStart(2, '0');
            let minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');

            let formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

            let image = JSON.parse(json).elements[0].elements[0].elements[i].elements[5].attributes?.url;
            let title = JSON.parse(json).elements[0].elements[0].elements[i].elements[0].elements[0]?.text;
            let author = JSON.parse(json).elements[0].elements[0].elements[i].elements[7].elements[0]?.text;
            data.push({title: title, image: image, author: author, publishedAt: formattedDate, tags: "Nouveauté"});
          }
        }
      } catch (fallbackError) {
        return;
      }
    }

    data.forEach(newsItem => {
      const card = document.createElement("div");
      card.className = "card-news";

      const title = document.createElement("h1");
      title.textContent = newsItem.title;

      const img = document.createElement("img");
      img.className = "news";
      img.src = !newsItem.image.includes("https") ? `https://www.neoearth-mc.fr/storage/news/${newsItem.image}` : newsItem.image;

      const tag = document.createElement("h3");
      tag.innerText = newsItem.tags;

      const authorSection = document.createElement("div");
      authorSection.className = "author-section";

      const avatar = document.createElement("img");
      avatar.className = "avatar-author";
      avatar.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${newsItem.author}.png`;
      avatar.onerror = () => {
        avatar.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${username}.png`;
      };

      const authorInfo = document.createElement("div");
      authorInfo.className = "author-info";

      const author = document.createElement("p");
      author.className = "author-news";
      author.innerText = newsItem.author;

      const date = document.createElement("p");
      date.className = "date-news";
      date.innerText = newsItem.publishedAt;

      divNews.appendChild(card);
      card.appendChild(img);
      card.appendChild(title);
      card.appendChild(tag);

      authorInfo.appendChild(author);
      authorInfo.appendChild(date);
      authorSection.appendChild(avatar);
      authorSection.appendChild(authorInfo);
      card.appendChild(authorSection);
    });
  }
})();

document.getElementById("cards-container")?.addEventListener("click", () => {
  shell.openExternal("https://www.neoearth-mc.fr");
});

document.getElementById("link-discord")?.addEventListener("click", () => {
  shell.openExternal("https://discord.gg/NRrwNm39G8");
});

document.getElementById("link-twitter")?.addEventListener("click", () => {
  shell.openExternal("https://twitter.com/NeoEarth_Off");
});

document.getElementById("link-tiktok")?.addEventListener("click", () => {
  shell.openExternal("https://www.tiktok.com/@neoearth_off");
});

document.getElementById("link-youtube")?.addEventListener("click", () => {
  shell.openExternal("https://www.youtube.com/@neoearth_off");
});

document.getElementById("link-twitch")?.addEventListener("click", () => {
  shell.openExternal("https://www.twitch.tv/neoearth_off");
});

document.getElementById("rules").addEventListener("click", () => {
  shell.openExternal("https://wikimc.neoearth-mc.fr");
});

document.getElementById("radio").addEventListener("click", () => {
  shell.openExternal("https://radio.neoearth-mc.fr");
});

document.getElementById("close")?.addEventListener("click", () => {
  ipcRenderer.send("quit");
});

document.getElementById("minimize")?.addEventListener("click", () => {
  ipcRenderer.send("minimize");
});

document.getElementById("maximize")?.addEventListener("click", () => {
  ipcRenderer.send("maximize");
});

document.getElementById("close-error")?.addEventListener("click", () => {
  document.getElementById("LogConsole").style.display = "none";
});

const socialMenuManager = (function() {
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  if (!menuBtn || !menu) return;

  let menuDelay = 150;
  let menuTimeout = null;
  let isMouseOverMenu = false;
  let isMouseOverButton = false;

  function showMenu() {
    clearTimeout(menuTimeout);
    menu.classList.remove("hidden");
    menu.style.opacity = "1";
    menu.style.visibility = "visible";
    menu.style.pointerEvents = "all";
  }

  function scheduleHideMenu() {
    if (!isMouseOverButton && !isMouseOverMenu) {
      menuTimeout = setTimeout(() => {
        menu.classList.add("hidden");
        menu.style.opacity = "0";
        menu.style.visibility = "hidden";
        menu.style.pointerEvents = "none";
      }, menuDelay);
    }
  }

  menuBtn.addEventListener("mouseenter", () => {
    isMouseOverButton = true;
    showMenu();
  });

  menuBtn.addEventListener("mouseleave", () => {
    isMouseOverButton = false;
    scheduleHideMenu();
  });

  menu.addEventListener("mouseenter", () => {
    isMouseOverMenu = true;
    showMenu();
  });

  menu.addEventListener("mouseleave", () => {
    isMouseOverMenu = false;
    scheduleHideMenu();
  });

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  return {
    showMenu,
    hideMenu: scheduleHideMenu
  };
})();

// Configuration améliorée des natives pour macOS
async function setupMacOSNatives(logConsole) {
  try {
    const nativesDir = path.join(dataPath, "natives");
    
    if (!fs.existsSync(nativesDir)) {
      fs.mkdirSync(nativesDir, { recursive: true });
    }
    
    const logMessage = document.createElement("p");
    logMessage.innerText = "Configuration des natives LWJGL pour macOS...";
    logMessage.style.color = "yellow";
    logConsole.appendChild(logMessage);
    
    // Fichiers natifs requis
    const nativeFiles = [
      { name: "liblwjgl.jnilib", url: "https://github.com/Tech1k/lwjgl-mac-fix/raw/main/liblwjgl.jnilib" },
      { name: "liblwjgl_opengl.jnilib", url: "https://github.com/Tech1k/lwjgl-mac-fix/raw/main/liblwjgl.jnilib" }
    ];
    
    const patchMarker = path.join(dataPath, ".lwjgl_patched_v2");
    
    if (!fs.existsSync(patchMarker)) {
      // Télécharger tous les fichiers natifs nécessaires
      for (const nativeFile of nativeFiles) {
        const filePath = path.join(nativesDir, nativeFile.name);
        
        if (!fs.existsSync(filePath)) {
          const downloadPatch = new Downloader({
            url: nativeFile.url,
            directory: nativesDir,
            fileName: nativeFile.name,
            cloneFiles: false,
            onProgress: function(percentage) {
              logMessage.innerText = `Téléchargement des correctifs macOS (${nativeFile.name}): ${percentage}%`;
            }
          });
          
          try {
            await downloadPatch.download();
            fs.chmodSync(filePath, "755");
          } catch (downloadError) {
            logMessage.innerText = `❌ Erreur de téléchargement du correctif ${nativeFile.name}: ${downloadError.message}`;
            logMessage.style.color = "red";
            console.error(`Erreur de téléchargement de ${nativeFile.name}:`, downloadError);
            throw downloadError;
          }
        }
      }
      
      // Configurer les autres bibliothèques nécessaires
      const additionalLibs = ["liblwjgl_openal.jnilib"];
      for (const libName of additionalLibs) {
        const libPath = path.join(nativesDir, libName);
        if (!fs.existsSync(libPath)) {
          fs.copyFileSync(path.join(nativesDir, "liblwjgl.jnilib"), libPath);
        }
      }
      
      // Créer un fichier de propriétés LWJGL pour forcer l'exécution sur le thread principal
      const lwjglPropertiesPath = path.join(nativesDir, "lwjgl.properties");
      fs.writeFileSync(lwjglPropertiesPath, `
org.lwjgl.util.Debug=true
org.lwjgl.util.NoChecks=true
org.lwjgl.opengl.Display.allowSoftwareOpenGL=true
org.lwjgl.opengl.Display.enableHighDPI=true
org.lwjgl.opengl.Window.undecorated=true
# IMPORTANT - Empêcher les modifications de fenêtre sur un thread non-principal
org.lwjgl.opengl.Window.Window.backgroundThread=false
org.lwjgl.opengl.Display.disableOSXFullscreenModeAPI=true
org.lwjgl.opengl.Display.noinput=true
org.lwjgl.system.stackSize=1024
      `, "utf8");
      
      // Créer un fichier .override.txt pour forcer certaines options de JVM
      const overridePath = path.join(nativesDir, ".override.txt");
      fs.writeFileSync(overridePath, `
-XstartOnFirstThread
-Dlwjgl.MacOSXWindowClickErrorWorkaround=true
-Dorg.lwjgl.opengl.Window.Window.backgroundThread=false
-Dorg.lwjgl.system.stackSize=1024
      `, "utf8");
      
      fs.writeFileSync(patchMarker, "patched_v2", "utf8");
      
      logMessage.innerText = "✅ Configuration macOS terminée avec succès";
      logMessage.style.color = "green";
    } else {
      logMessage.innerText = "✅ Correctifs macOS déjà installés";
      logMessage.style.color = "green";
    }
    
    // S'assurer que tous les fichiers ont les bonnes permissions
    const existingFiles = fs.readdirSync(nativesDir);
    for (const file of existingFiles) {
      if (file.endsWith('.jnilib') || file.endsWith('.dylib')) {
        try {
          fs.chmodSync(path.join(nativesDir, file), "755");
        } catch (chmodError) {
          console.warn(`Avertissement: impossible de modifier les permissions de ${file}:`, chmodError);
        }
      }
    }
    
    return true;
  } catch (error) {
    const errorMsg = document.createElement("p");
    errorMsg.innerText = `❌ Erreur de configuration macOS: ${error.message}`;
    errorMsg.style.color = "red";
    logConsole.appendChild(errorMsg);
    console.error("Erreur de configuration macOS:", error);
    return false;
  }
}

// Affiche une notification pour informer sur le raccourci Ctrl+Shift+I
function showConsoleHint() {
  const notifContainer = document.createElement("div");
  notifContainer.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      background-color: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 10px 15px;
      border-radius: 5px;
      font-size: 14px;
      animation: fadeOut 3s forwards 2s;
      z-index: 9999;
  `;
  
  notifContainer.innerHTML = "Appuyez sur <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> pour afficher la console";
  document.body.appendChild(notifContainer);
  
  const style = document.createElement("style");
  style.textContent = `
      @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; visibility: hidden; }
      }
      kbd {
          background-color: #333;
          border-radius: 3px;
          border: 1px solid #555;
          padding: 1px 4px;
          font-family: monospace;
      }
  `;
  document.head.appendChild(style);
  
  setTimeout(() => {
    document.body.removeChild(notifContainer);
  }, 5000);
}

// Ajout de styles améliorés pour la console
const consoleStyle = document.createElement('style');
consoleStyle.textContent = `
  .LogConsole .eventLog {
    max-height: calc(100% - 60px);
    height: calc(100% - 60px);
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #6e6e6e #2e2e2e;
    padding: 10px;
    margin: 0;
    background-color: rgba(0, 0, 0, 0.8);
    border-radius: 5px;
    font-family: 'Consolas', 'Monaco', monospace;
  }
  
  .LogConsole .eventLog::-webkit-scrollbar {
    width: 10px;
  }
  
  .LogConsole .eventLog::-webkit-scrollbar-track {
    background: #2e2e2e;
    border-radius: 5px;
  }
  
  .LogConsole .eventLog::-webkit-scrollbar-thumb {
    background-color: #6e6e6e;
    border-radius: 5px;
  }
  
  .LogConsole .eventLog::-webkit-scrollbar-thumb:hover {
    background-color: #8e8e8e;
  }
  
  .LogConsole {
    display: none;
  }
  
  #close-error {
    position: absolute;
    top: 15px;
    right: 15px;
    font-size: 24px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  #close-error:hover {
    color: #e74c3c;
    transform: rotate(90deg);
    text-shadow: 0 0 10px rgba(231, 76, 60, 0.4);
  }
`;
document.head.appendChild(consoleStyle);

// Configuration du thread UI pour macOS avant le lancement du jeu
function setupMacOSUIThread() {
  if (process.platform !== 'darwin') return;
  
  // Ce script permet de s'assurer que les opérations de fenêtre sont effectuées sur le thread UI
  const mainThreadScript = `
  osascript -e '
  tell application "System Events"
    # Préparer l'environnement pour les opérations de fenêtre
    set frontApp to name of first application process whose frontmost is true
    tell process frontApp
      set visible to false
      delay 0.05
      set visible to true
    end tell
  end tell'
  `;
  
  try {
    execSync(mainThreadScript, { stdio: 'ignore' });
    console.log("Configuration du thread UI macOS effectuée");
    return true;
  } catch (error) {
    console.warn("Échec de la configuration du thread UI macOS:", error.message);
    return false;
  }
}

// Point d'entrée principal - Lancement du jeu
document.getElementById("launch")?.addEventListener("click", async () => {
  if (isGameRunning) {
    const logConsole = document.getElementById("eventLog");
    const warningMsg = document.createElement("p");
    warningMsg.innerText = "⚠️ Une instance de Minecraft est déjà en cours d'exécution";
    warningMsg.style.color = "orange";
    logConsole.appendChild(warningMsg);
    
    showConsoleHint();
    return;
  }

  showConsoleHint();
  
  // Préparer l'environnement macOS avant tout téléchargement/lancement
  if (process.platform === 'darwin') {
    setupMacOSUIThread();
  }
  
  let filesInstalled = 0;
  var temp = true;

  try {
    const platform = process.platform === 'darwin' ? 'darwin' : 'win';
    const response = await axios.get(`https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/${platform}`);

    const logConsole = document.getElementById("eventLog");
    const files = response.data.files;
    const totalFiles = response.data.totalFiles;
    
    // Créer un élément pour suivre la progression globale
    const progressElement = document.createElement("p");
    progressElement.style.color = "cyan";
    progressElement.innerText = `Vérification des fichiers: 0/${totalFiles}`;
    logConsole.appendChild(progressElement);
    
    for (let sa = 0; filesInstalled < files.length && temp; filesInstalled++) {
      const element = files[filesInstalled];
      try {
        const filePath = path.join(dataPath, element.path.replace("/files/", ""));
        const fileDir = path.dirname(filePath);
        
        // S'assurer que le répertoire existe
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Vérifier si le fichier existe et si le hash correspond
        if (fs.existsSync(filePath)) {
          const sha = require("crypto").createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
          if (sha === element.sha1) {
            const logMessage = document.createElement("p");
            logMessage.innerText = `Le fichier ${element.name} est déjà téléchargé.`;
            logMessage.style.color = "#8efa8e"; // Vert clair
            logConsole.appendChild(logMessage);
            ipcRenderer.send("log", "Fichier déjà téléchargé : ", element.name);
            progressElement.innerText = `Vérification des fichiers: ${filesInstalled + 1}/${totalFiles}`;
            continue;
          }
        }
        
        // Si le fichier n'existe pas ou le hash ne correspond pas
        await downloadFile(element);
        progressElement.innerText = `Vérification des fichiers: ${filesInstalled + 1}/${totalFiles}`;
        
      } catch (e) {
        await downloadFile(element);
        progressElement.innerText = `Vérification des fichiers: ${filesInstalled + 1}/${totalFiles}`;
      }
    }

    async function downloadFile(file) {
      const logMessage = document.createElement("p");
      logMessage.style.color = "yellow";
      logMessage.innerText = `Téléchargement de ${file.name} démarré...`;
      logConsole.appendChild(logMessage);
      
      const downloadDir = path.join(dataPath, file.path.replace("files", ""), "../");
      
      // S'assurer que le répertoire de téléchargement existe
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      const downloadFile = new Downloader({
        url: file.url,
        directory: downloadDir,
        fileName: file.name,
        cloneFiles: false,
        onProgress: function (percentage) {
          const formattedPercentage = isNaN(percentage) ? "100.00" : percentage.toFixed(2);
          ipcRenderer.send("log", formattedPercentage);
          logMessage.innerText = `⏬ ${formattedPercentage}% - ${file.name}`;
          logConsole.scrollTop = logConsole.scrollHeight;
        },
      });
      
      try {
        await downloadFile.download();
        logMessage.innerText = `✅ ${file.name} téléchargé avec succès`;
        logMessage.style.color = "#8efa8e"; // Vert clair
        return true;
      } catch (e) {
        ipcRenderer.send("log", e);
        logMessage.innerText = `❌ Erreur lors du téléchargement de ${file.name}: ${e.message}`;
        logMessage.style.color = "#ff6b6b"; // Rouge clair
        console.error("Erreur de téléchargement pour :", file.path, e);
        temp = false;
        return false;
      }
    }
    
    // Vérifier que tous les fichiers ont été téléchargés
    if (filesInstalled === totalFiles && temp) {
      const logConsole = document.getElementById("eventLog");
      
      // Chemins spécifiques à la plateforme
      const javaPath = process.platform === 'darwin' 
        ? path.join(dataPath, "jre1.8.0_381/Contents/Home/bin/java") 
        : path.join(dataPath, "jre1.8.0_381/bin/java");

      // Configuration spéciale pour macOS
      if (process.platform === 'darwin') {
        try {
          // S'assurer que Java est exécutable
          fs.chmodSync(javaPath, '755');
          
          // Configurer les natives spécifiques à macOS
          const nativesSetupSuccess = await setupMacOSNatives(logConsole);
          
          if (!nativesSetupSuccess) {
            const errorMsg = document.createElement("p");
            errorMsg.innerText = "⚠️ Avertissement: La configuration des natives macOS n'est pas complète";
            errorMsg.style.color = "orange";
            logConsole.appendChild(errorMsg);
          }
          
          // Pré-initialiser l'environnement UI pour éviter les problèmes de thread
          setupMacOSUIThread();
          
        } catch (error) {
          console.error(`Erreur lors de la configuration macOS: ${error.message}`);
          const errorMsg = document.createElement("p");
          errorMsg.innerText = `⚠️ Erreur lors de la configuration macOS: ${error.message}`;
          errorMsg.style.color = "orange";
          logConsole.appendChild(errorMsg);
        }
      }
      
      // Arguments Java de base
      const javaArgs = [];
      
      // Arguments spécifiques à macOS
      if (process.platform === 'darwin') {
        const nativesDir = path.join(dataPath, "natives");
        
        // Paramètres essentiels pour macOS/LWJGL
        javaArgs.push("-XstartOnFirstThread"); // CRUCIAL pour éviter l'erreur NSWindow
        javaArgs.push(`-Djava.library.path=${nativesDir}`);
        javaArgs.push(`-Dorg.lwjgl.librarypath=${nativesDir}`);
        
        // Configuration spécifique pour éviter les erreurs de thread UI
        javaArgs.push("-Djava.awt.headless=false");
        javaArgs.push("-Dlwjgl.MacOSXWindowClickErrorWorkaround=true");
        javaArgs.push("-Dorg.lwjgl.opengl.Window.Window.backgroundThread=false"); // TRÈS IMPORTANT
        
        // Identifier l'application pour macOS
        javaArgs.push("-Dapple.awt.application.name=NeoEarth-MC");
        javaArgs.push("-Dapple.awt.application.appearance=system");
        javaArgs.push("-Dapple.laf.useScreenMenuBar=true");
        
        // Paramètres de rendu OpenGL
        javaArgs.push("-Dawt.nativeDoubleBuffering=false");
        javaArgs.push("-Dapple.awt.graphics.UseQuartz=true");
        javaArgs.push("-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true");
        javaArgs.push("-Dorg.lwjgl.opengl.Display.enableHighDPI=true");
        javaArgs.push("-Dswing.crossplatformlaf=com.apple.laf.AquaLookAndFeel");
        
        // Désactiver les API problématiques
        javaArgs.push("-Dorg.lwjgl.opengl.Display.disableOSXFullscreenModeAPI=true");
        javaArgs.push("-Dorg.lwjgl.opengl.Display.noinput=true");
        
        // Autres paramètres utiles
        javaArgs.push("-Dapple.awt.UIElement=true");
        javaArgs.push("-Dorg.lwjgl.system.stackSize=1024");
      }
      
      // Configuration du lancement
      let opts = {
        authorization: Authenticator.getAuth(store.get("username")),
        root: path.join(dataPath),
        version: {
          number: "1.7.10",
          type: "release"
        },
        forge: path.join(dataPath, "forge.jar"),
        javaPath: javaPath,
        memory: {
          min: store.get('ramSettings')?.ramMin || "1G",
          max: store.get('ramSettings')?.ramMax || "2G"
        },
        javaArgs: javaArgs,
        quickPlay: {
          type: "legacy",
          identifier: "88.151.197.30:25565",
          legacy: null,
        }
      };
      
      // Variables d'environnement spécifiques à macOS
      if (process.platform === 'darwin') {
        const nativesDir = path.join(dataPath, "natives");
        
        opts.environmentVariables = {
          "DYLD_LIBRARY_PATH": nativesDir,
          "AWT_TOOLKIT": "sun.lwawt.macosx.LWCToolkit",
          "DYLD_INSERT_LIBRARIES": path.join(nativesDir, "liblwjgl.jnilib"),
          "DYLD_FORCE_FLAT_NAMESPACE": "1",
          "LWJGL_DISABLE_MACOSX_WINDOW": "true", // Force l'utilisation de AWT au lieu de Cocoa
          "JAVA_TOOL_OPTIONS": "-Djava.awt.headless=false" // Important pour Java UI
        };
        
        // Exécuter le script de correction du focus avant le lancement
        const fixScript = `
        osascript -e '
          tell application "System Events"
            set frontProcess to first process where it is frontmost
            set visible of frontProcess to false
            delay 0.1
            set visible of frontProcess to true
          end tell'
        `;
        
        try {
          exec(fixScript);
        } catch (scriptError) {
          console.warn("Avertissement: échec du script de focus:", scriptError.message);
        }
        
        const macSettingsMsg = document.createElement("p");
        macSettingsMsg.innerText = "🍏 Configuration macOS activée avec paramètres de sécurité thread UI";
        macSettingsMsg.style.color = "cyan";
        logConsole.appendChild(macSettingsMsg);
      }

      // Lancer le jeu
      const launchMsg = document.createElement("p");
      launchMsg.innerText = "🚀 Lancement de Minecraft...";
      launchMsg.style.color = "lightblue";
      logConsole.appendChild(launchMsg);
      
      isGameRunning = true;
      launcher.launch(opts);
      
      // Intercepteur de sortie de débogage du launcher
      launcher.on('debug', (e) => {
        ipcRenderer.send("log", e);
        
        // Filtrer les messages trop verbeux
        if (e.includes("NativeLibrary.load") || 
            e.includes("Setting user: ") ||
            e.includes("Loading asset index")) {
          return;
        }
        
        const logMessage = document.createElement("p");
        if (e.includes("/ERROR")) {
          logMessage.style.color = "#ff6b6b"; // Rouge
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "#ffb86c"; // Orange
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;

        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
        
        // Détecter et corriger les problèmes UI macOS
        if (process.platform === 'darwin') {
          if (e.includes("Display initialization") || 
              e.includes("Setting display mode") || 
              e.includes("Created window") || 
              e.includes("LWJGL Version")) {
            
            try {
              // Forcer un cycle de visibilité pour être sûr que les fenêtres
              // sont bien gérées par le thread principal
              exec(`
              osascript -e '
                tell application "System Events"
                  set frontProcess to first process whose frontmost is true
                  set visible of frontProcess to false
                  delay 0.05
                  set visible of frontProcess to true
                end tell'
              `);
            } catch (err) {
              // Ignorer les erreurs du script, ne pas bloquer l'exécution
            }
          }
        }
      });
      
      // Interception de la sortie standard du jeu
      launcher.on('data', (e) => {
        ipcRenderer.send("log", e);
        const logMessage = document.createElement("p");
        
        // Colorer selon le type de message
        if (e.includes("/ERROR") || e.includes("Exception")) {
          logMessage.style.color = "#ff6b6b"; // Rouge
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "#ffb86c"; // Orange
        } else if (e.includes("Successfully")) {
          logMessage.style.color = "#8efa8e"; // Vert
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;

        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
        
        // Détecter spécifiquement l'erreur NSWindow et appliquer une correction immédiate
        if (process.platform === 'darwin') {
          if (e.includes("NSInternalInconsistencyException") || 
              e.includes("NSWindow geometry") || 
              e.includes("modified on the main thread")) {
            
            const fixMsg = document.createElement("p");
            fixMsg.innerText = "🔄 Tentative de récupération après erreur de thread UI...";
            fixMsg.style.color = "#ffcc00"; // Jaune
            logConsole.appendChild(fixMsg);
            
            try {
              // Script de récupération pour forcer le focus
              const recoveryScript = `
              osascript -e '
                tell application "System Events"
                  set frontProcess to first process whose frontmost is true
                  set visible of frontProcess to false
                  delay 0.05
                  set visible of frontProcess to true
                end tell'
              `;
              exec(recoveryScript);
              
              // Ne pas terminer le processus pour cette erreur spécifique
              // Le jeu devrait continuer à fonctionner malgré cette erreur
            } catch (err) {
              console.warn("Échec du script de récupération:", err);
            }
          }
        }
      });
      
      // Gestion de la fermeture du jeu
      launcher.on('close', () => {
        isGameRunning = false;
        
        const closeMsg = document.createElement("p");
        closeMsg.innerText = "✅ Minecraft s'est fermé correctement.";
        closeMsg.style.color = "green";
        logConsole.appendChild(closeMsg);
        
        if (store.get("KeepLauncherOpen") === false || store.get("KeepLauncherOpen") === undefined) {
          const quitMsg = document.createElement("p");
          quitMsg.innerText = "⏱️ Le launcher va se fermer dans 5 secondes...";
          quitMsg.style.color = "#ffb86c";
          logConsole.appendChild(quitMsg);
          
          setTimeout(() => {
            ipcRenderer.send("quit");
          }, 5000);
        }
      });
    }
  } catch (error) {
    console.error("Erreur lors du lancement:", error);
    const logConsole = document.getElementById("eventLog");
    const errorMsg = document.createElement("p");
    errorMsg.innerText = `❌ Erreur: ${error.message}`;
    errorMsg.style.color = "red";
    logConsole.appendChild(errorMsg);
  }
});
