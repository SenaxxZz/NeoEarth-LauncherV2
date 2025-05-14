document.getElementById("disconnect").addEventListener("click", () => {
    store.clear();
    ipcRenderer.send("login");
})
document.getElementById("disconnect").addEventListener("click", () => {
    store.clear();
    ipcRenderer.send("login");
})

