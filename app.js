const API = "https://kaelion.duckdns.org";

let currentGuild = null;

// LOGIN BUTTON
document.getElementById("loginBtn").onclick = () => {
  window.location.href = `${API}/auth/login`;
};

// ON LOAD
window.onload = async () => {
  const me = await getMe();

  if (me?.authenticated) {
    showDashboard(me.user);
    loadGuilds();
  }
};

// GET USER
async function getMe() {
  const res = await fetch(`${API}/api/me`, {
    credentials: "include"
  });

  if (!res.ok) return null;
  return await res.json();
}

// SHOW DASHBOARD
function showDashboard(user) {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  document.getElementById("user").innerText =
    `Logged as ${user.username}`;
}

// LOAD GUILDS
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

// OPEN GUILD
async function openGuild(id) {
  currentGuild = id;

  const res = await fetch(`${API}/api/guilds/${id}`, {
    credentials: "include"
  });

  const data = await res.json();

  document.getElementById("prefix").value =
    data.guild.settings.prefix;
}

// SAVE GUILD
document.getElementById("saveBtn").onclick = async () => {
  if (!currentGuild) return;

  const prefix = document.getElementById("prefix").value;

  await fetch(`${API}/api/guilds/${currentGuild}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prefix })
  });

  alert("Saved!");
};
