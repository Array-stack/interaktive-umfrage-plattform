const db = require('./database');
db.all('SELECT * FROM choices', [], (err, rows) => {
    if (err) {
        console.error('Fehler beim Abfragen der choices-Tabelle:', err);
        return;
    }
    console.log('Alle Einträge in der choices-Tabelle:');
    console.log(rows);
});
