-- Query usate dal backend Express in server.js.

-- Verifica rapida della connessione al database nell'endpoint /api/health.
SELECT 1;

-- Recupera un utente tramite email per il login.
SELECT id, nome, cognome, email, ruolo, password_utente
FROM utente
WHERE email = ?
LIMIT 1;

-- Elenca le squadre disponibili da usare come squadra preferita in registrazione.
SELECT nome_squadra
FROM squadra
ORDER BY nome_squadra;

-- Controlla che la squadra preferita scelta in registrazione esista davvero.
SELECT id_squadra
FROM squadra
WHERE nome_squadra = ?
LIMIT 1;

-- Verifica se l'email inserita in registrazione e gia presente.
SELECT id
FROM utente
WHERE email = ?
LIMIT 1;

-- Inserisce un nuovo utente registrato con ruolo base "user".
INSERT INTO utente (nome, cognome, email, ruolo, password_utente, squadra_preferita)
VALUES (?, ?, ?, 'user', ?, ?);

-- Carica il profilo dell'utente con i dettagli della squadra preferita e dello stadio associato.
SELECT
  u.id,
  u.nome,
  u.cognome,
  u.email,
  u.ruolo,
  u.squadra_preferita,
  s.id_squadra,
  s.nome_squadra,
  s.città AS citta,
  s.anno_fondazione,
  st.nome_stadio,
  st.indirizzo,
  st.capienza
FROM utente u
LEFT JOIN squadra s ON s.nome_squadra = u.squadra_preferita
LEFT JOIN stadio st ON st.id_stadio = s.stadio_squadra
WHERE u.id = ?
LIMIT 1;

-- Controlla se la nuova email scelta dall'utente e gia usata da un altro account.
SELECT id
FROM utente
WHERE email = ? AND id <> ?
LIMIT 1;

-- Aggiorna l'email del profilo utente.
UPDATE utente
SET email = ?
WHERE id = ?;

-- Rilegge i dati essenziali dell'utente dopo l'aggiornamento email.
SELECT id, nome, cognome, email, ruolo
FROM utente
WHERE id = ?
LIMIT 1;

-- Recupera la password attuale dell'utente per validare il cambio password.
SELECT id, password_utente
FROM utente
WHERE id = ?
LIMIT 1;

-- Aggiorna la password dell'utente.
UPDATE utente
SET password_utente = ?
WHERE id = ?;

-- Elenca tutte le squadre disponibili con dati base.
SELECT id_squadra, nome_squadra, città, anno_fondazione, stadio_squadra
FROM squadra
ORDER BY nome_squadra;

-- Elenca tutti gli stadi disponibili con coordinate e capienza.
SELECT id_stadio, nome_stadio, indirizzo, capienza, latitudine, longitudine
FROM stadio
ORDER BY nome_stadio;

-- Costruisce la classifica aggregando punti, gol fatti e gol subiti per stagione.
SELECT
  s.id_squadra,
  s.nome_squadra,
  SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_casa ELSE p.gol_trasferta END) AS gol_fatti,
  SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_trasferta ELSE p.gol_casa END) AS gol_subiti,
  SUM(
    CASE
      WHEN s.id_squadra = p.id_squadra_casa AND p.gol_casa > p.gol_trasferta THEN 3
      WHEN s.id_squadra = p.id_squadra_trasferta AND p.gol_trasferta > p.gol_casa THEN 3
      WHEN p.gol_casa = p.gol_trasferta THEN 1
      ELSE 0
    END
  ) AS punti
FROM squadra s
JOIN partite p ON (s.id_squadra = p.id_squadra_casa OR s.id_squadra = p.id_squadra_trasferta)
WHERE p.stagione = ?
GROUP BY s.id_squadra, s.nome_squadra
ORDER BY
  punti DESC,
  (
    SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_casa ELSE p.gol_trasferta END) -
    SUM(CASE WHEN s.id_squadra = p.id_squadra_casa THEN p.gol_trasferta ELSE p.gol_casa END)
  ) DESC,
  s.nome_squadra ASC;

-- Recupera le ultime notizie per la home page con limite dinamico.
SELECT id, titolo, contenuto, data_pubblicazione, link_immagine
FROM notizia
ORDER BY data_pubblicazione DESC
LIMIT {limit};

-- Conta il numero totale di notizie per la paginazione.
SELECT COUNT(*) AS total
FROM notizia;

-- Recupera una pagina di notizie con paginazione.
SELECT id, titolo, contenuto, data_pubblicazione, link_immagine
FROM notizia
ORDER BY data_pubblicazione DESC
LIMIT {limit} OFFSET {offset};

