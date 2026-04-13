mountNavbar("partite_stadio.html");

const stadioEl = document.getElementById("stadio");
const annoEl = document.getElementById("anno");
const statusEl = document.getElementById("status");
const tbody = document.getElementById("tbody");
const stadioImageEl = document.getElementById("stadio-image");
const stadioNameEl = document.getElementById("stadio-name");
const stadioCoordsEl = document.getElementById("stadio-coords");
const stadioCapienzaEl = document.getElementById("stadio-capienza");
const stadiById = new Map();

const STADI_IMAGE_BY_ID = {
  109: "juventus.jpg",
  487: "pisa.jpg",
  115: "udinese.jpg",
  471: "sassuolo.jpg",
  104: "cagliari.jpg",
  99: "fiorentina.jpg",
  102: "atalanta.jpg",
  445: "empoli.jpg",
  5911: "monza.jpg",
  107: "genoa.jpg",
  5890: "lecce.jpg",
  112: "parma.jpg",
  457: "cremonese.jpg",
  98: "sansiro.jpg",
  108: "sansiro.jpg",
  7397: "como.jpg",
  450: "verona.jpg",
  100: "olimpico.jpg",
  110: "olimpico.jpg",
  586: "torino.jpg",
  454: "venezia.jpg",
  103: "bologna.jpg",
  113: "napoli.jpg"
};

const DEFAULT_STADIUM_IMAGE = "stadi/olimpico.jpg";

function renderStadioDetails(stadio) {
  if (!stadio) return;

  stadioNameEl.textContent = stadio.nome_stadio || "-";

  const lat = Number(stadio.latitudine);
  const lon = Number(stadio.longitudine);
  stadioCoordsEl.textContent = Number.isFinite(lat) && Number.isFinite(lon)
    ? `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    : "Non disponibili";

  const capienza = Number(stadio.capienza);
  stadioCapienzaEl.textContent = Number.isFinite(capienza)
    ? capienza.toLocaleString("it-IT")
    : "Non disponibile";

  const imageFile = STADI_IMAGE_BY_ID[Number(stadio.id_stadio)];
  stadioImageEl.src = imageFile ? `stadi/${imageFile}` : DEFAULT_STADIUM_IMAGE;
  stadioImageEl.alt = `Immagine ${stadio.nome_stadio || "stadio"}`;
}

async function loadStadi() {
  const { data } = await axios.get("/api/stadi");
  const stadi = data.data || [];
  stadi.forEach((s) => stadiById.set(Number(s.id_stadio), s));
  stadioEl.innerHTML = stadi.map((s) =>
    `<option value="${s.id_stadio}">${s.nome_stadio}</option>`
  ).join("");

  renderStadioDetails(stadi[0]);
}

async function loadPartiteStadio() {
  const stadioId = Number(stadioEl.value);
  const anno = Number(annoEl.value || 2025);
  try {
    const { data } = await axios.get("/api/partite/stadio", { params: { stadio_id: stadioId, anno } });
    setStatus(statusEl, `${data.stadio.nome_stadio} - stagione ${data.stagione}`);
    const stadioMerged = { ...(stadiById.get(stadioId) || {}), ...(data.stadio || {}) };
    renderStadioDetails(stadioMerged);
    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Nessuna partita trovata.</td></tr>";
      return;
    }

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td>${fmtDate(m.data)}</td>
        <td><span class="team"><img src="logos/${logoFromTeam(m.casa)}" alt="${m.casa}" />${m.casa}</span></td>
        <td><span class="team"><img src="logos/${logoFromTeam(m.trasferta)}" alt="${m.trasferta}" />${m.trasferta}</span></td>
        <td class="center">${m.gol_casa ?? "-"} - ${m.gol_trasferta ?? "-"}</td>
      </tr>
    `).join("");
  } catch (err) {
    setStatus(statusEl, "Errore caricamento partite", true);
  }
}

function cambiaStadio(delta) {
  if (!stadioEl.options.length) return;

  const nuovoStadio = Math.min(
    stadioEl.options.length - 1,
    Math.max(0, stadioEl.selectedIndex + delta)
  );
  stadioEl.selectedIndex = nuovoStadio;
  loadPartiteStadio();
}

document.getElementById("show").addEventListener("click", loadPartiteStadio);
stadioEl.addEventListener("change", loadPartiteStadio);
document.getElementById("prev").addEventListener("click", () => {
  cambiaStadio(-1);
});
document.getElementById("next").addEventListener("click", () => {
  cambiaStadio(1);
});

(async () => {
  try {
    await loadStadi();
    await loadPartiteStadio();
  } catch {
    setStatus(statusEl, "Errore caricamento stadi", true);
  }
})();
