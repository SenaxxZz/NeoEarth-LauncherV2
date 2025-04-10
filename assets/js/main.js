const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();
const fs = require("fs");
require('dotenv').config();
const { xml2json } = require("xml-js");
const { formToJSON } = require("axios");
const { exec } = require('child_process');

// Fix mod management avec gestion d'erreurs améliorée
let modsList = [];
try {
  if (fs.existsSync(path.join(dataPath, "mods"))) {
    fs.readdir(path.join(dataPath, "mods"), (err, modList) => {
      if (err) return console.error("Erreur lors de la lecture du dossier mods:", err);
      
      for (let i = 0; i < modList.length; i++) {
        const modName = modList[i];
        const modCheck = modList[i].split(/[^a-zA-Z0-9]/)[0];
        const existingIndex = modsList.findIndex(mod => mod.startsWith(modCheck));

        if (existingIndex !== -1) {
          let filePath = `${modsList[existingIndex]}`;
          modsList.splice(existingIndex, 1);
          try {
            fs.unlinkSync(path.join(dataPath, "mods", filePath));
            console.info(`Suppression de la version précédente du mod : ${modsList[existingIndex]}`);
          } catch (removeErr) {
            console.error(`Erreur lors de la suppression de ${modsList[existingIndex]} :`, removeErr);
          }
        }
        modsList.push(modName);
      }
    });
  } else {
    console.log("Le dossier mods n'existe pas encore, il sera créé au besoin");
  }
} catch (error) {
  console.error("Erreur lors de la gestion des mods:", error);
}

// User information
document.addEventListener('DOMContentLoaded', function() {
  // Variables utilisateur
  const username = store.get("username");
  const rank = store.get("rank");

  const usernameElement = document.getElementById("username");
  const rankElement = document.getElementById("rank");
  const avatarElement = document.getElementById("avatar");

  if (usernameElement) {
    usernameElement.innerText = username || "";
  }

  if (rankElement) {
    rankElement.innerText = rank || "";
  }

  if (avatarElement) {
    avatarElement.src = `https://www.neoearth-mc.fr/api/storage/head/${username}`;
    avatarElement.onerror = () => {
      avatarElement.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${username}.png`;
    };
  }

  // News fetching
  fetchNews();

  // Setup Social Menu Manager
  initSocialMenuManager();

  // Config external links
  setupExternalLinks();

  // Config window controls
  setupWindowControls();
});

// News fetching function
async function fetchNews() {
  const divNews = document.getElementById("cards-container");
  if (!divNews) return;

  let data = [];

  try {
    const response = await axios.get("https://apiprod.neoearth-mc.fr/news");
    data = response.data.slice(response.data.length - 2, response.data.length);
  } catch (error) {
    console.error("Erreur avec l'API principale, tentative avec RSS : ", error);
    try {
      const fallbackResponse = await axios.get("https://www.neoearth-mc.fr/api/rss");
      const json = xml2json(fallbackResponse.data);
      const parsedJson = JSON.parse(json);
      const elements = parsedJson.elements[0].elements[0].elements;
      
      for (let i = 6; i < elements.length && i < 8; i++) {
        const item = elements[i];
        let date = item.elements[4]?.elements[0]?.text;
        if (date) {
          let dateObj = new Date(date);
          let day = String(dateObj.getUTCDate()).padStart(2, '0');
          let month = String(dateObj.getUTCMonth() + 1).padStart(2, '0'); 
          let year = dateObj.getUTCFullYear();
          let hours = String(dateObj.getUTCHours()).padStart(2, '0');
          let minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');

          let formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;

          let image = item.elements[5]?.attributes?.url;
          let title = item.elements[0]?.elements[0]?.text;
          let author = item.elements[7]?.elements[0]?.text;
          data.push({
            title: title, 
            image: image, 
            author: author, 
            publishedAt: formattedDate, 
            tags: "Nouveauté"
          });
        }
      }
    } catch (fallbackError) {
      console.error("Erreur avec l'API RSS:", fallbackError);
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
    img.src = !newsItem.image.includes("https") ? 
      `https://www.neoearth-mc.fr/storage/news/${newsItem.image}` : newsItem.image;

    const tag = document.createElement("h3");
    tag.innerText = newsItem.tags;

    const authorSection = document.createElement("div");
    authorSection.className = "author-section";

    const avatar = document.createElement("img");
    avatar.className = "avatar-author";
    avatar.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${newsItem.author}.png`;
    avatar.onerror = () => {
      avatar.src = `https://www.neoearth-mc.fr/api/skin-api/avatars/face/${store.get("username") || "Steve"}.png`;
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

// Setup External Links
function setupExternalLinks() {
  const links = {
    "cards-container": "https://www.neoearth-mc.fr",
    "link-discord": "https://discord.gg/NRrwNm39G8",
    "link-twitter": "https://twitter.com/NeoEarth_Off",
    "link-tiktok": "https://www.tiktok.com/@neoearth_off",
    "link-youtube": "https://www.youtube.com/@neoearth_off",
    "link-twitch": "https://www.twitch.tv/neoearth_off",
    "rules": "https://wikimc.neoearth-mc.fr",
    "radio": "https://radio.neoearth-mc.fr"
  };

  Object.entries(links).forEach(([id, url]) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("click", () => {
        shell.openExternal(url);
      });
    }
  });
}

// Setup Window Controls
function setupWindowControls() {
  const controls = {
    "close": () => ipcRenderer.send("quit"),
    "minimize": () => ipcRenderer.send("minimize"),
    "maximize": () => ipcRenderer.send("maximize"),
    "close-error": () => {
      const logConsole = document.getElementById("LogConsole");
      if (logConsole) logConsole.style.display = "none";
    }
  };

  Object.entries(controls).forEach(([id, action]) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener("click", action);
    }
  });
}

