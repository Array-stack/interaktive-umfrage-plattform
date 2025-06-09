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

    // Überprüfen, ob die Spalte bereits existiert
    db.get(
        "SELECT name FROM pragma_table_info('surveys') WHERE name = 'access_type';",
        (err, row) => {
            if (err) {
                console.error('Fehler beim Überprüfen der Spalte:', err.message);
                return;
            }

            if (!row) {
                // Spalte existiert nicht, füge sie hinzu
                db.run(
                    "ALTER TABLE surveys ADD COLUMN access_type TEXT DEFAULT 'public';",
                    (err) => {
                        if (err) {
                            console.error('Fehler beim Hinzufügen der Spalte:', err.message);
                        } else {
                            console.log('Spalte access_type erfolgreich zur Tabelle surveys hinzugefügt.');
                            // Setze den Standardwert für bestehende Einträge
                            db.run(
                                "UPDATE surveys SET access_type = 'public' WHERE access_type IS NULL;",
                                (err) => {
                                    if (err) {
                                        console.error('Fehler beim Aktualisieren bestehender Einträge:', err.message);
                                    } else {
                                        console.log('Bestehende Einträge erfolgreich aktualisiert.');
                                    }
                                    db.close();
                                }
                            );
                        }
                    }
                );
            } else {
                console.log('Die Spalte access_type existiert bereits in der Tabelle surveys.');
                db.close();
            }
        }
    );
});