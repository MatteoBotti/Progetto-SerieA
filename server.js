require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const { promisify } = require("util");
const pool = require("./db");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = Number(process.env.PORT || 3000);
const API_BASE = "https://api.football-data.org/v4";
// Usiamo scrypt di Node per trasformare la password in un hash non reversibile.
const scryptAsync = promisify(crypto.scrypt);
const PASSWORD_HASH_PREFIX = "scrypt:";

// Valida e normalizza l'anno stagione passato da query/body.
function parseAnno(value, fallback = 2025) {
  const anno = Number(value ?? fallback);
  if (!Number.isFinite(anno) || anno < 2000 || anno > 2100) {
    throw new Error("Anno non valido");
  }
  return Math.trunc(anno);
}

// Crea la stringa stagione nel formato "2025/2026" partendo dall'anno iniziale.
function stagioneFromAnno(anno) {
  return anno + "/" + (anno + 1);
}

// Legge un valore numerico positivo da query/body e segnala errore se non e valido.
function parsePositiveInt(value, label) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) {
    throw new Error(label + " non valido");
  }
  return Math.trunc(v);
}

// Divide un nome completo in nome e cognome, utile durante l'import dei giocatori.
function splitNomeCognome(nomeCompleto) {
  const parts = String(nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  return {
    nome: parts[0] || "",
    cognome: parts.slice(1).join(" ")
  };
}

// Converte il nome squadra nel formato usato dai file logo.
function logoFileName(nomeSquadra) {
  return String(nomeSquadra || "").trim().toLowerCase().replace(/\s+/g, "_");
}

// Invia una risposta JSON di errore con status code configurabile.
function handleError(res, err, status = 500) {
  res.status(status).json({ ok: false, error: err.message || "Errore interno" });
}

// Normalizza l'email eliminando spazi e rendendola minuscola.
function sanitizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

// Genera l'hash della password da salvare nel database.
async function hashPassword(password) {
  // Il salt casuale rende diverso l'hash anche se due utenti hanno la stessa password.
  const salt = crypto.randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `${PASSWORD_HASH_PREFIX}${salt}:${key.toString("hex")}`;
}

// Controlla se la password inserita corrisponde a quella salvata nel database.
async function verifyPassword(password, storedPassword) {
  const stored = String(storedPassword || "");

  // Compatibilita con utenti gia presenti nel DB con password salvata in chiaro.
  if (!stored.startsWith(PASSWORD_HASH_PREFIX)) {
    return stored === password;
  }

  const [, salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;

  const storedKey = Buffer.from(keyHex, "hex");
  const key = await scryptAsync(password, salt, storedKey.length);

  // timingSafeEqual evita confronti vulnerabili a timing attack.
  return storedKey.length === key.length && crypto.timingSafeEqual(storedKey, key);
}

// Riconosce se una password salvata e gia nel formato hash scrypt.
function isHashedPassword(password) {
  return String(password || "").startsWith(PASSWORD_HASH_PREFIX);
}

// Wrapper unico per football-data.org con token e timeout centralizzati.
async function footballGet(path, params = {}) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    throw new Error("FOOTBALL_DATA_API_KEY non configurata nel file .env");
  }

  const response = await axios.get(API_BASE + path, {
    params,
    headers: { "X-Auth-Token": key },
    timeout: 30000
  });

  return response.data;
}

// Controlla che il server riesca a collegarsi al database.
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    handleError(res, err);
  }
});