// Initialize Social Menu Manager
function initSocialMenuManager() {
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
}

// macOS LWJGL Fix Helper Functions
async function setupMacOSNatives(logConsole) {
  if (process.platform !== 'darwin') return true;
  
  try {
    const nativesDir = path.join(dataPath, "natives");
    
    // Create natives directory if it doesn't exist
    if (!fs.existsSync(nativesDir)) {
      fs.mkdirSync(nativesDir, { recursive: true });
    }
    
    const logMessage = document.createElement("p");
    logMessage.innerText = "Configuration des natives LWJGL pour macOS...";
    logMessage.style.color = "yellow";
    logConsole.appendChild(logMessage);
    
    // Check if we already have the patched library
    const patchedLibPath = path.join(nativesDir, "liblwjgl.jnilib");
    const patchMarker = path.join(dataPath, ".lwjgl_patched");
    
    if (!fs.existsSync(patchedLibPath) || !fs.existsSync(patchMarker)) {
      // Download the patched library from a reliable source
      const patchedLibUrl = "https://github.com/Tech1k/lwjgl-mac-fix/raw/main/liblwjgl.jnilib";
      
      const downloadPatch = new Downloader({
        url: patchedLibUrl,
        directory: nativesDir,
        fileName: "liblwjgl.jnilib",
        cloneFiles: false,
        onProgress: function(percentage) {
          logMessage.innerText = `Téléchargement des correctifs macOS: ${percentage}%`;
        }
      });
      
      try {
        await downloadPatch.download();
        
        // Set executable permissions
        fs.chmodSync(patchedLibPath, "755");
        
        // Create patch marker
        fs.writeFileSync(patchMarker, "patched", "utf8");
        
        logMessage.innerText = "✅ Configuration macOS terminée avec succès";
        logMessage.style.color = "green";
      } catch (downloadError) {
        logMessage.innerText = `❌ Erreur de téléchargement du correctif: ${downloadError.message}`;
        logMessage.style.color = "red";
        console.error("Erreur de téléchargement:", downloadError);
      }
    } else {
      logMessage.innerText = "✅ Correctifs macOS déjà installés";
      logMessage.style.color = "green";
    }
    
    // Make sure all other JNI libraries in natives dir are executable
    try {
      const nativeFiles = fs.readdirSync(nativesDir);
      for (const file of nativeFiles) {
        if (file.endsWith('.jnilib') || file.endsWith('.dylib')) {
          fs.chmodSync(path.join(nativesDir, file), "755");
        }
      }
    } catch (chmodError) {
      console.error("Erreur lors de la modification des permissions:", chmodError);
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

// Launch game with improved error handling
document.getElementById("launch")?.addEventListener("click", async () => {
  const logConsoleElement = document.getElementById("LogConsole");
  logConsoleElement.style.display = "block";
  
  const logConsole = document.getElementById("eventLog");
  if (logConsole) {
    logConsole.innerHTML = ''; // Clear previous logs
  }
  
  let filesInstalled = 0;
  let temp = true;

  try {
    // Determine platform
    const platform = process.platform === 'darwin' ? 'darwin' : 'win';
    
    // Get version info from server
    const response = await axios.get(`https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/${platform}`);

    const files = response.data.files;
    const totalFiles = response.data.totalFiles;
    
    // Download or verify files
    for (let i = 0; i < files.length && temp; i++) {
      const element = files[i];
      try {
        // Create the directory path if it doesn't exist
        const fileDir = path.join(dataPath, path.dirname(element.path.replace("/files/", "")));
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        const filePath = path.join(dataPath, element.path.replace("/files/", ""));
        const logMessage = document.createElement("p");
        
        // Check if file exists and has correct SHA1
        if (fs.existsSync(filePath)) {
          try {
            const sha = require("crypto")
              .createHash("sha1")
              .update(fs.readFileSync(filePath))
              .digest("hex");
            
            if (sha === element.sha1) {
              console.log("Fichier déjà téléchargé :", element.name);
              logMessage.innerText = `Le fichier ${element.name} est déjà téléchargé.`;
              logConsole.appendChild(logMessage);
              filesInstalled++;
              continue;
            }
          } catch (shaError) {
            console.error(`Erreur lors de la vérification SHA1 pour ${element.name}:`, shaError);
          }
        }
        
        // Download file if needed
        await downloadFile(element, logConsole);
        filesInstalled++;
      } catch (error) {
        console.error(`Erreur avec le fichier ${element.name}:`, error);
        const errorMsg = document.createElement("p");
        errorMsg.innerText = `Erreur avec le fichier ${element.name}: ${error.message}`;
        errorMsg.style.color = "red";
        logConsole.appendChild(errorMsg);
        temp = false;
      }
    }

    // If all files are downloaded successfully, proceed with launching
    if (filesInstalled === files.length && temp) {
      // Platform-specific Java path
      const javaPath = process.platform === 'darwin' 
        ? path.join(dataPath, "jre1.8.0_381/Contents/Home/bin/java") 
        : path.join(dataPath, "jre1.8.0_381/bin/java");
      
      // Set proper permissions on macOS
      if (process.platform === 'darwin') {
        try {
          fs.chmodSync(javaPath, '755');
          
          // Setup the macOS natives and libraries
          await setupMacOSNatives(logConsole);
        } catch (error) {
          console.error(`Erreur lors de la configuration macOS: ${error.message}`);
          const errorMsg = document.createElement("p");
          errorMsg.innerText = `Erreur lors de la configuration macOS: ${error.message}`;
          errorMsg.style.color = "red";
          logConsole.appendChild(errorMsg);
        }
      }
      
      // Platform-specific Java arguments
      const javaArgs = process.platform === 'darwin' ? [
        "-XstartOnFirstThread",
        "-Djava.awt.headless=false",
        "-Dorg.lwjgl.opengl.Window.undecorated=true",
        "-Dorg.lwjgl.util.Debug=true",
        "-Dorg.lwjgl.util.NoChecks=true",
        "-Dapple.awt.application.name=NeoEarth-MC",
        "-Dapple.awt.application.appearance=system",
        "-Dapple.laf.useScreenMenuBar=true",
        "-Dawt.nativeDoubleBuffering=false",
        "-Dapple.awt.graphics.UseQuartz=true", 
        "-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true",
        "-Dorg.lwjgl.opengl.Display.enableHighDPI=true",
        "-Dswing.crossplatformlaf=com.apple.laf.AquaLookAndFeel", 
        "-Dorg.lwjgl.opengl.Display.disableOSXFullscreenModeAPI=true",
        "-Dorg.lwjgl.opengl.Display.noinput=true", 
        "-Dapple.awt.UIElement=true"
      ] : [];
      
      // Configure launcher options with default values for missing settings
      const ramSettings = store.get('ramSettings') || { ramMin: 1024, ramMax: 2048 };
      
      let opts = {
        authorization: Authenticator.getAuth(store.get("username")),
        root: dataPath,
        verify: true,
        timeout: 10000,
        version: {
          number: "1.7.10",
          type: "release"
        },
        forge: path.join(dataPath, "forge.jar"),
        javaPath: javaPath,
        memory: {
          min: ramSettings.ramMin,
          max: ramSettings.ramMax
        },
        javaArgs: javaArgs,
        quickPlay: {
          type: "legacy",
          identifier: "88.151.197.30:25565",
          legacy: null,
        }
      };
      
      // Add macOS-specific environment variables
      if (process.platform === 'darwin') {
        const nativesDir = path.join(dataPath, "natives");
        
        // Add environment variables for macOS
        opts.environmentVariables = {
          "DYLD_LIBRARY_PATH": nativesDir,
          "AWT_TOOLKIT": "sun.lwawt.macosx.LWCToolkit",
          "DYLD_INSERT_LIBRARIES": path.join(nativesDir, "liblwjgl.jnilib"),
          "DYLD_FORCE_FLAT_NAMESPACE": "1"
        };
        
        // Create and execute a fix script for macOS thread issues
        const fixScript = `
        osascript -e '
        tell application "System Events"
          set frontProcess to first process where it is frontmost
          set visible of frontProcess to false
          delay 0.1
          set visible of frontProcess to true
        end tell'
        `;
        
        // Execute this right at launch to ensure window operations happen on main thread
        exec(fixScript);
        
        // Log macOS launch settings
        const macSettingsMsg = document.createElement("p");
        macSettingsMsg.innerText = "Configuration macOS activée";
        macSettingsMsg.style.color = "cyan";
        logConsole.appendChild(macSettingsMsg);
      }

      // Launch the game
      launcher.launch(opts);
      
      // Handle launcher events
      launcher.on('debug', (e) => {
        ipcRenderer.send("log", e);
        const logMessage = document.createElement("p");
        if (e.includes("/ERROR")) {
          logMessage.style.color = "red";
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "orange";
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;
        
        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
        
        // Auto-fix for macOS thread issues
        if (process.platform === 'darwin' && 
            (e.includes("NSInternalInconsistencyException") || 
             e.includes("modified on the main thread"))) {
          exec(`
          osascript -e '
          tell application "System Events"
            set frontProcess to first process where it is frontmost
            set visible of frontProcess to false
            delay 0.1
            set visible of frontProcess to true
          end tell'
          `);
        }
      });
      
      launcher.on('data', (e) => {
        ipcRenderer.send("log", e);
        const logMessage = document.createElement("p");
        if (e.includes("/ERROR")) {
          logMessage.style.color = "red";
        } else if (e.includes("/WARN")) {
          logMessage.style.color = "orange";
        } else {
          logMessage.style.color = "white";
        }
        logMessage.innerText = e;
        
        logConsole.appendChild(logMessage);
        logConsole.scrollTop = logConsole.scrollHeight;
        
        // Auto-fix for macOS thread issues
        if (process.platform === 'darwin' && 
            (e.includes("NSInternalInconsistencyException") |