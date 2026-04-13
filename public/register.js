mountNavbar("register.html");

const form = document.getElementById("register-form");
const statusEl = document.getElementById("status");
const squadraSelect = document.getElementById("squadraPreferita");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("change", () => {
    passwordInput.type = togglePassword.checked ? "text" : "password";
  });
}

async function loadSquadre() {
  try {
    const { data } = await axios.get("/api/auth/squadre-preferite");
    const squadre = Array.isArray(data?.data) ? data.data : [];
    squadraSelect.innerHTML = [
      "<option value=\"\">Seleziona una squadra</option>",
      ...squadre.map((s) => "<option value=\"" + s + "\">" + s + "</option>")
    ].join("");
  } catch (_err) {
    setStatus(statusEl, "Errore caricamento squadre", true);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(statusEl, "Registrazione in corso...");

  const formData = new FormData(form);
  const payload = {
    nome: String(formData.get("nome") || "").trim(),
    cognome: String(formData.get("cognome") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    squadraPreferita: String(formData.get("squadraPreferita") || "").trim()
  };

  try {
    await axios.post("/api/auth/register", payload);
    setStatus(statusEl, "Registrazione completata. Ora puoi accedere.");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 900);
  } catch (err) {
    const msg = err?.response?.data?.error || "Errore durante la registrazione";
    setStatus(statusEl, msg, true);
  }
});

loadSquadre();
