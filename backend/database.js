
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DBSOURCE = path.join(__dirname, 'surveys.db'); // Vollständiger Pfad zur Datenbankdatei

// Datenbankverbindung mit besseren Timeouts
const db = new sqlite3.Database(DBSOURCE, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      // Kann die Datenbank nicht öffnen
      console.error('Fehler beim Öffnen der Datenbank:', err.message);
      process.exit(1); // Beende den Prozess, da die Datenbank für die Anwendung essentiell ist
    } else {
      console.log('Erfolgreich mit der SQLite-Datenbank verbunden:', DBSOURCE);
      // Timeout für Datenbankoperationen (in Millisekunden)
      db.configure('busyTimeout', 5000);
      // Aktiviere Fremdschlüssel
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
                createdAt TEXT NOT NULL,
                isPublic INTEGER DEFAULT 1,
                access_type TEXT DEFAULT 'public'
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
                ip_address TEXT, -- IP-Adresse des Antwortenden
                FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
            )`, (err) => {
                if (err) { 
                    console.error("Fehler beim Erstellen der Tabelle 'responses':", err.message);
                    return;
                } 
                
                console.log("Tabelle 'responses' erfolgreich erstellt oder bereits vorhanden");
                
                // Überprüfen, ob die ip_address-Spalte bereits existiert
                db.all("PRAGMA table_info(responses)", [], (err, columns) => {
                    if (err) {
                        console.error("Fehler beim Überprüfen der Tabellenspalten:", err.message);
                        return;
                    }
                    
                    // Sicherstellen, dass columns ein Array ist
                    if (!Array.isArray(columns)) {
                        console.log("Unerwartetes Ergebnis von PRAGMA table_info:", columns);
                        columns = [];
                    }
                    
                    // Überprüfen, ob die ip_address-Spalte bereits existiert
                    const hasIpAddress = columns.some(column => 
                        column.name === 'ip_address' && column.type === 'TEXT'
                    );
                    
                    if (hasIpAddress) {
                        console.log("ip_address-Spalte ist bereits vorhanden");
                        return;
                    }
                    
                    console.log("Füge ip_address-Spalte zur responses-Tabelle hinzu...");
                    
                    // Neue Tabelle mit der zusätzlichen Spalte erstellen
                    db.serialize(() => {
                        db.run('BEGIN TRANSACTION');
                        
                        // 1. Temporäre Tabelle mit der neuen Struktur erstellen
                        db.run(`
                            CREATE TABLE responses_new (
                                id TEXT PRIMARY KEY,
                                survey_id TEXT NOT NULL,
                                respondentId TEXT NOT NULL,
                                submittedAt TEXT NOT NULL,
                                ip_address TEXT,
                                FOREIGN KEY (survey_id) REFERENCES surveys (id) ON DELETE CASCADE
                            )
                        `);
                        
                        // 2. Daten von der alten Tabelle kopieren
                        db.run(`
                            INSERT INTO responses_new (id, survey_id, respondentId, submittedAt, ip_address)
                            SELECT id, survey_id, respondentId, submittedAt, NULL 
                            FROM responses
                        `);
                        
                        // 3. Alte Tabelle umbenennen und neue aktivieren
                        db.run('DROP TABLE IF EXISTS responses_old');
                        db.run('ALTER TABLE responses RENAME TO responses_old');
                        db.run('ALTER TABLE responses_new RENAME TO responses');
                        
                        // 4. Indizes neu erstellen
                        db.run('CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id)');
                        
                        // 5. Transaktion abschließen
                        db.run('COMMIT', (err) => {
                            if (err) {
                                console.error("Fehler beim Abschließen der Transaktion:", err.message);
                                db.run('ROLLBACK');
                            } else {
                                console.log("ip_address-Spalte erfolgreich hinzugefügt");
                                
                                // Alte Tabelle aufräumen (außerhalb der Transaktion)
                                db.run('DROP TABLE IF EXISTS responses_old', (err) => {
                                    if (err) {
                                        console.error("Fehler beim Löschen der alten Tabelle:", err.message);
                                    } else {
                                        console.log("Alte Tabelle erfolgreich aufgeräumt");
                                    }
                                });
                            }
                        });
                    });
                });
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
            
            // Tabelle für Lehrer-Schüler-Beziehung
            db.run(`CREATE TABLE IF NOT EXISTS teacher_students (
                id TEXT PRIMARY KEY,
                teacher_id TEXT NOT NULL,
                student_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(teacher_id, student_id)
            )`, (err) => {
                if (err) { console.error("Fehler beim Erstellen der Tabelle 'teacher_students':", err.message); }
                else {
                    // Indizes für schnellere Abfragen
                    db.run('CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON teacher_students(teacher_id)');
                    db.run('CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id)');
                }
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

module.exports = db;

// Nach der Tabellendefinition hinzufügen
db.all("PRAGMA table_info(surveys)", (err, rows) => {
    if (err) {
        console.error("Fehler beim Prüfen der surveys-Tabelle:", err.message);
        return;
    }
    
    // Prüfen, ob isPublic-Spalte existiert
    const hasIsPublic = rows.some(row => row.name === 'isPublic');
    
    if (!hasIsPublic) {
        console.log("Füge isPublic-Spalte zur surveys-Tabelle hinzu...");
        db.run("ALTER TABLE surveys ADD COLUMN isPublic INTEGER DEFAULT 1", (err) => {
            if (err) {
                console.error("Fehler beim Hinzufügen der isPublic-Spalte:", err.message);
            } else {
                console.log("isPublic-Spalte erfolgreich hinzugefügt.");
            }
        });
    }
});