-- Recupera una singola notizia tramite ID.
SELECT id, titolo, contenuto, data_pubblicazione, link_immagine
FROM notizia
WHERE id = ?;

-- Controlla che la squadra richiesta nella pagina giocatori esista.
SELECT id_squadra, nome_squadra
FROM squadra
WHERE id_squadra = ?;

-- Elenca i giocatori di una squadra ordinati per ruolo e nome.
SELECT id_calciatore, nome, cognome, `nazionalità` AS nazionalita, ruolo
FROM calciatore
WHERE squadra_id = ?
ORDER BY ruolo, cognome, nome;

-- Recupera le partite di una specifica giornata e stagione.
SELECT
  p.data,
  p.giornata,
  s1.nome_squadra AS casa,
  s2.nome_squadra AS trasferta,
  p.gol_casa,
  p.gol_trasferta,
  p.nome_stadio
FROM partite p
JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra
JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra
WHERE p.giornata = ? AND p.stagione = ?
ORDER BY p.data;

-- Recupera le partite di una squadra in una stagione.
SELECT
  p.giornata,
  p.data,
  s1.nome_squadra AS casa,
  s2.nome_squadra AS trasferta,
  p.gol_casa,
  p.gol_trasferta,
  p.nome_stadio
FROM partite p
JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra
JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra
WHERE (s1.id_squadra = ? OR s2.id_squadra = ?) AND p.stagione = ?
ORDER BY p.giornata, p.data;

-- Recupera i dati base di uno stadio selezionato.
SELECT id_stadio, nome_stadio, latitudine, longitudine, capienza
FROM stadio
WHERE id_stadio = ?;

-- Recupera le partite giocate in uno stadio in una stagione.
SELECT
  p.data,
  s1.nome_squadra AS casa,
  s2.nome_squadra AS trasferta,
  p.gol_casa,
  p.gol_trasferta,
  p.nome_stadio
FROM partite p
JOIN squadra s1 ON p.id_squadra_casa = s1.id_squadra
JOIN squadra s2 ON p.id_squadra_trasferta = s2.id_squadra
WHERE p.stadio_id = ? AND p.stagione = ?
ORDER BY p.data;

-- Inserisce o aggiorna una squadra importata dall'API esterna.
INSERT INTO squadra (id_squadra, nome_squadra, città, anno_fondazione, stadio_squadra)
VALUES (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  nome_squadra = VALUES(nome_squadra),
  città = VALUES(città),
  anno_fondazione = VALUES(anno_fondazione),
  stadio_squadra = VALUES(stadio_squadra);

-- Inserisce o aggiorna uno stadio importato dall'API esterna.
INSERT INTO stadio (id_stadio, nome_stadio, indirizzo, capienza)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  nome_stadio = VALUES(nome_stadio),
  indirizzo = VALUES(indirizzo),
  capienza = VALUES(capienza);

-- Collega una squadra al proprio stadio importato.
UPDATE squadra
SET stadio_squadra = ?
WHERE id_squadra = ?;

-- Inserisce o aggiorna i giocatori importati da football-data.org.
INSERT INTO calciatore (id_calciatore, nome, cognome, `nazionalità`, ruolo, squadra_id)
VALUES (?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  nome = VALUES(nome),
  cognome = VALUES(cognome),
  `nazionalità` = VALUES(`nazionalità`),
  ruolo = VALUES(ruolo),
  squadra_id = VALUES(squadra_id);

-- Cerca una squadra per nome durante l'import delle partite.
SELECT id_squadra, stadio_squadra
FROM squadra
WHERE nome_squadra = ?
LIMIT 1;

-- Recupera il nome dello stadio partendo dal suo ID durante l'import delle partite.
SELECT nome_stadio
FROM stadio
WHERE id_stadio = ?
LIMIT 1;

-- Inserisce o aggiorna una partita importata con squadre, risultato e stadio.
INSERT INTO partite (
  id_partita, data, id_squadra_casa, id_squadra_trasferta,
  nome_squadra_casa, nome_squadra_trasferta,
  gol_casa, gol_trasferta, stadio_id, nome_stadio, giornata, stagione
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  data = VALUES(data),
  id_squadra_casa = VALUES(id_squadra_casa),
  id_squadra_trasferta = VALUES(id_squadra_trasferta),
  nome_squadra_casa = VALUES(nome_squadra_casa),
  nome_squadra_trasferta = VALUES(nome_squadra_trasferta),
  gol_casa = VALUES(gol_casa),
  gol_trasferta = VALUES(gol_trasferta),
  stadio_id = VALUES(stadio_id),
  nome_stadio = VALUES(nome_stadio),
  giornata = VALUES(giornata),
  stagione = VALUES(stagione);
