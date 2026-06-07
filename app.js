const API = "https://kaelion.duckdns.org";

let currentGuild = null;

// LOGIN
document.getElementById("loginBtn").onclick = () => {
  window.location.href = `${API}/auth/login`;
};

// INIT
window.onload = async () => {
  const me = await getMe();

  if (!me?.authenticated) return;

  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");

  document.getElementById("user").innerText =
    `Welcome ${me.user.username}`;

  loadGuilds();
};

// GET USER
async function getMe() {
  const res = await fetch(`${API}/api/me`, {
    credentials: "include"
  });

  if (!res.ok) return null;
  return await res.json();
}

// LOAD SERVERS
async function loadGuilds() {
  const res = await fetch(`${API}/api/guilds`, {
    credentials: "include"
  });

  const guilds = await res.json();

  const container = document.getElementById("guilds");
  container.innerHTML = "";

  guilds.forEach(g => {
    const div = document.createElement("div");
    div.className = "guild";
    div.innerText = g.name;

    div.onclick = () => openGuild(g.id);

    container.appendChild(div);
  });
}

// OPEN SERVER
async function openGuild(id) {
  currentGuild = id;

  const res = await fetch(`${API}/api/guilds/${id}`, {
    credentials: "include"
  });

  const data = await res.json();

  document.getElementById("prefix").value =
    data.guild.settings.prefix;

  document.getElementById("welcome").checked =
    data.guild.settings.welcome_enabled;

  document.getElementById("logs").checked =
    data.guild.settings.logging_enabled;
}

// SAVE
document.getElementById("saveBtn").onclick = async () => {
  if (!currentGuild) return;

  await fetch(`${API}/api/guilds/${currentGuild}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prefix: document.getElementById("prefix").value,
      welcome_enabled: document.getElementById("welcome").checked,
      logging_enabled: document.getElementById("logs").checked
    })
  });

  alert("Saved!");
};
