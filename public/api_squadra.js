mountNavbar("api_squadra.html");

const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

document.getElementById("run").addEventListener("click", async () => {
  const seasonApi = Number(document.getElementById("seasonApi").value || 2024);
  setStatus(statusEl, "Import in corso...");
  try {
    const { data } = await axios.post("/api/import/squadre", { seasonApi });
    setStatus(statusEl, "Import completato");
    outputEl.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    setStatus(statusEl, err?.response?.data?.error || "Errore import", true);
  }
});
