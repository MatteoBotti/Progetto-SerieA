const NAV_ITEMS_COMMON = [
  { href: "index.html", label: "Home" },
  { href: "area_utente.html", label: "Area utente" },
  { href: "notizie.html", label: "Notizie" },
  { href: "classifica.html", label: "Classifica" },
  { href: "giocatori_squadra.html", label: "Giocatori per squadra" },
  { href: "partite_giornata.html", label: "Partite per giornata" },
  { href: "partite_squadra.html", label: "Partite per squadra" },
  { href: "partite_stadio.html", label: "Partite per stadio" }
];

const NAV_ITEMS_ADMIN = [
  { href: "api_squadra.html", label: "Import squadre" },
  { href: "api_stadio.html", label: "Import stadi" },
  { href: "api_giocatori.html", label: "Import giocatori" },
  { href: "api_partite.html", label: "Import partite" }
];

const PUBLIC_PAGES = new Set(["login.html", "register.html"]);
const ADMIN_PAGES = new Set(NAV_ITEMS_ADMIN.map((item) => item.href));

// Recupera l'utente salvato nel localStorage dopo il login.
function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem("auth_user") || "null");
  } catch (_err) {
    return null;
  }
}

// Rimuove i dati dell'utente salvati nel browser.
function clearAuthUser() {
  localStorage.removeItem("auth_user");
}

// Salva i dati dell'utente nel localStorage.
function saveAuthUser(user) {
  localStorage.setItem("auth_user", JSON.stringify(user));
}

// Reindirizza alla pagina di login mantenendo la pagina richiesta come destinazione.
function redirectToLogin() {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.href = `login.html?next=${encodeURIComponent(next)}`;
}

// Crea l'HTML della navbar in base alla pagina corrente e al ruolo dell'utente.
function createNavbar(currentFile) {
  const user = getAuthUser();
  const role = String(user?.ruolo || "user").toLowerCase();
  const navItems = role === "admin"
    ? [...NAV_ITEMS_COMMON, ...NAV_ITEMS_ADMIN]
    : NAV_ITEMS_COMMON;

  const links = navItems.map((item) => {
    const active = item.href === currentFile ? "active" : "";
    return `<a class="${active}" href="${item.href}">${item.label}</a>`;
  }).join("");

  const userInfo = user
    ? `<div class="menu-user muted">${user.nome || ""} ${user.cognome || ""} (${role})</div>`
    : "";

  return `
    <header class="topbar">
      <div class="shell topbar-inner">
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-menu" aria-label="Apri menu">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <a class="brand" href="index.html">
          <img src="logos/serie_a.png" alt="Serie A logo" />
          <span>Serie A Center</span>
        </a>
        <div class="topbar-spacer" aria-hidden="true"></div>
      </div>
      <nav id="site-menu" class="menu-drawer" hidden>
        <div class="menu">
          ${links}
          ${userInfo}
          <button id="logout-btn" class="btn btn-ghost" type="button">Logout</button>
        </div>
      </nav>
    </header>
  `;
}

// Converte caratteri HTML speciali in testo sicuro da inserire con innerHTML.
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    };
    return map[char] || char;
  });
}

// Formatta la capienza dello stadio con separatori italiani.
function formatCapienza(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "-";
  return n.toLocaleString("it-IT");
}

// Mostra nella pagina i dati principali del profilo utente.
function renderProfileDetails(container, user) {
  if (!container || !user) return;
  container.innerHTML = `
    <div><dt>Nome</dt><dd>${escapeHtml(user.nome || "-")}</dd></div>
    <div><dt>Cognome</dt><dd>${escapeHtml(user.cognome || "-")}</dd></div>
    <div><dt>Email</dt><dd>${escapeHtml(user.email || "-")}</dd></div>
    <div><dt>Ruolo</dt><dd>${escapeHtml(String(user.ruolo || "user"))}</dd></div>
  `;
}

