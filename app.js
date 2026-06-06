let token = null;

document.getElementById("loginBtn").href =
  `https://discord.com/oauth2/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(CONFIG.REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;

async function fetchToken(code) {
  const res = await fetch(`${CONFIG.API_BASE}/auth`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ code })
  });

  const data = await res.json();
  token = data.token;

  loadGuilds();
}

async function loadGuilds() {
  const res = await fetch(`${CONFIG.API_BASE}/guilds`, {
    headers: { Authorization: token }
  });

  const guilds = await res.json();

  const select = document.getElementById("guilds");
  select.innerHTML = "";

  guilds.forEach(g => {
    let opt = document.createElement("option");
    opt.value = g.id;
    opt.text = g.name;
    select.appendChild(opt);
  });

  document.getElementById("panel").style.display = "block";
}

async function saveSettings() {
  const guildId = document.getElementById("guilds").value;
  const prefix = document.getElementById("prefix").value;

  await fetch(`${CONFIG.API_BASE}/guild/${guildId}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token
    },
    body: JSON.stringify({ prefix })
  });

  alert("Saved!");
}
