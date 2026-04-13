mountNavbar("notizie.html");

const detailEl = document.getElementById("news-detail");

async function loadNotizia() {
  const id = Number(qs("id"));
  if (!id) {
    detailEl.innerHTML = "<h2>Notizia non trovata</h2>";
    return;
  }

  try {
    const { data } = await axios.get(`/api/notizie/${id}`);
    const n = data.data;
    document.title = n.titolo;

    detailEl.innerHTML = `
      <h1>${n.titolo}</h1>
      <p class="muted">${fmtDateTime(n.data_pubblicazione)}</p>
      ${n.link_immagine ? `<img src="${n.link_immagine}" alt="${n.titolo}" style="max-width:100%;border-radius:10px" />` : ""}
      <p style="white-space:pre-line">${n.contenuto || ""}</p>
    `;
  } catch (err) {
    detailEl.innerHTML = "<h2>Errore caricamento notizia</h2>";
  }
}

loadNotizia();