// Mostra la squadra preferita dell'utente e i dettagli collegati.
function renderFavoriteTeam(container, team, fallbackName = "") {
  if (!container) return;
  const teamName = team?.nome || fallbackName || "";

  if (!team && !teamName) {
    container.innerHTML = `<p class="muted">Nessuna squadra preferita associata al profilo.</p>`;
    return;
  }

  const city = team?.citta || "";

  container.innerHTML = `
    <div class="favorite-team-head">
      ${teamName ? `<img src="logos/${logoFromTeam(teamName)}" alt="${escapeHtml(teamName)}" />` : ""}
      <div>
        <strong>${escapeHtml(teamName || "-")}</strong>
        <div class="muted">${escapeHtml(city || "Squadra preferita dell'utente loggato")}</div>
      </div>
    </div>
    <dl class="user-data-list compact">
      <div><dt>Fondazione</dt><dd>${escapeHtml(team?.annoFondazione || "-")}</dd></div>
      <div><dt>Stadio</dt><dd>${escapeHtml(team?.stadio || "-")}</dd></div>
      <div><dt>Indirizzo</dt><dd>${escapeHtml(team?.indirizzoStadio || "-")}</dd></div>
      <div><dt>Capienza</dt><dd>${escapeHtml(formatCapienza(team?.capienzaStadio))}</dd></div>
    </dl>
  `;
}

// Scarica dal server il profilo dell'utente loggato e aggiorna il localStorage.
async function fetchUserProfile() {
  const user = getAuthUser();
  if (!user?.id) {
    throw new Error("Utente non autenticato");
  }

  const { data } = await axios.get("/api/auth/profile", {
    params: { userId: user.id }
  });

  if (data?.user) {
    saveAuthUser(data.user);
  }

  return data;
}

// Aggiorna l'email dell'utente loggato tramite API.
async function updateUserEmail(email) {
  const user = getAuthUser();
  const { data } = await axios.patch("/api/auth/profile/email", {
    userId: user.id,
    email
  });

  if (data?.user) {
    saveAuthUser(data.user);
  }

  return data;
}

// Aggiorna la password dell'utente loggato tramite API.
async function updateUserPassword(currentPassword, newPassword) {
  const user = getAuthUser();
  const { data } = await axios.patch("/api/auth/profile/password", {
    userId: user.id,
    currentPassword,
    newPassword
  });

  return data;
}

// Collega gli eventi della navbar: menu mobile, chiusura e logout.
function setupNavbar(target) {
  const toggle = target.querySelector(".menu-toggle");
  const menu = target.querySelector("#site-menu");
  const logoutBtn = target.querySelector("#logout-btn");
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = !menu.hidden;
    menu.hidden = isOpen;
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  menu.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.tagName === "A") {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", (event) => {
    if (!target.contains(event.target) && !menu.hidden && window.innerWidth < 981) {
      closeMenu();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearAuthUser();
      window.location.href = "login.html";
    });
  }
}

// Monta la navbar nella pagina e gestisce i redirect per login/admin.
function mountNavbar(file) {
  const user = getAuthUser();
  const role = String(user?.ruolo || "user").toLowerCase();

  if (!PUBLIC_PAGES.has(file) && !user) {
    redirectToLogin();
    return;
  }

  if (PUBLIC_PAGES.has(file) && user) {
    window.location.href = "index.html";
    return;
  }

  if (ADMIN_PAGES.has(file) && role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  const target = document.getElementById("navbar-slot");
  if (target) {
    target.innerHTML = createNavbar(file);
    setupNavbar(target);
  }
}

// Converte il nome squadra nel nome file del logo.
function logoFromTeam(teamName) {
  return String(teamName || "").trim().toLowerCase().replace(/\s+/g, "_") + ".png";
}

// Formatta una data in formato italiano.
function fmtDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("it-IT");
}

// Formatta data e ora in formato italiano.
function fmtDateTime(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString("it-IT");
}

// Legge un parametro dalla query string della pagina.
function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// Mostra un messaggio di stato e applica lo stile di errore quando necessario.
function setStatus(el, message, isError = false) {
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", Boolean(isError));
}
