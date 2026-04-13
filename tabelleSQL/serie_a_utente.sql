CREATE TABLE utente (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  cognome varchar(50) NOT NULL,
  email varchar(100) NOT NULL,
  ruolo varchar(10) NOT NULL DEFAULT 'USER',
  password_utente varchar(512) NOT NULL,
  squadra_preferita varchar(100) DEFAULT NULL,
  PRIMARY KEY (email),
  UNIQUE KEY id (id)
);

INSERT INTO utente VALUES (5,'Alessandro','Ferrari','alessandro.ferrari@gmail.com','ADMIN','admin123','Bologna FC 1909'),(3,'Giulia','Verdi','giulia.verdi@gmail.com','USER','password123','AC Milan'),(2,'Luca','Bianchi','luca.bianchi@gmail.com','USER','password123','FC Internazionale Milano'),(1,'Mario','Rossi','mario.rossi@gmail.com','USER','password123','Juventus FC'),(4,'Sara','Neri','sara.neri@gmail.com','USER','password321','Roma');
