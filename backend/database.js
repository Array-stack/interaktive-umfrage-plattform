

const path = require('path');
const fs = require('fs');

let db;

// Prüfe, ob wir in Railway sind
if (process.env.DATABASE_URL) {
  // PostgreSQL für Produktion (Railway)
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  console.log('Verbindung zur PostgreSQL-Datenbank über Railway hergestellt');
  module.exports = pool;
} else {
  // SQLite für lokale Entwicklung
  const sqlite3 = require('sqlite3').verbose();
  const DBSOURCE = path.join(__dirname, 'surveys.db');

  // Erstelle die Datenbankdatei, falls sie nicht existiert
  if (!fs.existsSync(DBSOURCE)) {
    fs.closeSync(fs.openSync(DBSOURCE, 'w'));
  }

  db = new sqlite3.Database(DBSOURCE, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Fehler beim Öffnen der SQLite-Datenbank:', err.message);
      process.exit(1);
    } else {
      console.log('Erfolgreich mit der SQLite-Datenbank verbunden:', DBSOURCE);
      db.configure('busyTimeout', 5000);
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) console.error('Fehler beim Aktivieren der Fremdschlüssel:', err.message);
      });
      console.log('Verbunden mit der SQLite-Datenbank.');
      db.serialize(() => {
            // Aktiviert Fremdschlüssel-Unterstützung
            db.run("PRAGMA foreign_keys = ON;");

            // Tabelle für Umfragen (surveys)
            db.run(`CREATE TABLE IF NOT EXISTS surveys (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                ownerId TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'surveys':", err.message); }
            });

            // Tabelle für Fragen (questions)
            db.run(`CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                survey_id TEXT NOT NULL,
                text TEXT NOT NULL,
                type TEXT NOT NULL, -- TEXT, SINGLE_CHOICE, MULTIPLE_CHOICE, RATING_SCALE
                FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'questions':", err.message); }
            });

            // Tabelle für Antwortoptionen (choices) für SINGLE_CHOICE und MULTIPLE_CHOICE Fragen
            db.run(`CREATE TABLE IF NOT EXISTS choices (
                id TEXT PRIMARY KEY,
                question_id TEXT NOT NULL,
                text TEXT NOT NULL,
                FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'choices':", err.message); }
            });

            // Tabelle für eingereichte Antworten-Sets (responses)
            db.run(`CREATE TABLE IF NOT EXISTS responses (
                id TEXT PRIMARY KEY,
                survey_id TEXT NOT NULL,
                respondentId TEXT NOT NULL, -- Eindeutige ID des Antwortenden
                submittedAt TEXT NOT NULL,
                FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'responses':", err.message); }
            });

            // Tabelle für einzelne Antworten (answers)
            db.run(`CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT, -- Numerische ID für einfache Handhabung
                response_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                value TEXT, -- Kann Text, Zahl oder JSON-String für Array (bei MULTIPLE_CHOICE) sein
                FOREIGN KEY (response_id) REFERENCES responses (id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'answers':", err.message); }
            });
            
            // Tabelle für Benutzer (users)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL, -- 'teacher' oder 'student'
                created_at TEXT NOT NULL,
                last_login TEXT,
                email_verified BOOLEAN DEFAULT 0,
                verification_token TEXT,
                verification_token_expires TEXT
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'users':", err.message); }
            });
            
            // Tabelle für Passwort-Zurücksetzungstokens
            db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'password_reset_tokens':", err.message); }
            });
        });
    }
  });
}

module.exports = db;