// Esegue il login: trova l'utente, verifica la password e restituisce i dati base.
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email e password sono obbligatorie" });
    }

    const [rows] = await pool.execute(
      "SELECT id, nome, cognome, email, ruolo, password_utente FROM utente WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ ok: false, error: "Email non presente nel database" });
    }

    const user = rows[0];
    // Verifica la password inserita confrontandola con l'hash salvato nel DB.
    const passwordOk = await verifyPassword(password, user.password_utente);
    if (!passwordOk) {
      return res.status(401).json({ ok: false, error: "Password non corretta" });
    }

    // Se la password era ancora in chiaro, la convertiamo in hash al primo login corretto.
    if (!isHashedPassword(user.password_utente)) {
      const passwordHash = await hashPassword(password);
      await pool.execute(
        "UPDATE utente SET password_utente = ? WHERE id = ?",
        [passwordHash, user.id]
      );
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        ruolo: String(user.ruolo || "user").toLowerCase()
      }
    });
  } catch (err) {
    handleError(res, err, 500);
  }
});

// Restituisce l'elenco delle squadre disponibili per la scelta della squadra preferita.
app.get("/api/auth/squadre-preferite", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT nome_squadra FROM squadra ORDER BY nome_squadra"
    );
    res.json({
      ok: true,
      data: rows.map((r) => r.nome_squadra).filter(Boolean)
    });
  } catch (err) {
    handleError(res, err, 500);
  }
});

// Registra un nuovo utente salvando nel database l'hash della password.
app.post("/api/auth/register", async (req, res) => {
  try {
    const nome = String(req.body?.nome || "").trim();
    const cognome = String(req.body?.cognome || "").trim();
    const email = sanitizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const squadraPreferita = String(req.body?.squadraPreferita || "").trim();

    if (!nome || !cognome || !email || !password || !squadraPreferita) {
      return res.status(400).json({ ok: false, error: "Compila tutti i campi richiesti" });
    }

    const [teamRows] = await pool.execute(
      "SELECT id_squadra FROM squadra WHERE nome_squadra = ? LIMIT 1",
      [squadraPreferita]
    );
    if (!teamRows.length) {
      return res.status(400).json({ ok: false, error: "Squadra preferita non valida" });
    }

    const [existingRows] = await pool.execute(
      "SELECT id FROM utente WHERE email = ? LIMIT 1",
      [email]
    );
    if (existingRows.length) {
      return res.status(409).json({ ok: false, error: "Email gia registrata" });
    }

    // Nel DB salviamo solo l'hash, mai la password in chiaro.
    const passwordHash = await hashPassword(password);

    await pool.execute(
      "INSERT INTO utente (nome, cognome, email, ruolo, password_utente, squadra_preferita) VALUES (?, ?, ?, 'user', ?, ?)",
      [nome, cognome, email, passwordHash, squadraPreferita]
    );

    res.status(201).json({ ok: true, message: "Registrazione completata" });
  } catch (err) {
    handleError(res, err, 500);
  }
});

