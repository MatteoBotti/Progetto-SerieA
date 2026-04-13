Botti Matteo matr. 365085, Colombo Matteo matr. 358603

README - Avvio progetto Serie A Center

Di seguito trovi tutti i passaggi per inizializzare il progetto e avviare il server in locale.

1. Requisiti

- Installa Node.js
- Installa MySQL
- Assicurati di avere un database locale disponibile

2. Apri la cartella del progetto

- Posizionati dentro la cartella del progetto "serieA"

3. Crea il database

- Apri il tuo client MySQL
- Crea un nuovo database, per esempio:

CREATE DATABASE serie_a;

4. Carica le tabelle nel database

- Vai nella cartella "tabelleSQL"
- Prendi tutti i file SQL presenti in quella cartella
- Carica le tabelle nel database che hai appena creato

5. Crea il file ".env"

Nella cartella principale del progetto crea un file chiamato `.env` con questo contenuto:

DB_HOST=localhost
DB_USER=il_tuo_utente_mysql
DB_PASSWORD=la_tua_password_mysql
DB_NAME=serie_a
DB_PORT=3306
FOOTBALL_DATA_API_KEY=la_tua_api_key

Note:
- "DB_HOST" di solito è "localhost"
- "DB_PORT" di solito è "3306"
- "DB_NAME" deve essere il nome del database che hai creato
- "FOOTBALL_DATA_API_KEY" serve per usare le funzioni di importazione da football-data.org

6. Installa le dipendenze Node.js

Apri il terminale nella cartella del progetto ed esegui:

npm install

Se il progetto non ha il "package.json" o vuoi installare i pacchetti manualmente, esegui:

npm install express axios mysql2 dotenv

7. Avvia il server

Nel terminale esegui:

npm start

Se tutto è corretto, il server si avvierà in locale sulla porta 3000.

8. Apri il progetto nel browser

Apri il browser e vai su:

http://localhost:3000/login.html

9. Importazione dati esterni

Se vuoi riempire o aggiornare il database con dati reali:
- apri le pagine admin del progetto
- usa i pulsanti di importazione per:
  - squadre
  - stadi
  - giocatori
  - partite

Queste funzioni usano la API di football-data.org, quindi senza "FOOTBALL_DATA_API_KEY" non funzionano.
Per evitare problemi di dipendenze tra tabelle, l'ordine consigliato è:

1. Import squadre
2. Import stadi
3. Import giocatori
4. Import partite




