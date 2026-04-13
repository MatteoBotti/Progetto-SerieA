mountNavbar("classifica.html");

const annoInput = document.getElementById("anno");
const stagioneLabel = document.getElementById("stagione-label");
const tbody = document.getElementById("tbody");

const startAnno = Number(qs("anno")) || 2025;
annoInput.value = startAnno;

function badgeByPosition(pos, total, stagione) {
  if (pos === 1) return "logos/scudetto.png";
  if (pos >= 2 && pos <= 4) return "logos/champions.png";
  if ((stagione === "2024/2025" && (pos === 5 || pos === 9)) || (stagione === "2025/2026" && pos === 5)) return "logos/europa.png";
  if (pos === 6) return "logos/conference.png";
  if (pos > total - 3) return "logos/retrocessione.png";
  return "";
}

async function loadClassifica() {
  const anno = Number(annoInput.value || 2025);
  try {
    const { data } = await axios.get("/api/classifica", { params: { anno } });
    stagioneLabel.textContent = `Stagione ${data.stagione}`;

    const rows = data.data || [];
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">Nessuna partita disponibile.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((r, i) => {
      const pos = i + 1;
      const badge = badgeByPosition(pos, rows.length, data.stagione);
      return `
        <tr>
          <td>${pos}${badge ? ` <img src="${badge}" class="pos-badge" alt="badge"/>` : ""}</td>
          <td>
            <span class="team">
              <img src="logos/${logoFromTeam(r.nome_squadra)}" alt="${r.nome_squadra}" />
              <span>${r.nome_squadra}</span>
            </span>
          </td>
          <td class="center">${r.punti}</td>
          <td class="center">${r.gol_fatti}</td>
          <td class="center">${r.gol_subiti}</td>
          <td class="center">${r.differenza_reti}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    stagioneLabel.textContent = "Errore caricamento classifica.";
    stagioneLabel.classList.add("error");
    tbody.innerHTML = "";
  }
}

document.getElementById("show").addEventListener("click", loadClassifica);
document.getElementById("prev").addEventListener("click", () => {
  annoInput.value = Number(annoInput.value || 2025) - 1;
  loadClassifica();
});
document.getElementById("next").addEventListener("click", () => {
  annoInput.value = Number(annoInput.value || 2025) + 1;
  loadClassifica();
});

loadClassifica();