// Restituisce il profilo dell'utente e i dati della sua squadra preferita.
app.get("/api/auth/profile", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.query.userId, "Utente");

    const [rows] = await pool.execute(
      "SELECT u.id, u.nome, u.cognome, u.email, u.ruolo, u.squadra_preferita, s.id_squadra, s.nome_squadra, s.città AS citta, s.anno_fondazione, st.nome_stadio, st.indirizzo, st.capienza FROM utente u LEFT JOIN squadra s ON s.nome_squadra = u.squadra_preferita LEFT JOIN stadio st ON st.id_stadio = s.stadio_squadra WHERE u.id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Utente non trovato" });
    }

    const user = rows[0];
    res.json({
      ok: true,
      user: {
        id: user.id,
        nome: user.nome,
        cognome: user.cognome,
        email: user.email,
        ruolo: String(user.ruolo || "user").toLowerCase(),
        squadraPreferita: user.squadra_preferita || null
      },
      squadraPreferita: user.id_squadra
        ? {
            id: user.id_squadra,
            nome: user.nome_squadra,
            citta: user.citta,
            annoFondazione: user.anno_fondazione,
            stadio: user.nome_stadio || null,
            indirizzoStadio: user.indirizzo || null,
            capienzaStadio: user.capienza || null,
            logo: logoFileName(user.nome_squadra) + ".png"
          }
        : null
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Aggiorna l'email dell'utente dopo aver verificato che non sia gia usata.
app.patch("/api/auth/profile/email", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.body?.userId, "Utente");
    const email = sanitizeEmail(req.body?.email);

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email obbligatoria" });
    }

    const [existingRows] = await pool.execute(
      "SELECT id FROM utente WHERE email = ? AND id <> ? LIMIT 1",
      [email, userId]
    );
    if (existingRows.length) {
      return res.status(409).json({ ok: false, error: "Email gia registrata" });
    }

    const [result] = await pool.execute(
      "UPDATE utente SET email = ? WHERE id = ?",
      [email, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, error: "Utente non trovato" });
    }

    const [rows] = await pool.execute(
      "SELECT id, nome, cognome, email, ruolo FROM utente WHERE id = ? LIMIT 1",
      [userId]
    );

    res.json({
      ok: true,
      message: "Email aggiornata",
      user: {
        id: rows[0].id,
        nome: rows[0].nome,
        cognome: rows[0].cognome,
        email: rows[0].email,
        ruolo: String(rows[0].ruolo || "user").toLowerCase()
      }
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Aggiorna la password dell'utente dopo aver controllato quella attuale.
app.patch("/api/auth/profile/password", async (req, res) => {
  try {
    const userId = parsePositiveInt(req.body?.userId, "Utente");
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, error: "Compila tutti i campi password" });
    }

    const [rows] = await pool.execute(
      "SELECT id, password_utente FROM utente WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Utente non trovato" });
    }

    const user = rows[0];
    // Prima confermiamo la vecchia password, poi salviamo l'hash di quella nuova.
    const passwordOk = await verifyPassword(currentPassword, user.password_utente);
    if (!passwordOk) {
      return res.status(401).json({ ok: false, error: "Password attuale non corretta" });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ ok: false, error: "La nuova password deve essere diversa" });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.execute(
      "UPDATE utente SET password_utente = ? WHERE id = ?",
      [newPasswordHash, userId]
    );

    res.json({ ok: true, message: "Password aggiornata" });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Restituisce tutte le squadre ordinate per nome.
app.get("/api/squadre", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_squadra, nome_squadra, città, anno_fondazione, stadio_squadra FROM squadra ORDER BY nome_squadra"
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    handleError(res, err);
  }
});

// Restituisce tutti gli stadi ordinati per nome.
app.get("/api/stadi", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_stadio, nome_stadio, indirizzo, capienza, latitudine, longitudine FROM stadio ORDER BY nome_stadio"
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    handleError(res, err);
  }
});

// Calcola e restituisce la classifica per una stagione.
app.get("/api/classifica", async (req, res) => {
  try {
    const anno = parseAnno(req.query.anno, 2025);
    const stagione = stagioneFromAnno(anno);

    // Classifica aggregata: punti, gol fatti/subiti e ordinamento a parita per differenza reti.
    const sql = "SELECT s.id_squadra, s.nome_squadra, SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_casa ELSE p.gol_trasferta END) AS gol_fatti, SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_trasferta ELSE p.gol_casa END) AS gol_subiti, SUM(CASE WHEN s.id_squadra = p.id_squadra_casa AND p.gol_casa > p.gol_trasferta THEN 3 WHEN s.id_squadra = p.id_squadra_trasferta AND p.gol_trasferta > p.gol_casa THEN 3 WHEN p.gol_casa = p.gol_trasferta THEN 1 ELSE 0 END) AS punti FROM squadra s JOIN partite p ON (s.id_squadra = p.id_squadra_casa OR s.id_squadra = p.id_squadra_trasferta) WHERE p.stagione = ? GROUP BY s.id_squadra, s.nome_squadra ORDER BY punti DESC, (SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_casa ELSE p.gol_trasferta END) - SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_trasferta ELSE p.gol_casa END)) DESC, s.nome_squadra ASC";

    const [rows] = await pool.execute(sql, [stagione]);
    res.json({
      ok: true,
      stagione,
      data: rows.map((row) => ({
        ...row,
        differenza_reti: Number(row.gol_fatti) - Number(row.gol_subiti),
        logo: logoFileName(row.nome_squadra) + ".png"
      }))
    });
  } catch (err) {
    handleError(res, err, err.message.includes("Anno") ? 400 : 500);
  }
});

