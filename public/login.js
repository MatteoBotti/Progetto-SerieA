mountNavbar("login.html");

const form = document.getElementById("login-form");
const statusEl = document.getElementById("status");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("toggle-password");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("change", () => {
    passwordInput.type = togglePassword.checked ? "text" : "password";
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(statusEl, "Verifica credenziali...");

  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  try {
    const { data } = await axios.post("/api/auth/login", { email, password });
    localStorage.setItem("auth_user", JSON.stringify(data.user));

    const next = qs("next");
    if (next && !next.includes("login.html") && !next.includes("register.html")) {
      window.location.href = next;
      return;
    }
    window.location.href = "index.html";
  } catch (err) {
    let msg = err?.response?.data?.error || "Errore durante il login";
    if (err?.response?.status === 404) {
      msg = "Endpoint login non trovato: riavvia il server backend";
    } else if (!err?.response) {
      msg = "Backend non raggiungibile: verifica che il server sia avviato";
    }
    setStatus(statusEl, msg, true);
  }
});
