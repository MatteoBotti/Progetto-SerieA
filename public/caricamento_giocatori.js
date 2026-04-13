const teamIdEl = document.getElementById("teamId");
const btn = document.getElementById("btnCarica");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

btn.addEventListener("click", async () => {
  const teamId = Number(teamIdEl.value || 7397);

  btn.disabled = true;
  setStatus("Caricamento in corso...");
  outputEl.textContent = "{}";

  try {
    const res = await fetch("/api/giocatori/carica", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId })
    });

    const data = await res.json().catch(() => ({}));
    outputEl.textContent = JSON.stringify(data, null, 2);

    if (!res.ok || data.ok === false) {
      setStatus(`Errore: ${data.error || "richiesta non riuscita"}`);
    } else {
      setStatus(
        `OK: squadra ${data.teamId} — tot ${data.total}, inseriti ${data.insertedCount}, errori ${data.failedCount}`
      );
    }
  } catch (e) {
    setStatus(`Errore di rete: ${e.message}`);
  } finally {
    btn.disabled = false;
  }
});