const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DBSOURCE = path.join(__dirname, 'surveys.db');

// Verbindung zur Datenbank herstellen
const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
        return;
    }
    console.log('Verbindung zur SQLite-Datenbank hergestellt.');

    // Überprüfen, ob die Tabelle bereits existiert
    db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='teacher_students';",
        (err, row) => {
            if (err) {
                console.error('Fehler beim Überprüfen der Tabelle:', err.message);
                return;
            }

            if (!row) {
                // Tabelle existiert nicht, erstelle sie
                db.run(
                    `CREATE TABLE teacher_students (
                        id TEXT PRIMARY KEY,
                        teacher_id TEXT NOT NULL,
                        student_id TEXT NOT NULL,
                        created_at TEXT NOT NULL,
                        FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE,
                        FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
                        UNIQUE(teacher_id, student_id)
                    )`,
                    (err) => {
                        if (err) {
                            console.error('Fehler beim Erstellen der Tabelle teacher_students:', err.message);
                        } else {
                            console.log('Tabelle teacher_students erfolgreich erstellt.');
                            // Index für schnellere Abfragen erstellen
                            db.run('CREATE INDEX idx_teacher_students_teacher ON teacher_students(teacher_id)');
                            db.run('CREATE INDEX idx_teacher_students_student ON teacher_students(student_id)');
                        }
                    }
                );
            } else {
                console.log('Die Tabelle teacher_students existiert bereits.');
            }
        }
    );
});