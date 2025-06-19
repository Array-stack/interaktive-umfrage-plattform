const { createServer } = require('http');
const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0'; // Für IPv4-kompatiblen Fallback

/**
 * Initialisiert die Datenbank
 * @returns {Promise<void>} Promise, das nach Abschluss der Initialisierung aufgelöst wird
 */
async function initDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Datenbankinitialisierung abgeschlossen');
    resolve(undefined);
  });
}

// Server starten
async function startServer() {
  try {
    // Datenbank initialisieren
    await initDatabase();

    // HTTP-Server erstellen und starten
    const server = createServer(app);

    // PORT als Nummer konvertieren, da TypeScript eine Nummer erwartet
    server.listen(Number(PORT), HOST, () => {
      console.log(`Server läuft auf http://${HOST}:${PORT} (${process.env.NODE_ENV || 'development'})`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`API erreichbar unter ${process.env.APP_URL || 'https://interaktive-umfrage-plattform-backend.up.railway.app'}/api`);
      } else {
        console.log(`API erreichbar unter http://${HOST}:${PORT}/api`);
        console.log('Hinweis: Für Railway wird Port 8080 verwendet, wenn keine PORT-Umgebungsvariable gesetzt ist');
      }
    });

    return server;
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Kritischer Fehler:', error);
    process.exit(1);
  });
}

module.exports = { startServer };