// Restituisce le ultime notizie da mostrare nella home.
app.get("/api/notizie/home", async (req, res) => {
  try {
    const limit = Math.min(parsePositiveInt(req.query.limit ?? 3, "Limit"), 20);
    const [rows] = await pool.query(
      "SELECT id, titolo, contenuto, data_pubblicazione, link_immagine FROM notizia ORDER BY data_pubblicazione DESC LIMIT " + limit
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    handleError(res, err, 500);
  }
});

// Restituisce le notizie paginando i risultati e filtrando opzionalmente per squadra.
app.get("/api/notizie", async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page ?? 1, "Page");
    const limit = Math.min(parsePositiveInt(req.query.limit ?? 3, "Limit"), 20);
    const offset = (page - 1) * limit;
    const team = String(req.query.team || "").trim();
    const hasTeamFilter = Boolean(team);
    const normalizedTeam = team.toLowerCase();
    const [rows] = await pool.query(
      "SELECT id, titolo, contenuto, data_pubblicazione, link_immagine, squadra_coinvolta FROM notizia ORDER BY data_pubblicazione DESC"
    );

    const filteredRows = hasTeamFilter
      ? rows.filter((row) => {
          const teams = String(row.squadra_coinvolta || "")
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean);
          return teams.includes(normalizedTeam);
        })
      : rows;

    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagedRows = filteredRows.slice(offset, offset + limit);

    res.json({
      ok: true,
      page,
      limit,
      total,
      totalPages,
      team: hasTeamFilter ? team : null,
      data: pagedRows
    });
  } catch (err) {
    handleError(res, err, 500);
  }
});

// Restituisce il dettaglio di una singola notizia partendo dal suo ID.
app.get("/api/notizie/:id", async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id, "ID notizia");
    const [rows] = await pool.execute(
      "SELECT id, titolo, contenuto, data_pubblicazione, link_immagine FROM notizia WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Notizia non trovata" });
    }

    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Restituisce i giocatori di una squadra specifica.
