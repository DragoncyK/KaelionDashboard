const cfg = window.KAELION_DASH_CONFIG || {};
const API_BASE_URL = (cfg.API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
const DASHBOARD_TITLE = cfg.DASHBOARD_TITLE || "Kaelion Global Dashboard";
const BOT_INVITE_URL = cfg.BOT_INVITE_URL || "#";

const state = {
  me: null,
  guilds: [],
  selectedGuildId: null,
  search: "",
};

const $ = (id) => document.getElementById(id);

function setTitle() {
  $("dashboardTitle").textContent = DASHBOARD_TITLE;
  document.title = DASHBOARD_TITLE;
  $("inviteBtn").href = BOT_INVITE_URL;
}

function avatarUrl(user) {
  if (!user?.id) return null;
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const disc = Number(user.discriminator || 0) || 0;
  const idx = disc % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof data === "string" ? data : data?.detail || "Request failed";
    throw new Error(detail);
  }
  return data;
}

function showDashboard(on) {
  $("emptyState").classList.toggle("hidden", on);
  $("dashboardGrid").classList.toggle("hidden", !on);
}

function renderSession(session) {
  if (!session?.authenticated) {
    $("sessionState").textContent = "Offline";
    $("userName").textContent = "Not logged in";
    $("userMeta").textContent = "Connect with Discord";
    $("logoutBtn").hidden = true;
    $("loginBtn").hidden = false;
    $("userAvatar").textContent = "?";
    return;
  }

  const user = session.user;
  $("sessionState").textContent = "Online";
  $("userName").textContent = user.global_name || user.username;
  $("userMeta").textContent = `@${user.username} • session active`;
  $("logoutBtn").hidden = false;
  $("loginBtn").hidden = true;

  const url = avatarUrl(user);
  const avatar = $("userAvatar");
  if (url) {
    avatar.innerHTML = `<img src="${url}" alt="avatar" style="width:100%;height:100%;border-radius:16px;object-fit:cover" />`;
  } else {
    avatar.textContent = user.username?.[0]?.toUpperCase() || "U";
  }
}

