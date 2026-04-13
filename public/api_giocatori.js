mountNavbar("api_giocatori.html");

const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const teamSelectEl = document.getElementById("teamId");

async function loadTeamOptions() {
  try {
    const { data } = await axios.get("/api/squadre");
    const teams = Array.isArray(data?.data) ? data.data : [];

    teamSelectEl.innerHTML = teams.map(
      (team) => "<option value=\"" + team.id_squadra + "\">" + team.id_squadra + " - " + team.nome_squadra + "</option>"
    ).join("");

    if (!teams.length) {
      teamSelectEl.innerHTML = "<option value=\"\">Nessuna squadra disponibile</option>";
      teamSelectEl.disabled = true;
      setStatus(statusEl, "Nessuna squadra trovata nella tabella squadra", true);
    }
  } catch (err) {
    teamSelectEl.innerHTML = "<option value=\"\">Errore caricamento squadre</option>";
    teamSelectEl.disabled = true;
    setStatus(statusEl, err?.response?.data?.error || "Errore caricamento squadre", true);
  }
}

document.getElementById("run").addEventListener("click", async () => {
  const teamId = Number(teamSelectEl.value || 0);
  if (!teamId) {
    setStatus(statusEl, "Seleziona una squadra valida", true);
    return;
  }
  setStatus(statusEl, "Import in corso...");
  try {
    const { data } = await axios.post("/api/import/giocatori", { teamId });
    setStatus(statusEl, "Import completato");
    outputEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    setStatus(statusEl, err?.response?.data?.error || "Errore import", true);
  }
});

loadTeamOptions();
