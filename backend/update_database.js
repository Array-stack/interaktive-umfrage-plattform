const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');

// Verbindung zur Datenbank herstellen
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden mit der Datenbank:', err.message);
        return;
    }
    console.log('Verbindung zur SQLite-Datenbank hergestellt.');

    // Überprüfen, ob die Spalte bereits existiert
    db.get(
        "SELECT name FROM pragma_table_info('responses') WHERE name = 'ip_address';",
        (err, row) => {
            if (err) {
                console.error('Fehler beim Überprüfen der Spalte:', err.message);
                return;
            }

            if (!row) {
                // Spalte existiert nicht, füge sie hinzu
                db.run(
                    'ALTER TABLE responses ADD COLUMN ip_address TEXT;',
                    (err) => {
                        if (err) {
                            console.error('Fehler beim Hinzufügen der Spalte:', err.message);
                        } else {
                            console.log('Spalte ip_address erfolgreich zur Tabelle responses hinzugefügt.');
                        }
                        db.close();
                    }
                );
            } else {
                console.log('Die Spalte ip_address existiert bereits in der Tabelle responses.');
                db.close();
            }
        }
    );
});
