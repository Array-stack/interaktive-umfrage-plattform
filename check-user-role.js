import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Database } = sqlite3.verbose();

// Pfad zur Datenbank
const dbPath = join(__dirname, 'backend', 'surveys.db');
console.log('Datenbankpfad:', dbPath);

// Verbindung zur Datenbank herstellen
const db = new Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
    return;
  }
  console.log('Erfolgreich mit der SQLite-Datenbank verbunden');
});

// Benutzer abfragen
const email = 'tournoishop7@gmail.com';
const query = 'SELECT id, email, role, name FROM users WHERE email = ?';

db.get(query, [email], (err, row) => {
  if (err) {
    console.error('Fehler bei der Abfrage:', err.message);
    return;
  }
  
  if (row) {
    console.log('Benutzer gefunden:');
    console.log('ID:', row.id);
    console.log('E-Mail:', row.email);
    console.log('Name:', row.name);
    console.log('Rolle:', row.role);
    
    // Überprüfen der Rolle
    if (row.role === 'TEACHER') {
      console.log('\nDer Benutzer ist als Lehrer eingetragen.');
    } else {
      console.log('\nDer Benutzer ist NICHT als Lehrer eingetragen.');
      console.log('Aktuelle Rolle:', row.role);
    }
  } else {
    console.log('Kein Benutzer mit der E-Mail', email, 'gefunden.');
  }
  
  // Datenbankverbindung schließen
  db.close();
});
