mountNavbar("notizie.html");

let page = Number(qs("page")) || 1;
let totalPages = 1;
let newsMode = "all";
let favoriteTeam = "";

const listEl = document.getElementById("news-list");
const pageLabel = document.getElementById("page-label");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const allNewsBtn = document.getElementById("all-news-btn");
const personalNewsBtn = document.getElementById("personal-news-btn");
const newsTitleEl = document.getElementById("news-title");

function updateNewsModeUi() {
  const isPersonal = newsMode === "personal";
  allNewsBtn.className = `btn ${isPersonal ? "btn-ghost" : "btn-main"}`;
  personalNewsBtn.className = `btn ${isPersonal ? "btn-main" : "btn-ghost"}`;
  newsTitleEl.textContent = isPersonal && favoriteTeam
    ? `News su ${favoriteTeam}`
    : "Tutte le news";
}

async function ensureFavoriteTeam() {
  if (favoriteTeam) return favoriteTeam;

  const authUser = getAuthUser();
  if (authUser?.squadraPreferita) {
    favoriteTeam = String(authUser.squadraPreferita || "").trim();
    return favoriteTeam;
  }

  const profile = await fetchUserProfile();
  favoriteTeam = String(profile?.user?.squadraPreferita || "").trim();
  return favoriteTeam;
}

async function loadNotizie() {
  try {
    const params = { page, limit: 3 };
    if (newsMode === "personal" && favoriteTeam) {
      params.team = favoriteTeam;
    }

    const { data } = await axios.get("/api/notizie", { params });
    totalPages = Number(data.totalPages || 1);
    pageLabel.textContent = `Pagina ${page} di ${totalPages}`;

    const items = data.data || [];
    if (!items.length) {
      listEl.innerHTML = `<div class="card pad">Nessuna notizia disponibile.</div>`;
      return;
    }

    listEl.innerHTML = items.map((n) => `
      <article class="card pad news-card" onclick="location.href='notizia.html?id=${n.id}'">
        ${n.link_immagine ? `<img src="${n.link_immagine}" alt="${n.titolo}" />` : ""}
        <h4>${n.titolo}</h4>
        <p class="muted">${String(n.contenuto || "").slice(0, 160)}...</p>
        <small class="muted">${fmtDate(n.data_pubblicazione)}</small>
      </article>
    `).join("");
  } catch (err) {
    listEl.innerHTML = `<div class="card pad">Errore caricamento notizie.</div>`;
  }
}

allNewsBtn.addEventListener("click", async () => {
  newsMode = "all";
  page = 1;
  updateNewsModeUi();
  await loadNotizie();
});

personalNewsBtn.addEventListener("click", async () => {
  try {
    const team = await ensureFavoriteTeam();
    if (!team) {
      window.alert("Nessuna squadra preferita associata al profilo.");
      return;
    }

    favoriteTeam = team;
    newsMode = "personal";
    page = 1;
    updateNewsModeUi();
    await loadNotizie();
  } catch (_err) {
    window.alert("Impossibile recuperare la squadra preferita dell'utente.");
  }
});

prevBtn.addEventListener("click", () => {
  if (page > 1) {
    page--;
    loadNotizie();
  }
});

nextBtn.addEventListener("click", () => {
  if (page < totalPages) {
    page++;
    loadNotizie();
  }
});

updateNewsModeUi();
loadNotizie();
