const { createServer } = require('http');
const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 3001;

// Hilfsfunktion zur Datenbankinitialisierung
async function initDatabase() {
  return new Promise((resolve, reject) => {
    // Hier kommen Ihre Datenbankinitialisierungsroutinen
    console.log('Datenbankinitialisierung abgeschlossen');
    resolve();
  });
}

// Server starten
async function startServer() {
  try {
    // Datenbank initialisieren
    await initDatabase();
    
    // HTTP-Server erstellen
    const server = createServer(app);
    
    // Server starten
    server.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT} (${process.env.NODE_ENV || 'development'})`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`API erreichbar unter ${process.env.APP_URL || 'https://interaktive-umfrage-plattform-backend.up.railway.app'}/api`);
      } else {
        console.log(`API erreichbar unter http://localhost:${PORT}/api`);
      }
    });
    
    return server;
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Server starten, wenn diese Datei direkt ausgeführt wird
if (require.main === module) {
  startServer().catch(error => {
    console.error('Kritischer Fehler:', error);
    process.exit(1);
  });
}

// Für Tests
module.exports = { startServer };
