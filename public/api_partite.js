mountNavbar("api_partite.html");

const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const seasonApiEl = document.getElementById("seasonApi");
const stagioneEl = document.getElementById("stagione");
const runBtn = document.getElementById("run");
let teamIds = [98,99,100,102,103,104,107,108,109,110,112,113,115,450,457,471,487,586,5890,7397];
let importInProgress = false;
const REQUEST_DELAY_MS = 4000;
const RETRY_DELAY_MS = 15000;
const MAX_RETRIES = 4;
const BATCH_SIZE = 5;
const BATCH_PAUSE_MS = 30000;

function getImportErrorMessage(err) {
  if (err?.response?.status === 403) {
    return "Richiesta fallita 403: l'API football-data ha rifiutato l'import. Controlla token, permessi o limiti di richieste.";
  }
  return err?.response?.data?.error || "Errore import";
}

function buildStagioneFromSeasonApi(seasonApi) {
  const startYear = Number(seasonApi);
  if (!Number.isFinite(startYear) || startYear < 2000 || startYear > 2100) {
    return "";
  }
  return `${startYear}/${startYear + 1}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function importMatchesForTeam(teamId, seasonApi, stagione, attempt = 0) {
  try {
    const { data } = await axios.post("/api/import/partite", { teamId, seasonApi, stagione });
    return data;
  } catch (err) {
    if (err?.response?.status === 429 && attempt < MAX_RETRIES) {
      setStatus(
        statusEl,
        `Limite richieste raggiunto per squadra ${teamId}. Nuovo tentativo tra ${RETRY_DELAY_MS / 1000}s...`,
        true
      );
      await sleep(RETRY_DELAY_MS);
      return importMatchesForTeam(teamId, seasonApi, stagione, attempt + 1);
    }
    throw err;
  }
}

async function importAllMatches() {
  if (importInProgress) {
    setStatus(statusEl, "Import gia in corso...", true);
    return;
  }

  const seasonApi = Number(seasonApiEl.value || 2025);
  const stagione = String(stagioneEl.value || buildStagioneFromSeasonApi(seasonApi)).trim();

  if (!Number.isFinite(seasonApi) || seasonApi < 2000 || seasonApi > 2100) {
    setStatus(statusEl, "Season API non valida", true);
    return;
  }

  if (!stagione) {
    setStatus(statusEl, "Stagione DB non valida", true);
    return;
  }

  if (!teamIds.length) {
    setStatus(statusEl, "Nessun ID squadra disponibile per l'import", true);
    return;
  }

  importInProgress = true;
  runBtn.disabled = true;
  outputEl.textContent = "";

  const results = [];

  try {
    for (let i = 0; i < teamIds.length; i++) {
      const teamId = teamIds[i];
      setStatus(statusEl, `Import partite ${i + 1}/${teamIds.length} in corso per squadra ${teamId}...`);
      const data = await importMatchesForTeam(teamId, seasonApi, stagione);
      results.push(data);

      const isLast = i === teamIds.length - 1;
      const completedInBatch = (i + 1) % BATCH_SIZE === 0;

      if (!isLast && completedInBatch) {
        setStatus(
          statusEl,
          `Pausa tecnica dopo ${i + 1} squadre per evitare il rate limit...`
        );
        await sleep(BATCH_PAUSE_MS);
      }

      if (i < teamIds.length - 1) {
        await sleep(REQUEST_DELAY_MS);
      }
    }

    const summary = {
      ok: true,
      seasonApi,
      stagione,
      totalTeamIds: teamIds.length,
      importedTeams: results.length,
      totalApiMatches: results.reduce((sum, item) => sum + Number(item?.totalApiMatches || 0), 0),
      insertedOrUpdated: results.reduce((sum, item) => sum + Number(item?.insertedOrUpdated || 0), 0),
      skipped: results.flatMap((item) => Array.isArray(item?.skipped) ? item.skipped : []),
      details: results
    };

    setStatus(statusEl, `Import completato per ${results.length} squadre`);
    outputEl.textContent = JSON.stringify(summary, null, 2);
  } catch (err) {
    setStatus(statusEl, getImportErrorMessage(err), true);
  } finally {
    importInProgress = false;
    runBtn.disabled = false;
  }
}

seasonApiEl.addEventListener("change", () => {
  const stagione = buildStagioneFromSeasonApi(seasonApiEl.value);
  if (stagione) {
    stagioneEl.value = stagione;
  }
});

runBtn.addEventListener("click", importAllMatches);
