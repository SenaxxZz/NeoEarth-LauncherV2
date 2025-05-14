document.getElementById("submit-login").addEventListener("click", async (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageElement = document.getElementById("message");
    const response = await axios.post("https://apiprod.neoearth-mc.fr/auth/login", {
        key: "root",
        email,
        password
    });
    const data = response.data;
    ipcRenderer.send("log", data);
    if(response.status == 200 && data.error) {
        handleLoginError(response)
    } else {
        store.set("username", data.user.username);
        store.set("uuid", data.user.uuid);
        store.set("rank", data.user.rank);
        store.set("autoLogin", true);
        store.set("KeepLauncherOpen", true);
        store.set("ramSettings", {ramMin: "1G", ramMax: "3G"});
        ipcRenderer.send("main");
    } 
});

document.getElementById("password-reset").addEventListener("click", (event) => {
    shell.openExternal("https://www.neoearth-mc.fr/profile/reset-password");
});

document.getElementById("close-login-error").addEventListener("click", () => {
    ipcRenderer.send("login");
});
document.addEventListener('DOMContentLoaded', async () => {
        if (store.get("autoLogin") == true) {
            ipcRenderer.send("main");
        } 
    });

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

function handleLoginError(response) {
    const formContainer = document.getElementById("form-container");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const messageElement = document.getElementById("message");

    document.getElementById("form-container").style.display = "none";
    emailInput.value = "";
    passwordInput.value = "";
    messageElement.style.display = "block";
    document.getElementById("error-message").textContent = response.data.error;
    document.getElementById("error-message").style.color = "red";
}