const teamIdEl = document.getElementById("teamId");
const seasonApiEl = document.getElementById("seasonApi");
const stagioneEl = document.getElementById("stagione");
const btn = document.getElementById("btnCarica");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

btn.addEventListener("click", async () => {
  const teamId = Number(teamIdEl.value || 7397);
  const seasonApi = Number(seasonApiEl.value || 2025);
  const stagione = String(stagioneEl.value || "2025/2026").trim();

  btn.disabled = true;
  setStatus("Caricamento in corso...");
  outputEl.textContent = "{}";

  try {
    const res = await fetch("/api/partite/carica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, seasonApi, stagione })
    });

    const data = await res.json().catch(() => ({}));
    outputEl.textContent = JSON.stringify(data, null, 2);

    if (!res.ok || data.ok === false) {
      setStatus(`Errore: ${data.error || "richiesta non riuscita"}`);
    } else {
      setStatus(
        `OK: team ${data.teamId} — inserite/aggiornate ${data.insertedOrUpdatedCount}, errori ${data.failedCount}`
      );
    }
  } catch (e) {
    setStatus(`Errore di rete: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
});