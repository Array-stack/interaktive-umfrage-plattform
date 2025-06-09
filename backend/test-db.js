const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DBSOURCE = path.join(__dirname, 'surveys.db');

console.log('Versuche, eine Verbindung zur Datenbank herzustellen...');
console.log('Datenbankpfad:', DBSOURCE);

const db = new sqlite3.Database(DBSOURCE, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Fehler beim Öffnen der Datenbank:', err);
    process.exit(1);
  }
  
  console.log('Erfolgreich mit der Datenbank verbunden!');
  
  // Testabfrage ausführen
  db.get('SELECT name FROM sqlite_master WHERE type="table"', (err, row) => {
    if (err) {
      console.error('Fehler bei der Testabfrage:', err);
    } else {
      console.log('Erste Tabelle in der Datenbank:', row);
    }
    
    // Datenbankverbindung schließen
    db.close();
  });
});
