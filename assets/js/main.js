const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();
const fs = require("fs");
require('dotenv').config();
const { xml2json } = require("xml-js");
const { exec } = require('child_process');

// Define dataPath based on platform
const platform = process.platform;

// Global variables
let isGameRunning = false;

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'I') {
    e.preventDefault(); 
    const logConsole = document.getElementById("LogConsole");
    if (logConsole) {
      logConsole.style.display = logConsole.style.display === 'block' ? 'none' : 'block';
    }
  }
});

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

// User profile display
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

// News fetching and display
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
        for (let i = 6; i < JSON.parse(json).elements[0].elements[0].elements.length && i < 8; i++) {
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

// External links event handlers
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

// Window control buttons
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

// Social menu manager
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

// Console notification helper
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

// Console styling
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

// Game launch handler
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
  
  let filesInstalled = 0;
  var temp = true;

  try {
    // Platform-specific API endpoint
    const platformParam = platform === 'win32' ? 'win' : platform === 'darwin' ? 'mac' : 'linux';
    const response = await axios.get(`https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/${platformParam}`);

    const logConsole = document.getElementById("eventLog");
    const files = response.data.files;
    const totalFiles = response.data.totalFiles;
    
    // Progress tracking
    const progressElement = document.createElement("p");
    progressElement.style.color = "cyan";
    progressElement.innerText = `Vérification des fichiers: 0/${totalFiles}`;
    logConsole.appendChild(progressElement);
    
    for (let sa = 0; filesInstalled < files.length && temp; filesInstalled++) {
      const element = files[filesInstalled];
      try {
        const filePath = path.join(dataPath, element.path.replace("/files/", ""));
        const fileDir = path.dirname(filePath);
        
        // Create directory if needed
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        // Check if file exists with correct hash
        if (fs.existsSync(filePath)) {
          const sha = require("crypto").createHash("sha1").update(fs.readFileSync(filePath)).digest("hex");
          if (sha === element.sha1) {
            const logMessage = document.createElement("p");
            logMessage.innerText = `Le fichier ${element.name} est déjà téléchargé.`;
            logMessage.style.color = "#8efa8e"; // Light green
            logConsole.appendChild(logMessage);
            ipcRenderer.send("log", "Fichier déjà téléchargé : ", element.name);
            progressElement.innerText = `Vérification des fichiers: ${filesInstalled + 1}/${totalFiles}`;
            continue;
          }
        }
        
        // Download file if needed
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
      
      // Create download directory
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      const downloadFile = new Downloader({
        url: file.url,
        directory: downloadDir,
        fileName: file.name,
        cloneFiles: false,
        onProgress: function (percentage) {
          const formattedPercentage = typeof percentage === 'number' ? percentage.toFixed(2) : "0.00";
          ipcRenderer.send("log", formattedPercentage);
          logMessage.innerText = `⏬ ${formattedPercentage}% - ${file.name}`;
          logConsole.scrollTop = logConsole.scrollHeight;
        },
      });
      
      try {
        await downloadFile.download();
        logMessage.innerText = `✅ ${file.name} téléchargé avec succès`;
        logMessage.style.color = "#8efa8e"; 
        return true;
      } catch (e) {
        ipcRenderer.send("log", e);
        logMessage.innerText = `❌ Erreur lors du téléchargement de ${file.name}: ${e.message}`;
        logMessage.style.color = "#ff6b6b";
        console.error("Erreur de téléchargement pour :", file.path, e);
        
        // Retry logic
        const retryMsg = document.createElement("p");
        retryMsg.innerText = `⏱️ Nouvelle tentative dans 3 secondes...`;
        retryMsg.style.color = "#ffb86c";
        logConsole.appendChild(retryMsg);
        
        // Wait 3 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          await downloadFile.download();
          logMessage.innerText = `✅ ${file.name} téléchargé avec succès (après nouvelle tentative)`;
          logMessage.style.color = "#8efa8e"; 
          return true;
        } catch (retryError) {
          logMessage.innerText = `❌ Échec définitif pour ${file.name}: ${retryError.message}`;
          logMessage.style.color = "#ff6b6b";
          temp = false;
          return false;
        }
      }
    }
    
    // Launch game when all files are downloaded
    if (filesInstalled === totalFiles && temp) {
      const logConsole = document.getElementById("eventLog");
      
      // Platform-specific Java paths
      let javaPath;
      if (platform === 'win32') {
        javaPath = path.join(dataPath, "jre1.8.0_381/bin/java");
      } else if (platform === 'darwin') {
        javaPath = path.join(dataPath, "jre.bundle/Contents/Home/bin/java");
      } else {
        javaPath = path.join(dataPath, "jre/bin/java");
      }

      // Launch configuration
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
        quickPlay: {
          type: "legacy",
          identifier: "85.215.107.133:25565",
          legacy: null,
        }
      };

      // Add platform-specific JVM arguments
      if (platform === 'darwin') { // macOS
        opts.javaArgs = [
          // Fix for the NSWindow thread issue
          "-XstartOnFirstThread",
          // Additional macOS optimizations
          "-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true",
          "-Dorg.lwjgl.opengl.Display.enableHighDPI=true"
        ];
      } else if (platform === 'win32') { // Windows
        opts.javaArgs = [
          // Windows-specific optimizations if needed
          "-XX:+UseG1GC",
          "-XX:+ParallelRefProcEnabled",
          "-XX:MaxGCPauseMillis=200"
        ];
      } else if (platform === 'linux') { // Linux
        opts.javaArgs = [
          // Linux-specific optimizations if needed
          "-XX:+UseG1GC",
          "-XX:+DisableExplicitGC"
        ];
      }

      // Launch the game
      const launchMsg = document.createElement("p");
      launchMsg.innerText = "🚀 Lancement de Minecraft...";
      launchMsg.style.color = "lightblue";
      logConsole.appendChild(launchMsg);
      
      isGameRunning = true;
      launcher.launch(opts);
      
      // Debug output handler
      launcher.on('debug', (e) => {
        ipcRenderer.send("log", e);
        
        // Filter verbose messages
        if (e.includes("NativeLibrary.load") || 
            e.includes("Setting user: ") ||
            e.includes("Loading asset index")) {
          return;
        }
        
        const logMessage = document.createElement("p");
        if (e.includes("/ERROR")) {
          logMessage.style.color = "#ff6b6b"; // Red
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "#ffb86c"; // Orange
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;

        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
      });
      
      // Game output handler
      launcher.on('data', (e) => {
        ipcRenderer.send("log", e);
        const logMessage = document.createElement("p");
        
        // Color by message type
        if (e.includes("/ERROR") || e.includes("Exception")) {
          logMessage.style.color = "#ff6b6b"; // Red
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "#ffb86c"; // Orange
        } else if (e.includes("Successfully")) {
          logMessage.style.color = "#8efa8e"; // Green
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;

        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
      });
      
      // Handle game close
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