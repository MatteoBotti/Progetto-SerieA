mountNavbar("index.html");

async function loadHomeNews() {
  const container = document.getElementById("news-home");
  try {
    const { data } = await axios.get("/api/notizie/home", { params: { limit: 3 } });
    const news = data.data || [];
    if (!news.length) {
      container.innerHTML = `<div class="card pad">Nessuna notizia disponibile.</div>`;
      return;
    }

    container.innerHTML = news.map((n) => {
      const preview = String(n.contenuto || "").slice(0, 150);
      return `
        <article class="card pad news-card" onclick="location.href='notizia.html?id=${n.id}'">
          ${n.link_immagine ? `<img src="${n.link_immagine}" alt="${n.titolo}" />` : ""}
          <h4>${n.titolo}</h4>
          <p class="muted">${preview}${preview.length >= 150 ? "..." : ""}</p>
          <small class="muted">${fmtDate(n.data_pubblicazione)}</small>
        </article>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div class="card pad">Errore caricamento notizie.</div>`;
  }
}

loadHomeNews();
