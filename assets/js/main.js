const { Client, Authenticator } = require("minecraft-launcher-core");
const launcher = new Client();
const fs = require("fs");
require('dotenv').config();
const { xml2json } = require("xml-js");
const { formToJSON } = require("axios");
const { exec } = require('child_process');

// Fix mod management
let modsList = [];
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

// User information
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

// News fetching
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

// External links
document.getElementById("cards-container")?.addEventListener("click", (event) => {
    shell.openExternal("https://www.neoearth-mc.fr");
});

document.getElementById("link-discord")?.addEventListener("click", (event) => {
    shell.openExternal("https://discord.gg/NRrwNm39G8");
});

document.getElementById("link-twitter")?.addEventListener("click", (event) => {
    shell.openExternal("https://twitter.com/NeoEarth_Off");
});

document.getElementById("link-tiktok")?.addEventListener("click", (event) => {
    shell.openExternal("https://www.tiktok.com/@neoearth_off");
});

document.getElementById("link-youtube")?.addEventListener("click", (event) => {
    shell.openExternal("https://www.youtube.com/@neoearth_off");
});

document.getElementById("link-twitch")?.addEventListener("click", (event) => {
    shell.openExternal("https://www.twitch.tv/neoearth_off");
});

document.getElementById("rules").addEventListener("click", (event) => {
    shell.openExternal("https://wikimc.neoearth-mc.fr");
});

document.getElementById("radio").addEventListener("click", (event) => {
    shell.openExternal("https://radio.neoearth-mc.fr");
});

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

document.getElementById("close-error")?.addEventListener("click", () => {
    document.getElementById("LogConsole").style = "display: none;";
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

// macOS LWJGL Fix Helper Functions
async function setupMacOSNatives(logConsole, javaPath) {
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

// Launch game
document.getElementById("launch")?.addEventListener("click", async () => {
    document.getElementById("LogConsole").style.display = "block";
    let filesInstalled = 0;
    var temp = true;

    const platform = process.platform === 'darwin' ? 'darwin' : 'win';
    const response = await axios.get(`https://apiprod.neoearth-mc.fr/launcher/version/neoearth-mc/${platform}`);

    const files = response.data.files;
    const totalFiles = response.data.totalFiles;
    for (let sa = 0; filesInstalled < files.length && temp; filesInstalled++) {
        const logMessage = document.createElement("p");

        const element = files[filesInstalled];
        try {
            const sha = require("crypto").createHash("sha1").update(fs.readFileSync(path.join(dataPath, element.path.replace("/files/", "")))).digest("hex");
            if (sha == element.sha1) {
                console.log("Fichier déjà téléchargé :", element.name);
                logMessage.innerText = `Le fichier ${element.name} est déjà téléchargé.`;
                const logConsole = document.getElementById("eventLog");
                logConsole.appendChild(logMessage);
                ipcRenderer.send("log", "Fichier déjà téléchargé : ", element.name);
            } else {
                throw "";
            }
        } catch (e) {
            await downloadFile(element);
        }
    }

    async function downloadFile(file) {
        const logMessage = document.createElement("p");
        const downloadFile = new Downloader({
            url: file.url,
            directory: path.join(dataPath, file.path.replace("files", ""), "../"),
            fileName: file.name,
            cloneFiles: false,
            onProgress: function (percentage) {
                ipcRenderer.send("log", percentage.toString() == "NaN" || percentage.toString == null ? "100.00" : percentage);
                logMessage.innerText = `${percentage.toString() == "NaN" || percentage.toString == null ? "100.00" : percentage}%/100% de téléchargement du fichier ${file.name}.`;

                const logConsole = document.getElementById("eventLog");
                logConsole.appendChild(logMessage);
            },
        });
        try {
            await downloadFile.download();
            // console.log("Telechargement fini du fichier : " + file.name);
            // ipcRenderer.send("log", "Telechargement fini du fichier : " + file.name);
            return;
        } catch (e) {
            ipcRenderer.send("log", e);
            console.log(e);
            ipcRenderer.send("log", "Erreur de téléchargement pour : " + file.path);
            console.log("Erreur de téléchargement pour : " + file.path);
            console.log(file.path);
            temp = false;
        }
    }
    
    if (filesInstalled == totalFiles) {
        const logConsole = document.getElementById("eventLog");
        const logMessage = document.createElement("p");
        // console.log("Téléchargement des assets terminé.");
        // ipcRenderer.send("log", "Téléchargement des assets terminé.");
        // logMessage.innerText = `Téléchargement des assets terminé.`;
        // logConsole.appendChild(logMessage);
    
        // Platform-specific Java path
        const javaPath = process.platform === 'darwin' 
            ? path.join(dataPath, "jre1.8.0_381/Contents/Home/bin/java") 
            : path.join(dataPath, "jre1.8.0_381/bin/java");
    
        // Set proper permissions on macOS
        if (process.platform === 'darwin') {
            try {
                fs.chmodSync(javaPath, '755');
                
                // Setup the macOS natives and libraries
                await setupMacOSNatives(logConsole, javaPath);
                
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
            "-Dorg.lwjgl.util.Debug=true", // Enable LWJGL debugging on macOS
            "-Dorg.lwjgl.util.NoChecks=true",
            "-Dapple.awt.application.name=NeoEarth-MC",
            "-Dapple.awt.application.appearance=system",
            "-Dapple.laf.useScreenMenuBar=true",
            "-Dawt.nativeDoubleBuffering=false",
            "-Dapple.awt.graphics.UseQuartz=true", 
            "-Dorg.lwjgl.opengl.Display.allowSoftwareOpenGL=true",
            "-Dorg.lwjgl.opengl.Display.enableHighDPI=true",
            "-Dswing.crossplatformlaf=com.apple.laf.AquaLookAndFeel", 
            "-Dorg.lwjgl.opengl.Window.Window.backgroundThread=false"
        ] : [];
        
        // Configure launcher options
        let opts = {
            authorization: Authenticator.getAuth(store.get("username")),
            root: path.join(dataPath),
            verify: true,
            timeout: 10000,
            version: {
                number: "1.7.10",
                type: "release"
            },
            forge: path.join(dataPath, "forge.jar"),
            javaPath: javaPath,
            memory: {
                min: store.get('ramSettings').ramMin,
                max: store.get('ramSettings').ramMax
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
            const patchedLibPath = path.join(nativesDir, "liblwjgl.jnilib");
            
            // Use environment variables to ensure macOS uses our patched libraries
            opts.environmentVariables = {
                "DYLD_LIBRARY_PATH": nativesDir,
                "AWT_TOOLKIT": "sun.lwawt.macosx.LWCToolkit",
                "DYLD_INSERT_LIBRARIES": patchedLibPath,
                "DYLD_FORCE_FLAT_NAMESPACE": "1"
            };
            
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

            const logConsole = document.getElementById("eventLog");
            logConsole.appendChild(logMessage);
            logConsole.scrollTop = logConsole.scrollHeight;
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

            const logConsole = document.getElementById("eventLog");
            logConsole.appendChild(logMessage);
            logConsole.scrollTop = logConsole.scrollHeight;
        });
        
        launcher.on('close', () => {
            if (store.get("KeepLauncherOpen") == false || store.get("KeepLauncherOpen") == null) {
                setTimeout(() => {
                    ipcRenderer.send("quit");
                }, 5000);
            }
        });
    }
});
