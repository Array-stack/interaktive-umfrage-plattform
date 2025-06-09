const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const DBSOURCE = path.join(__dirname, 'surveys.db');

console.log('Versuche, eine Verbindung zur Datenbank herzustellen:', DBSOURCE);

const db = new sqlite3.Database(DBSOURCE, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error('Fehler beim Öffnen der Datenbank:', err.message);
        process.exit(1);
    }
    
    console.log('Erfolgreich mit der SQLite-Datenbank verbunden');
    
    // Überprüfe die users-Tabelle
    db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='users';", (err, tables) => {
        if (err) {
            console.error('Fehler beim Abfragen der Tabellen:', err.message);
            db.close();
            return;
        }
        
        if (tables.length === 0) {
            console.log('Die users-Tabelle existiert nicht.');
        } else {
            console.log('Die users-Tabelle existiert. Zeige die ersten 5 Benutzer an:');
            
            // Zeige die ersten 5 Benutzer an
            db.all("SELECT id, email, name, role, email_verified FROM users LIMIT 5;", (err, users) => {
                if (err) {
                    console.error('Fehler beim Abfragen der Benutzer:', err.message);
                    db.close();
                    return;
                }
                console.log(users);
                checkSurveysTable();
            });
            return;
        }
        checkSurveysTable();
    });
    
    function checkSurveysTable() {
        // Überprüfe die surveys-Tabelle
        db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='surveys';", (err, result) => {
            if (err) {
                console.error('Fehler beim Abfragen der surveys-Tabelle:', err.message);
                db.close();
                return;
            }
            
            if (result.length === 0) {
                console.log('Die surveys-Tabelle existiert nicht.');
                db.close();
                return;
            }
            
            console.log('\nStruktur der surveys-Tabelle:');
            console.log(result[0].sql);
            
            // Zeige die ersten 5 Umfragen an
            db.all("SELECT * FROM surveys LIMIT 5;", (err, surveys) => {
                if (err) {
                    console.error('Fehler beim Abfragen der Umfragen:', err.message);
                    db.close();
                    return;
                }
                console.log('\nErste 5 Umfragen:');
                console.log(surveys);
                
                // Überprüfe die Fragen
                db.all("SELECT * FROM questions LIMIT 5;", (err, questions) => {
                    console.log('\nErste 5 Fragen:');
                    console.log(questions);
                    
                    // Überprüfe die Antworten
                    db.all("SELECT * FROM choices LIMIT 5;", (err, choices) => {
                        console.log('\nErste 5 Antwortmöglichkeiten:');
                        console.log(choices);
                        
                        // Überprüfe die responses-Tabelle
                        db.all("PRAGMA table_info(responses);", (err, columns) => {
                            if (err) {
                                console.error('Fehler beim Abfragen der Spalten der responses-Tabelle:', err.message);
                                db.close();
                                return;
                            }
                            
                            console.log('\nSpalten der responses-Tabelle:');
                            console.log(columns);
                            
                            // Schließe die Datenbankverbindung
                            db.close();
                        });
                    });
                });
            });
        });
    }
});
