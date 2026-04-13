mountNavbar("partite_squadra.html");

const squadraEl = document.getElementById("squadra");
const annoEl = document.getElementById("anno");
const statusEl = document.getElementById("status");
const tbody = document.getElementById("tbody");

async function loadSquadre() {
  const { data } = await axios.get("/api/squadre");
  squadraEl.innerHTML = (data.data || []).map((t) =>
    `<option value="${t.id_squadra}">${t.nome_squadra}</option>`
  ).join("");
}

async function loadPartiteSquadra() {
  const squadraId = Number(squadraEl.value);
  const anno = Number(annoEl.value || 2025);
  try {
    const { data } = await axios.get("/api/partite/squadra", { params: { squadra_id: squadraId, anno } });
    setStatus(statusEl, `${data.squadra.nome_squadra} - stagione ${data.stagione}`);
    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='6'>Nessuna partita trovata.</td></tr>";
      return;
    }

    tbody.innerHTML = rows.map((m) => `
      <tr>
        <td class="center">${m.giornata}</td>
        <td>${fmtDate(m.data)}</td>
        <td><span class="team"><img src="logos/${logoFromTeam(m.casa)}" alt="${m.casa}" />${m.casa}</span></td>
        <td><span class="team"><img src="logos/${logoFromTeam(m.trasferta)}" alt="${m.trasferta}" />${m.trasferta}</span></td>
        <td class="center">${m.gol_casa ?? "-"} - ${m.gol_trasferta ?? "-"}</td>
        <td>${m.nome_stadio || "-"}</td>
      </tr>
    `).join("");
  } catch (err) {
    setStatus(statusEl, "Errore caricamento partite", true);
  }
}

function cambiaSquadra(delta) {
  if (!squadraEl.options.length) return;

  const nuovaSquadra = Math.min(
    squadraEl.options.length - 1,
    Math.max(0, squadraEl.selectedIndex + delta)
  );
  squadraEl.selectedIndex = nuovaSquadra;
  loadPartiteSquadra();
}

document.getElementById("show").addEventListener("click", loadPartiteSquadra);
document.getElementById("prev").addEventListener("click", () => {
  cambiaSquadra(-1);
});
document.getElementById("next").addEventListener("click", () => {
  cambiaSquadra(1);
});

(async () => {
  try {
    await loadSquadre();
    await loadPartiteSquadra();
  } catch {
    setStatus(statusEl, "Errore caricamento squadre", true);
  }
})();