app.get("/api/giocatori", async (req, res) => {
  try {
    const squadraId = parsePositiveInt(req.query.squadra_id, "Squadra");

    const [squadraRows] = await pool.execute(
      "SELECT id_squadra, nome_squadra FROM squadra WHERE id_squadra = ?",
      [squadraId]
    );
    if (!squadraRows.length) {
      return res.status(404).json({ ok: false, error: "Squadra non trovata" });
    }

    const [rows] = await pool.execute(
      "SELECT id_calciatore, nome, cognome, `nazionalità` AS nazionalita, ruolo FROM calciatore WHERE squadra_id = ? ORDER BY ruolo, cognome, nome",
      [squadraId]
    );

    res.json({
      ok: true,
      squadra: squadraRows[0],
      data: rows
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Restituisce le partite di una giornata in una stagione.
app.get("/api/partite/giornata", async (req, res) => {
  try {
    const anno = parseAnno(req.query.anno, 2025);
    const stagione = stagioneFromAnno(anno);
    const giornata = parsePositiveInt(req.query.giornata ?? 1, "Giornata");

    const [rows] = await pool.execute(
      "SELECT p.data, p.giornata, s1.nome_squadra AS casa, s2.nome_squadra AS trasferta, p.gol_casa, p.gol_trasferta, p.nome_stadio FROM partite p JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra WHERE p.giornata = ? AND p.stagione = ? ORDER BY p.data",
      [giornata, stagione]
    );

    res.json({ ok: true, stagione, giornata, data: rows });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Restituisce le partite giocate da una squadra in una stagione.
app.get("/api/partite/squadra", async (req, res) => {
  try {
    const anno = parseAnno(req.query.anno, 2025);
    const stagione = stagioneFromAnno(anno);
    const squadraId = parsePositiveInt(req.query.squadra_id, "Squadra");

    const [squadraRows] = await pool.execute(
      "SELECT id_squadra, nome_squadra FROM squadra WHERE id_squadra = ?",
      [squadraId]
    );
    if (!squadraRows.length) {
      return res.status(404).json({ ok: false, error: "Squadra non trovata" });
    }

    const [rows] = await pool.execute(
      "SELECT p.giornata, p.data, s1.nome_squadra AS casa, s2.nome_squadra AS trasferta, p.gol_casa, p.gol_trasferta, p.nome_stadio FROM partite p JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra WHERE (s1.id_squadra = ? OR s2.id_squadra = ?) AND p.stagione = ? ORDER BY p.giornata, p.data",
      [squadraId, squadraId, stagione]
    );

    res.json({
      ok: true,
      stagione,
      squadra: squadraRows[0],
      data: rows
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Restituisce le partite giocate in uno stadio in una stagione.
app.get("/api/partite/stadio", async (req, res) => {
  try {
    const anno = parseAnno(req.query.anno, 2025);
    const stagione = stagioneFromAnno(anno);
    const stadioId = parsePositiveInt(req.query.stadio_id, "Stadio");

    const [stadioRows] = await pool.execute(
      "SELECT id_stadio, nome_stadio, latitudine, longitudine, capienza FROM stadio WHERE id_stadio = ?",
      [stadioId]
    );
    if (!stadioRows.length) {
      return res.status(404).json({ ok: false, error: "Stadio non trovato" });
    }

    const [rows] = await pool.execute(
      "SELECT p.data, s1.nome_squadra AS casa, s2.nome_squadra AS trasferta, p.gol_casa, p.gol_trasferta, p.nome_stadio FROM partite p JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra WHERE p.stadio_id = ? AND p.stagione = ? ORDER BY p.data",
      [stadioId, stagione]
    );

    res.json({
      ok: true,
      stagione,
      stadio: stadioRows[0],
      data: rows
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Importa o aggiorna le squadre recuperandole da football-data.org.
app.post("/api/import/squadre", async (req, res) => {
  try {
    const seasonApi = Number(req.body?.seasonApi ?? 2024);
    if (!Number.isFinite(seasonApi) || seasonApi < 2000 || seasonApi > 2100) {
      return res.status(400).json({ ok: false, error: "seasonApi non valida" });
    }

    const data = await footballGet("/competitions/SA/teams", { season: seasonApi });
    const teams = Array.isArray(data?.teams) ? data.teams : [];

    const sql = "INSERT INTO squadra (id_squadra, nome_squadra, città, anno_fondazione, stadio_squadra) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome_squadra = VALUES(nome_squadra), città = VALUES(città), anno_fondazione = VALUES(anno_fondazione), stadio_squadra = VALUES(stadio_squadra)";

    let insertedOrUpdated = 0;
    const skipped = [];

    for (const team of teams) {
      const idSquadra = Number(team?.id);
      const nome = String(team?.name || "").trim();
      const citta = String(team?.area?.name || "").trim();
      const founded = Number.isFinite(Number(team?.founded)) ? Number(team.founded) : null;

      if (!idSquadra || !nome) {
        skipped.push({ id: team?.id, name: team?.name || "" });
        continue;
      }

      await pool.execute(sql, [idSquadra, nome, citta || null, founded, idSquadra]);
      insertedOrUpdated++;
    }

    res.json({
      ok: true,
      seasonApi,
      totalApiTeams: teams.length,
      insertedOrUpdated,
      skipped
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Importa o aggiorna gli stadi e li collega alle rispettive squadre.
app.post("/api/import/stadi", async (req, res) => {
  try {
    const seasonApi = Number(req.body?.seasonApi ?? 2024);
    if (!Number.isFinite(seasonApi) || seasonApi < 2000 || seasonApi > 2100) {
      return res.status(400).json({ ok: false, error: "seasonApi non valida" });
    }

    const data = await footballGet("/competitions/SA/teams", { season: seasonApi });
    const teams = Array.isArray(data?.teams) ? data.teams : [];

    const sqlStadio = "INSERT INTO stadio (id_stadio, nome_stadio, indirizzo, capienza) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome_stadio = VALUES(nome_stadio), indirizzo = VALUES(indirizzo), capienza = VALUES(capienza)";

    const sqlLinkSquadra = "UPDATE squadra SET stadio_squadra = ? WHERE id_squadra = ?";

    let insertedOrUpdated = 0;
    let linkedSquadre = 0;
    const skipped = [];

    for (const team of teams) {
      const teamId = Number(team?.id);
      const venue = String(team?.venue || "").trim();
      const address = String(team?.address || "").trim();
      const capacity = Number.isFinite(Number(team?.capacity)) ? Number(team.capacity) : null;

      if (!teamId || !venue) {
        skipped.push({ id: team?.id, name: team?.name || "" });
        continue;
      }

      await pool.execute(sqlStadio, [teamId, venue, address || null, capacity]);
      insertedOrUpdated++;

      const [updateResult] = await pool.execute(sqlLinkSquadra, [teamId, teamId]);
      if (updateResult.affectedRows > 0) {
        linkedSquadre++;
      }
    }

    res.json({
      ok: true,
      seasonApi,
      totalApiTeams: teams.length,
      insertedOrUpdated,
      linkedSquadre,
      skipped
    });
  } catch (err) {
    handleError(res, err);
  }
});

// Importa o aggiorna i giocatori di una squadra da football-data.org.
app.post("/api/import/giocatori", async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.body?.teamId ?? 7397, "teamId");
    const data = await footballGet("/teams/" + teamId);
    const players = Array.isArray(data?.squad) ? data.squad : [];

    if (!players.length) {
      return res.status(404).json({ ok: false, error: "Nessun giocatore trovato per team " + teamId });
    }

    const sql = "INSERT INTO calciatore (id_calciatore, nome, cognome, `nazionalità`, ruolo, squadra_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome = VALUES(nome), cognome = VALUES(cognome), `nazionalità` = VALUES(`nazionalità`), ruolo = VALUES(ruolo), squadra_id = VALUES(squadra_id)";

    let insertedOrUpdated = 0;
    const skipped = [];

    for (const player of players) {
      const playerId = Number(player?.id);
      const fullName = String(player?.name || "").trim();
      const nationality = String(player?.nationality || "").trim() || null;
      const role = String(player?.position || "").trim() || null;

      if (!playerId || !fullName) {
        skipped.push({ id: player?.id, name: player?.name || "" });
        continue;
      }

      const { nome, cognome } = splitNomeCognome(fullName);
      await pool.execute(sql, [playerId, nome, cognome || null, nationality, role, teamId]);
      insertedOrUpdated++;
    }

    res.json({
      ok: true,
      teamId,
      totalApiPlayers: players.length,
      insertedOrUpdated,
      skipped
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Importa o aggiorna le partite di una squadra per una stagione.
app.post("/api/import/partite", async (req, res) => {
  try {
    const teamId = parsePositiveInt(req.body?.teamId ?? 7397, "teamId");
    const seasonApi = parsePositiveInt(req.body?.seasonApi ?? 2025, "seasonApi");
    const stagione = String(req.body?.stagione || (seasonApi + "/" + (seasonApi + 1))).trim();

    const data = await footballGet("/teams/" + teamId + "/matches", { season: seasonApi });
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    const sortedMatches = [...matches].sort((a, b) => String(a?.utcDate || "").localeCompare(String(b?.utcDate || "")));

    const sqlFindSquadra = "SELECT id_squadra, stadio_squadra FROM squadra WHERE nome_squadra = ? LIMIT 1";
    const sqlFindStadio = "SELECT nome_stadio FROM stadio WHERE id_stadio = ? LIMIT 1";

    const sqlUpsert = "INSERT INTO partite (id_partita, data, id_squadra_casa, id_squadra_trasferta, nome_squadra_casa, nome_squadra_trasferta, gol_casa, gol_trasferta, stadio_id, nome_stadio, giornata, stagione) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), id_squadra_casa = VALUES(id_squadra_casa), id_squadra_trasferta = VALUES(id_squadra_trasferta), nome_squadra_casa = VALUES(nome_squadra_casa), nome_squadra_trasferta = VALUES(nome_squadra_trasferta), gol_casa = VALUES(gol_casa), gol_trasferta = VALUES(gol_trasferta), stadio_id = VALUES(stadio_id), nome_stadio = VALUES(nome_stadio), giornata = VALUES(giornata), stagione = VALUES(stagione)";

    let giornata = 1;
    let insertedOrUpdated = 0;
    const skipped = [];

    for (const match of sortedMatches) {
      if (match?.competition?.code !== "SA") {
        continue;
      }

      const idPartita = Number(match?.id);
      const dataPartita = String(match?.utcDate || "").slice(0, 10);
      const nomeCasa = String(match?.homeTeam?.name || "").trim();
      const nomeTrasferta = String(match?.awayTeam?.name || "").trim();
      const fullTimeHome = match?.score?.fullTime?.home;
      const fullTimeAway = match?.score?.fullTime?.away;
      // Per partite non giocate manteniamo i gol a NULL (non 0-0 di default).
      const golCasa =
        fullTimeHome !== null && fullTimeHome !== undefined && Number.isFinite(Number(fullTimeHome))
          ? Number(fullTimeHome)
          : null;
      const golTrasferta =
        fullTimeAway !== null && fullTimeAway !== undefined && Number.isFinite(Number(fullTimeAway))
          ? Number(fullTimeAway)
          : null;

      if (!idPartita || !dataPartita || !nomeCasa || !nomeTrasferta) {
        skipped.push({ id: match?.id || null, reason: "Dati incompleti" });
        continue;
      }

      const [homeRows] = await pool.execute(sqlFindSquadra, [nomeCasa]);
      const [awayRows] = await pool.execute(sqlFindSquadra, [nomeTrasferta]);
      const idCasa = homeRows[0]?.id_squadra || null;
      const idTrasferta = awayRows[0]?.id_squadra || null;

      // Lo stadio viene derivato dalla squadra di casa.
      const stadioId = homeRows[0]?.stadio_squadra || null;
      let nomeStadio = null;
      if (stadioId) {
        const [stadioRows] = await pool.execute(sqlFindStadio, [stadioId]);
        nomeStadio = stadioRows[0]?.nome_stadio || null;
      }

      await pool.execute(sqlUpsert, [
        idPartita,
        dataPartita,
        idCasa,
        idTrasferta,
        nomeCasa,
        nomeTrasferta,
        golCasa,
        golTrasferta,
        stadioId,
        nomeStadio,
        Math.min(giornata, 38),
        stagione
      ]);

      insertedOrUpdated++;
      giornata++;
    }

    res.json({
      ok: true,
      teamId,
      seasonApi,
      stagione,
      totalApiMatches: matches.length,
      insertedOrUpdated,
      skipped
    });
  } catch (err) {
    handleError(res, err, 400);
  }
});

// Avvia il server Express sulla porta configurata.
app.listen(PORT, () => {
  console.log("Server avviato su http://localhost:" + PORT);
});
