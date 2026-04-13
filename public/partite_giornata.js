mountNavbar("partite_giornata.html");

const giornataEl = document.getElementById("giornata");
const annoEl = document.getElementById("anno");
const statusEl = document.getElementById("status");
const tbody = document.getElementById("tbody");

giornataEl.innerHTML = Array.from({ length: 38 }, (_, i) =>
  `<option value="${i + 1}">Giornata ${i + 1}</option>`
).join("");

async function loadPartiteGiornata() {
  const giornata = Number(giornataEl.value);
  const anno = Number(annoEl.value || 2025);
  try {
    const { data } = await axios.get("/api/partite/giornata", { params: { giornata, anno } });
    setStatus(statusEl, `Stagione ${data.stagione} - giornata ${data.giornata}`);
    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = "<tr><td colspan='5'>Nessuna partita trovata.</td></tr>";
      return;
    }

    tbody.innerHTML = rows.map((m) => `
      <tr>
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

function cambiaGiornata(delta) {
  const giornataCorrente = Number(giornataEl.value || 1);
  const nuovaGiornata = Math.min(38, Math.max(1, giornataCorrente + delta));
  giornataEl.value = nuovaGiornata;
  loadPartiteGiornata();
}

document.getElementById("show").addEventListener("click", loadPartiteGiornata);
document.getElementById("prev").addEventListener("click", () => {
  cambiaGiornata(-1);
});
document.getElementById("next").addEventListener("click", () => {
  cambiaGiornata(1);
});

loadPartiteGiornata();
