mountNavbar("area_utente.html");

const statusEl = document.getElementById("user-area-status");
const detailsEl = document.getElementById("user-profile-details");
const favoriteTeamEl = document.getElementById("favorite-team-panel");
const emailForm = document.getElementById("user-email-form");
const passwordForm = document.getElementById("user-password-form");
const currentEmailInput = document.getElementById("user-current-email");
const emailInput = document.getElementById("user-email-input");

function refreshMenuUserLabel() {
  const user = getAuthUser();
  const menuUser = document.querySelector(".menu-user");
  if (!user || !menuUser) return;
  menuUser.textContent = `${user.nome || ""} ${user.cognome || ""} (${String(user.ruolo || "user")})`;
}

function getProfileErrorMessage(err, fallback) {
  if (err?.response?.status === 404) {
    return "Endpoint area utente non trovato: riavvia il server backend";
  }
  return err?.response?.data?.error || err?.message || fallback;
}

async function loadProfilePage() {
  try {
    setStatus(statusEl, "Caricamento area utente...");
    const data = await fetchUserProfile();
    renderProfileDetails(detailsEl, data?.user);
    renderFavoriteTeam(favoriteTeamEl, data?.squadraPreferita || null, data?.user?.squadraPreferita || "");
    if (emailInput && data?.user?.email) {
      emailInput.value = "";
    }
    if (currentEmailInput && data?.user?.email) {
      currentEmailInput.value = data.user.email;
    }
    refreshMenuUserLabel();
    setStatus(statusEl, "Area utente aggiornata");
  } catch (err) {
    renderFavoriteTeam(favoriteTeamEl, null);
    setStatus(statusEl, getProfileErrorMessage(err, "Impossibile caricare l'area utente"), true);
  }
}

emailForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(emailForm);
  const currentEmail = String(formData.get("currentEmail") || "").trim().toLowerCase();
  const newEmail = String(formData.get("newEmail") || "").trim();
  const authUser = getAuthUser();

  if (currentEmail !== String(authUser?.email || "").trim().toLowerCase()) {
    const message = "L'email attuale non corrisponde";
    setStatus(statusEl, message, true);
    window.alert(message);
    return;
  }

  try {
    setStatus(statusEl, "Aggiornamento email...");
    const data = await updateUserEmail(newEmail);
    renderProfileDetails(detailsEl, data?.user);
    refreshMenuUserLabel();
    if (currentEmailInput && data?.user?.email) {
      currentEmailInput.value = data.user.email;
    }
    if (emailInput) {
      emailInput.value = "";
    }
    setStatus(statusEl, data?.message || "Email aggiornata");
    window.alert(data?.message || "Email aggiornata con successo");
  } catch (err) {
    setStatus(statusEl, getProfileErrorMessage(err, "Errore aggiornando email"), true);
  }
});

passwordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(passwordForm);

  try {
    setStatus(statusEl, "Aggiornamento password...");
    const data = await updateUserPassword(
      String(formData.get("currentPassword") || ""),
      String(formData.get("newPassword") || "")
    );
    passwordForm.reset();
    setStatus(statusEl, data?.message || "Password aggiornata");
    window.alert(data?.message || "Password aggiornata con successo");
  } catch (err) {
    const message = getProfileErrorMessage(err, "Errore aggiornando password");
    setStatus(statusEl, message, true);
    if (err?.response?.status === 401) {
      window.alert("La password attuale e' sbagliata");
    }
  }
});

loadProfilePage();
