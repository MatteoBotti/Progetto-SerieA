mountNavbar("giocatori_squadra.html");

const squadraSelect = document.getElementById("squadra");
const teamNameEl = document.getElementById("team-name");
const tbody = document.getElementById("tbody");

async function loadSquadre() {
  const { data } = await axios.get("/api/squadre");
  const teams = data.data || [];
  squadraSelect.innerHTML = teams.map((t) =>
    `<option value="${t.id_squadra}">${t.nome_squadra}</option>`
  ).join("");
}

async function loadGiocatori() {
  const squadraId = Number(squadraSelect.value);
  if (!squadraId) return;

  try {
    const { data } = await axios.get("/api/giocatori", { params: { squadra_id: squadraId } });
    const squadra = data.squadra;
    teamNameEl.innerHTML = `
      <span class="team">
        <img src="logos/${logoFromTeam(squadra.nome_squadra)}" alt="${squadra.nome_squadra}" />
        <strong>${squadra.nome_squadra}</strong>
      </span>
    `;

    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='4'>Nessun giocatore trovato.</td></tr>";
      return;
    }

    tbody.innerHTML = rows.map((p) => `
      <tr>
        <td>${p.nome || ""}</td>
        <td>${p.cognome || ""}</td>
        <td>${p.ruolo || "-"}</td>
        <td>${p.nazionalita || "-"}</td>
      </tr>
    `).join("");
  } catch (err) {
    setStatus(teamNameEl, "Errore caricamento giocatori", true);
  }
}

document.getElementById("show").addEventListener("click", loadGiocatori);

(async () => {
  try {
    await loadSquadre();
    await loadGiocatori();
  } catch {
    setStatus(teamNameEl, "Errore caricamento squadre", true);
  }
})();