function normalizeId(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function setGuildCards(guilds) {
  const list = $("guildList");
  list.innerHTML = "";

  const filtered = guilds.filter((guild) => {
    const hay = `${guild.name} ${guild.id}`.toLowerCase();
    return hay.includes(state.search.toLowerCase());
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="activity-item"><strong>No servers found</strong><div class="meta">Try another search or connect a different Discord account.</div></div>`;
    return;
  }

  filtered.forEach((guild) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `guild-card ${guild.id === state.selectedGuildId ? "active" : ""}`;
    el.innerHTML = `
      <div class="guild-icon">${guild.name?.[0]?.toUpperCase() || "#"}</div>
      <div style="text-align:left;flex:1">
        <p class="name">${guild.name}</p>
        <p class="sub">${guild.can_manage ? "Can manage" : "Read only"} • ID ${guild.id}</p>
      </div>
    `;
    el.addEventListener("click", () => selectGuild(guild.id));
    list.appendChild(el);
  });
}

function applySettingsToForm(settings) {
  const form = $("settingsForm");
  const setValue = (name, value) => {
    const field = form.elements.namedItem(name);
    if (!field) return;
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else if (field.type === "number") {
      field.value = value === null || value === undefined ? "" : String(value);
    } else if (field.tagName === "TEXTAREA") {
      if (name === "custom_json") {
        field.value = JSON.stringify(value || {}, null, 2);
      } else {
        field.value = value ?? "";
      }
    } else {
      field.value = value ?? "";
    }
  };

  Object.entries(settings).forEach(([key, value]) => setValue(key, value));
}

function collectFormPayload() {
  const form = $("settingsForm");
  const data = new FormData(form);
  const json = Object.fromEntries(data.entries());

  const checks = [
    "welcome_enabled", "goodbye_enabled", "modlog_enabled", "logging_enabled",
    "automod_enabled", "anti_links", "anti_spam", "anti_mention_spam",
    "anti_mass_mention", "levels_enabled", "economy_enabled", "security_enabled",
    "shift_enabled", "invites_enabled", "autorole_enabled",
  ];
  checks.forEach((name) => {
    json[name] = form.elements.namedItem(name).checked;
  });

  const ints = [
    "welcome_channel_id", "goodbye_channel_id", "modlog_channel_id",
    "announcements_channel_id", "suggestions_channel_id", "welcome_role_id",
  ];
  ints.forEach((name) => {
    const field = form.elements.namedItem(name);
    json[name] = normalizeId(field.value);
  });

  const customJsonField = form.elements.namedItem("custom_json");
  if (customJsonField.value.trim()) {
    try {
      json.custom_json = JSON.parse(customJsonField.value);
    } catch {
      throw new Error("Custom JSON is not valid JSON");
    }
  } else {
    json.custom_json = {};
  }

  return json;
}

function renderActivity(items) {
  const list = $("activityList");
  list.innerHTML = "";

  if (!items || !items.length) {
    list.innerHTML = `<div class="activity-item"><strong>No activity yet</strong><div class="meta">Save changes to create the first event.</div></div>`;
    return;
  }

  items.forEach((item) => {
    const before = JSON.stringify(item.before_json || {}, null, 2);
    const after = JSON.stringify(item.after_json || {}, null, 2);
    const el = document.createElement("article");
    el.className = "activity-item";
    el.innerHTML = `
      <div class="mini-row">
        <strong>${item.action}</strong>
        <span class="meta">${new Date(item.created_at).toLocaleString()}</span>
      </div>
      <div class="meta">Actor: ${item.actor_user_id}</div>
      <code>Before:
${before}

After:
${after}</code>
    `;
    list.appendChild(el);
  });
}

function setSelectedGuildHeader(guild) {
  $("selectedGuildName").textContent = guild.name;
  $("guildSubtitle").textContent = `Server ID: ${guild.id}`;
  $("guildPermissions").textContent = `Permissions: ${guild.permissions}${guild.owner ? " • owner" : ""}`;
  $("selectedGuildStatus").textContent = guild.can_edit ? "Editable" : "Read only";
  $("selectedGuildStatus").style.color = guild.can_edit ? "var(--success)" : "var(--muted)";

  const icon = $("guildIcon");
  icon.textContent = guild.name?.[0]?.toUpperCase() || "#";
}

async function loadGuildDetail(guildId) {
  const detail = await api(`/api/guilds/${guildId}`);
  const guild = detail.guild;
  const settings = guild.settings;
  setSelectedGuildHeader(guild);
  applySettingsToForm(settings);
  renderActivity(detail.recent_activity);
  $("saveBtn").disabled = false;
}

async function selectGuild(guildId) {
  state.selectedGuildId = guildId;
  setGuildCards(state.guilds);
  await loadGuildDetail(guildId);
}

async function loadGuilds() {
  state.guilds = await api("/api/guilds");
  $("guildCount").textContent = String(state.guilds.length);
  setGuildCards(state.guilds);

  if (!state.guilds.length) {
    showDashboard(false);
    return;
  }

  showDashboard(true);
  if (!state.selectedGuildId || !state.guilds.some((g) => g.id === state.selectedGuildId)) {
    state.selectedGuildId = state.guilds[0].id;
  }
  await loadGuildDetail(state.selectedGuildId);
}

async function loadSession() {
  try {
    const session = await api("/api/me");
    state.me = session;
    renderSession(session);
    $("botInviteUrl");
    return true;
  } catch {
    renderSession(null);
    return false;
  }
}

async function saveGuild() {
  if (!state.selectedGuildId) return;
  const payload = collectFormPayload();
  const response = await api(`/api/guilds/${state.selectedGuildId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadGuildDetail(state.selectedGuildId);
  toast(`Saved settings for ${response.guild_name || "the server"}`);
}

function toast(message) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  Object.assign(el.style, {
    position: "fixed",
    right: "20px",
    bottom: "20px",
    zIndex: 9999,
    padding: "14px 16px",
    borderRadius: "16px",
    background: "rgba(16, 22, 40, 0.95)",
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    color: "white",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function bindEvents() {
  $("loginBtn").href = `${API_BASE_URL}/auth/login`;
  $("logoutBtn").addEventListener("click", async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      location.reload();
    }
  });

  $("saveBtn").addEventListener("click", async () => {
    try {
      $("saveBtn").disabled = true;
      await saveGuild();
    } catch (err) {
      alert(err.message || String(err));
    } finally {
      $("saveBtn").disabled = false;
    }
  });

  $("reloadGuildBtn").addEventListener("click", async () => {
    if (!state.selectedGuildId) return;
    try {
      await loadGuildDetail(state.selectedGuildId);
      toast("Reloaded guild settings");
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  $("guildSearch").addEventListener("input", (ev) => {
    state.search = ev.target.value || "";
    setGuildCards(state.guilds);
  });

  $("settingsForm").addEventListener("submit", (ev) => ev.preventDefault());
}

async function init() {
  setTitle();
  bindEvents();
  const sessionOk = await loadSession();
  if (sessionOk) {
    try {
      await loadGuilds();
    } catch (err) {
      console.error(err);
      alert(err.message || String(err));
    }
  }

  const url = new URL(window.location.href);
  if (url.searchParams.get("login") === "success") {
    toast("Login successful");
    url.searchParams.delete("login");
    window.history.replaceState({}, document.title, url.toString());
  }
}

init();
