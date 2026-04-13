CREATE TABLE squadra (
  id_squadra int NOT NULL AUTO_INCREMENT,
  nome_squadra varchar(100) NOT NULL,
  `città` varchar(100) DEFAULT NULL,
  anno_fondazione int DEFAULT NULL,
  stadio_squadra int DEFAULT NULL,
  PRIMARY KEY (id_squadra),
  KEY stadio_squadra (stadio_squadra),
  CONSTRAINT squadra_ibfk_1 FOREIGN KEY (stadio_squadra) REFERENCES stadio (id_stadio)
) 

INSERT INTO squadra VALUES (98,'AC Milan','Italy',1899,98),(99,'ACF Fiorentina','Italy',1926,99),(100,'AS Roma','Italy',1927,100),(102,'Atalanta BC','Italy',1904,102),(103,'Bologna FC 1909','Italy',1909,103),(104,'Cagliari Calcio','Italy',1920,104),(107,'Genoa CFC','Italy',1893,107),(108,'FC Internazionale Milano','Italy',1908,108),(109,'Juventus FC','Italy',1897,109),(110,'SS Lazio','Italy',1900,110),(112,'Parma Calcio 1913','Italy',1913,112),(113,'SSC Napoli','Italy',1904,113),(115,'Udinese Calcio','Italy',1896,115),(445,'Empoli FC','Italy',1920,445),(450,'Hellas Verona FC','Italy',1903,450),(454,'Venezia FC','Italy',1907,454),(457,'US Cremonese','Cremona',1903,457),(471,'US Sassuolo Calcio','Sassuolo',1920,471),(487,'AC Pisa 1909','Pisa',1909,487),(586,'Torino FC','Italy',1894,586),(5890,'US Lecce','Italy',1908,5890),(5911,'AC Monza','Italy',1912,5911),(7397,'Como 1907','Italy',1907,7397);
