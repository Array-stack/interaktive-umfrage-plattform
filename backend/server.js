
const express = require('express');
const cors = require('cors');
const db = require('./database.js'); // Importiert die Datenbankverbindung
const { 
  hashPassword, 
  comparePassword, 
  generateToken: generateAuthToken, // Umbenennen, um Namenskonflikte zu vermeiden
  authenticateToken, 
  requireTeacherRole 
} = require('./authUtils');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json()); // Erlaubt das Parsen von JSON-Daten im Request Body

// CORS-Konfiguration
app.use((req, res, next) => {
  // Erlaube mehrere Ursprünge für Entwicklung und Produktion
  const allowedOrigins = [
    'http://localhost:5173',    // Vite Development Server
    'http://127.0.0.1:5173',    // Alternative localhost
    'https://deine-produktions-url.de'  // Produktions-URL
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    // Cache die Preflight-Anfrage für 1 Stunde (im Browser)
    res.header('Access-Control-Max-Age', '3600');
    return res.status(200).end();
  }
  
  next();
});

// Einfache ID-Generierung
const generateId = () => Math.random().toString(36).substr(2, 9);

// Einfache Testroute
app.get('/', (req, res) => {
  res.json({ message: "Willkommen zum Umfrage-App Backend!" });
});

// Admin: Alle Benutzer anzeigen (Nur für Entwicklung!)
app.get('/api/admin/users', (req, res) => {
  db.all('SELECT id, email, name, role, email_verified, created_at FROM users', [], (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Benutzer:', err);
      return res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer' });
    }
    res.json(rows);
  });
});

// Admin: Benutzer löschen (Nur für Entwicklung!)
app.delete('/api/admin/users/:email', (req, res) => {
  const { email } = req.params;
  
  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich' });
  }

  db.run('DELETE FROM users WHERE email = ?', [email], function(err) {
    if (err) {
      console.error('Fehler beim Löschen des Benutzers:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }
    
    res.json({ message: 'Benutzer erfolgreich gelöscht' });
  });
});

// Admin: Alle Benutzer löschen (Nur für Entwicklung!)
app.delete('/api/admin/users', (req, res) => {
  db.run('DELETE FROM users', function(err) {
    if (err) {
      console.error('Fehler beim Löschen aller Benutzer:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen der Benutzer' });
    }
    
    res.json({ message: `Alle ${this.changes} Benutzer wurden gelöscht` });
  });
});

// ======== API-Endpunkte für Authentifizierung ========

// E-Mail-Utilities initialisieren
const { 
  initializeTransporter, 
  generateEmailToken, 
  sendVerificationEmail,
  sendPasswordResetEmail 
} = require('./emailUtils.js');

// Server starten, nachdem der E-Mail-Transporter initialisiert wurde
async function startServer() {
  try {
    await initializeTransporter();
    console.log('E-Mail-Transporter erfolgreich initialisiert');
    
    // Verwende '0.0.0.0' anstelle von 'localhost', um auf allen Netzwerkschnittstellen zu lauschen
    const server = app.listen(PORT, '0.0.0.0', () => {
      const address = server.address();
      console.log(`Server läuft auf http://localhost:${PORT}`);
      console.log(`Verfügbar unter: http://${require('os').hostname()}:${PORT}`);
    });
    
    // Behandle Server-Fehler
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} ist bereits in Verwendung. Bitte beenden Sie den laufenden Prozess oder wählen Sie einen anderen Port.`);
      } else {
        console.error('Server-Fehler:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Server starten
startServer();

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Validierung
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  try {
    // Benutzer in der Datenbank suchen
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler beim Login:', err.message);
        return res.status(500).json({ error: 'Serverfehler beim Login.' });
      }

      // Überprüfen, ob der Benutzer existiert
      if (!user) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      // E-Mail-Bestätigung vorerst deaktiviert
      // if (!user.email_verified) {
      //   return res.status(403).json({ error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.' });
      // }

      // Passwort überprüfen
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      // Token generieren
      const token = generateAuthToken(user.id, user.email, user.role);

      // Letzten Login aktualisieren
      const lastLogin = new Date().toISOString();
      db.run('UPDATE users SET last_login = ? WHERE id = ?', [lastLogin, user.id]);

      // Erfolgreiche Antwort
      res.json({
        message: 'Erfolgreich eingeloggt',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.email_verified === 1
        }
      });
    });
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ error: 'Interner Serverfehler bei der Anmeldung.' });
  }
});

// Registrierung
app.post('/api/auth/register', async (req, res) => {
  console.log('Registrierungsanfrage erhalten:', JSON.stringify(req.body, null, 2));
  
  try {
    const { email, password, name, role } = req.body;

    // Validierung
    if (!email || !password || !name || !role) {
      console.log('Validierungsfehler: Fehlende Pflichtfelder');
      return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
    }

    if (role !== 'teacher' && role !== 'student') {
      console.log(`Validierungsfehler: Ungültige Rolle: ${role}`);
      return res.status(400).json({ error: 'Rolle muss entweder \'teacher\' oder \'student\' sein.' });
    }
    
    // Prüfen, ob E-Mail bereits existiert
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler bei der Registrierung:', err.message);
        return res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
      }

      if (user) {
        return res.status(409).json({ error: 'Diese E-Mail wird bereits verwendet.' });
      }

      // Passwort hashen
      const hashedPassword = await hashPassword(password);
      const userId = generateId();
      const createdAt = new Date().toISOString();
      
      // E-Mail-Bestätigung aktivieren
      const email_verified = 0; // Auf 0 setzen, um E-Mail-Bestätigung zu erfordern
      const verificationToken = generateEmailToken();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 Stunden gültig

      // Benutzer in die Datenbank einfügen
      const sql = `INSERT INTO users (id, email, password, name, role, created_at, email_verified, verification_token, verification_token_expires) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      db.run(sql, [
        userId, 
        email, 
        hashedPassword, 
        name, 
        role, 
        createdAt, 
        email_verified,
        verificationToken,
        tokenExpires
      ], async function(err) {
        if (err) {
          console.error('Fehler beim Einfügen des Benutzers in die Datenbank:');
          console.error('SQL Fehler:', err.message);
          console.error('SQL Query:', sql);
          console.error('Parameter:', [userId, email, '[HASHED_PASSWORD]', name, role, createdAt, email_verified, verificationToken, tokenExpires]);
          return res.status(500).json({ 
            error: 'Fehler beim Erstellen des Kontos.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }

        // Bestätigungs-E-Mail senden
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        const emailResult = await sendVerificationEmail(email, name, verificationToken, baseUrl);
        
        if (emailResult.error) {
          console.error('Fehler beim Senden der Bestätigungs-E-Mail:', emailResult.error);
          return res.status(500).json({ 
            error: 'Registrierung erfolgreich, aber Bestätigungs-E-Mail konnte nicht gesendet werden.',
            details: process.env.NODE_ENV === 'development' ? emailResult.error : undefined
          });
        }
        
        console.log('Bestätigungs-E-Mail gesendet. Vorschau:', emailResult.previewUrl);
        
        // Erfolgreiche Antwort senden ohne automatisches Login
        res.status(201).json({ 
          message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.', 
          userId,
          emailPreviewUrl: emailResult.previewUrl // Nur für Entwicklungszwecke
        });
      });
    });
  } catch (error) {
    console.error('Fehler bei der Registrierung:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Interner Serverfehler bei der Registrierung.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
});

// E-Mail-Adresse bestätigen
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token ist erforderlich.' });
  }

  try {
    // Benutzer mit diesem Token finden
    db.get(
      'SELECT * FROM users WHERE verification_token = ?',
      [token],
      async (err, user) => {
        if (err) {
          console.error('Datenbankfehler bei der E-Mail-Bestätigung:', err.message);
          return res.status(500).json({ error: 'Serverfehler bei der E-Mail-Bestätigung.' });
        }

        if (!user) {
          return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token.' });
        }

        // Prüfen, ob der Token abgelaufen ist
        const tokenExpires = new Date(user.verification_token_expires);
        if (tokenExpires < new Date()) {
          return res.status(400).json({ error: 'Token ist abgelaufen. Bitte fordern Sie einen neuen an.' });
        }

        // E-Mail-Adresse bestätigen
        db.run(
          'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
          [user.id],
          function(err) {
            if (err) {
              console.error('Fehler beim Aktualisieren des Benutzers:', err.message);
              return res.status(500).json({ error: 'Fehler bei der E-Mail-Bestätigung.' });
            }

            // Zur Passwort-zurücksetzen-Seite weiterleiten
            const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
            const redirectUrl = `${frontendUrl}/forgot-password?email=${encodeURIComponent(user.email)}`;
            
            // JSON-Antwort mit Weiterleitungs-URL senden
            res.json({
              message: 'E-Mail erfolgreich bestätigt. Sie werden weitergeleitet...',
              email: user.email,
              redirect: redirectUrl
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Fehler bei der E-Mail-Bestätigung:', error);
    res.status(500).json({ error: 'Serverfehler bei der E-Mail-Bestätigung.' });
  }
});

// Passwort-Zurücksetzung anfordern
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' });
  }

  try {
    // Benutzer mit dieser E-Mail-Adresse finden
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler bei der Passwort-Zurücksetzung:', err.message);
        return res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
      }

      // Auch wenn kein Benutzer gefunden wurde, geben wir eine erfolgreiche Antwort zurück,
      // um keine Informationen über existierende E-Mail-Adressen preiszugeben
      if (!user) {
        return res.status(200).json({ message: 'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.' });
      }

      // Token generieren
      const resetToken = generateEmailToken();
      const tokenId = generateId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token ist 1 Stunde gültig

      // Token in der Datenbank speichern
      const sql = `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(
        sql,
        [tokenId, user.id, resetToken, expiresAt.toISOString(), 0, new Date().toISOString()],
        async function(err) {
          if (err) {
            console.error('Fehler beim Speichern des Reset-Tokens:', err.message);
            return res.status(500).json({ error: 'Fehler bei der Passwort-Zurücksetzung.' });
          }

          // E-Mail zum Zurücksetzen des Passworts senden
          const baseUrl = process.env.APP_URL || req.headers.origin || 'http://localhost:5173'; // Frontend-URL
          const emailResult = await sendPasswordResetEmail(email, user.name, resetToken, baseUrl);

          if (!emailResult.success) {
            console.error('Fehler beim Senden der Passwort-Zurücksetzen-E-Mail:', emailResult.error);
            return res.status(500).json({ error: 'Fehler beim Senden der E-Mail.' });
          }

          console.log('Passwort-Zurücksetzen-E-Mail gesendet. Vorschau:', emailResult.previewUrl);

          res.status(200).json({ 
            message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet.',
            emailPreviewUrl: emailResult.previewUrl // Nur für Entwicklungszwecke
          });
        }
      );
    });
  } catch (error) {
    console.error('Fehler bei der Passwort-Zurücksetzung:', error);
    res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
  }
});

// Passwort-Zurücksetzung anfordern
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail ist erforderlich.' });
  }

  try {
    // Prüfen, ob der Benutzer existiert
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler bei der Passwort-Zurücksetzung:', err.message);
        return res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
      }

      if (!user) {
        // Aus Sicherheitsgründen keine spezifische Fehlermeldung zurückgeben
        return res.status(200).json({ message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail mit Anweisungen gesendet.' });
      }

      // Token für die Passwort-Zurücksetzung generieren
      const resetToken = generateEmailToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token ist 1 Stunde gültig

      // Token in der Datenbank speichern
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt.toISOString()],
        async function(err) {
          if (err) {
            console.error('Fehler beim Speichern des Reset-Tokens:', err.message);
            return res.status(500).json({ error: 'Fehler bei der Passwort-Zurücksetzung.' });
          }

          try {
            // E-Mail zum Zurücksetzen des Passworts senden
            const baseUrl = process.env.APP_URL || req.headers.origin || 'http://localhost:5173';
            const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken, baseUrl);

            if (!emailResult.success) {
              console.error('Fehler beim Senden der Passwort-Zurücksetzen-E-Mail:', emailResult.error);
              return res.status(500).json({ error: 'Fehler beim Senden der E-Mail.' });
            }

            console.log('Passwort-Zurücksetzen-E-Mail gesendet. Vorschau:', emailResult.previewUrl);

            res.status(200).json({ 
              message: 'Falls ein Konto mit dieser E-Mail existiert, wurde eine E-Mail mit Anweisungen gesendet.',
              emailPreviewUrl: emailResult.previewUrl // Nur für Entwicklungszwecke
            });
          } catch (emailError) {
            console.error('Fehler beim Senden der E-Mail:', emailError);
            res.status(500).json({ error: 'Fehler beim Senden der E-Mail.' });
          }
        }
      );
    });
  } catch (error) {
    console.error('Fehler bei der Passwort-Zurücksetzung:', error);
    res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
  }
});

// Passwort zurücksetzen
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich.' });
  }

  try {
    // Token in der Datenbank finden
    db.get(
      'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?',
      [token, new Date().toISOString()],
      async (err, resetToken) => {
        if (err) {
          console.error('Datenbankfehler bei der Passwort-Zurücksetzung:', err.message);
          return res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
        }

        if (!resetToken) {
          return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token.' });
        }

        // Passwort hashen
        const hashedPassword = await hashPassword(newPassword);

        // Passwort aktualisieren
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, resetToken.user_id],
          function(err) {
            if (err) {
              console.error('Fehler beim Aktualisieren des Passworts:', err.message);
              return res.status(500).json({ error: 'Fehler bei der Passwort-Zurücksetzung.' });
            }

            // Token als verwendet markieren
            db.run(
              'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
              [resetToken.id],
              function(err) {
                if (err) {
                  console.error('Fehler beim Aktualisieren des Reset-Tokens:', err.message);
                }

                res.status(200).json({ message: 'Passwort erfolgreich zurückgesetzt.' });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Fehler bei der Passwort-Zurücksetzung:', error);
    res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Validierung
  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  try {
    // Benutzer in der Datenbank suchen
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler beim Login:', err.message);
        return res.status(500).json({ error: 'Serverfehler beim Login.' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Ungültige Anmeldeinformationen.' });
      }

      // Passwort vergleichen
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Ungültige Anmeldeinformationen.' });
      }

      // Überprüfen, ob die E-Mail bestätigt wurde
      if (!user.email_verified) {
        return res.status(403).json({ 
          error: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse, bevor Sie sich anmelden.' 
        });
      }

      // Letzten Login aktualisieren
      const lastLogin = new Date().toISOString();
      db.run('UPDATE users SET last_login = ? WHERE id = ?', [lastLogin, user.id], (err) => {
        if (err) {
          console.error('Fehler beim Aktualisieren des letzten Logins:', err.message);
        }

        // Token generieren
        const token = generateAuthToken(user.id, user.email, user.role);

        // Erfolgreiche Antwort senden
        res.status(200).json({
          message: 'Login erfolgreich',
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: true
          }
        });
      });
    });
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ error: 'Serverfehler beim Login.' });
  }
});

// Benutzerprofile abrufen (geschützte Route)
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  db.get('SELECT id, email, name, role, created_at, last_login FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Fehler beim Abrufen des Benutzerprofils:', err.message);
      return res.status(500).json({ error: 'Fehler beim Abrufen des Benutzerprofils.' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    res.status(200).json({ user });
  });
});

// ======== API-Endpunkte für Umfragen ========

// POST /api/surveys - Neue Umfrage erstellen (nur für Lehrer)
app.post('/api/surveys', authenticateToken, requireTeacherRole, (req, res) => {
    const { title, description, questions } = req.body;
    const ownerId = req.user.userId; // Benutzer-ID aus dem Token

    if (!title || !description || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Titel, Beschreibung und mindestens eine Frage sind erforderlich." });
    }

    const surveyId = generateId();
    const createdAt = new Date().toISOString();

    db.serialize(() => {
        db.run("BEGIN TRANSACTION;");

        const surveySql = `INSERT INTO surveys (id, title, description, ownerId, createdAt) VALUES (?, ?, ?, ?, ?)`;
        db.run(surveySql, [surveyId, title, description, ownerId, createdAt], function(err) {
            if (err) {
                console.error("Fehler beim Einfügen der Umfrage:", err.message);
                db.run("ROLLBACK;");
                return res.status(500).json({ error: "Fehler beim Erstellen der Umfrage." });
            }

            let questionPromises = questions.map((q, qIndex) => {
                return new Promise((resolve, reject) => {
                    if (!q.text || !q.type) {
                        return reject(new Error(`Frage ${qIndex + 1} ist unvollständig.`));
                    }
                    const questionId = generateId();
                    const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
                    db.run(questionSql, [questionId, surveyId, q.text, q.type], function(err) {
                        if (err) {
                            return reject(err);
                        }
                        // Antwortoptionen speichern, falls vorhanden
                        if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && Array.isArray(q.choices)) {
                            let choicePromises = q.choices.map((choice, cIndex) => {
                                return new Promise((resolveChoice, rejectChoice) => {
                                    if (!choice.text) {
                                        return rejectChoice(new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} ist unvollständig.`));
                                    }
                                    const choiceId = generateId();
                                    const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                                    db.run(choiceSql, [choiceId, questionId, choice.text], function(err) {
                                        if (err) {
                                            return rejectChoice(err);
                                        }
                                        resolveChoice({ id: choiceId, text: choice.text });
                                    });
                                });
                            });
                            Promise.all(choicePromises)
                                .then(savedChoices => resolve({ id: questionId, text: q.text, type: q.type, choices: savedChoices }))
                                .catch(reject);
                        } else {
                            resolve({ id: questionId, text: q.text, type: q.type, choices: [] });
                        }
                    });
                });
            });

            Promise.all(questionPromises)
                .then(savedQuestions => {
                    db.run("COMMIT;");
                    res.status(201).json({ 
                        id: surveyId, 
                        title, 
                        description, 
                        ownerId, 
                        createdAt, 
                        questions: savedQuestions 
                    });
                })
                .catch(err => {
                    console.error("Fehler beim Verarbeiten der Fragen/Antwortoptionen:", err.message);
                    db.run("ROLLBACK;");
                    res.status(500).json({ error: "Fehler beim Speichern der Fragen: " + err.message });
                });
        });
    });
});


// GET /api/surveys - Alle Umfragen abrufen
app.get('/api/surveys', (req, res) => {
    const sql = `
        SELECT s.id as surveyId, s.title, s.description, s.ownerId, s.createdAt,
               q.id as questionId, q.text as questionText, q.type as questionType,
               c.id as choiceId, c.text as choiceText
        FROM surveys s
        LEFT JOIN questions q ON s.id = q.survey_id
        LEFT JOIN choices c ON q.id = c.question_id
        ORDER BY s.createdAt DESC, q.id, c.id;
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Fehler beim Abrufen der Umfragen:", err.message);
            return res.status(500).json({ error: "Fehler beim Abrufen der Umfragen." });
        }

        const surveysMap = new Map();
        rows.forEach(row => {
            if (!surveysMap.has(row.surveyId)) {
                surveysMap.set(row.surveyId, {
                    id: row.surveyId,
                    title: row.title,
                    description: row.description,
                    ownerId: row.ownerId,
                    createdAt: row.createdAt,
                    questions: []
                });
            }
            const survey = surveysMap.get(row.surveyId);
            if (row.questionId) {
                let question = survey.questions.find(q => q.id === row.questionId);
                if (!question) {
                    question = {
                        id: row.questionId,
                        text: row.questionText,
                        type: row.questionType,
                        choices: []
                    };
                    survey.questions.push(question);
                }
                if (row.choiceId && (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE')) {
                    if (!question.choices.find(c => c.id === row.choiceId)) {
                        question.choices.push({
                            id: row.choiceId,
                            text: row.choiceText
                        });
                    }
                }
            }
        });
        res.json(Array.from(surveysMap.values()));
    });
});

// GET /api/surveys/:surveyId - Eine spezifische Umfrage abrufen
app.get('/api/surveys/:surveyId', (req, res) => {
    const { surveyId } = req.params;
    const sql = `
        SELECT s.id as surveyId, s.title, s.description, s.ownerId, s.createdAt,
               q.id as questionId, q.text as questionText, q.type as questionType,
               c.id as choiceId, c.text as choiceText
        FROM surveys s
        LEFT JOIN questions q ON s.id = q.survey_id
        LEFT JOIN choices c ON q.id = c.question_id
        WHERE s.id = ?
        ORDER BY q.id, c.id;
    `;
    db.all(sql, [surveyId], (err, rows) => {
        if (err) {
            console.error(`Fehler beim Abrufen der Umfrage ${surveyId}:`, err.message);
            return res.status(500).json({ error: "Fehler beim Abrufen der Umfrage." });
        }
        if (rows.length === 0) {
            return res.status(404).json({ error: "Umfrage nicht gefunden." });
        }

        const survey = {
            id: rows[0].surveyId,
            title: rows[0].title,
            description: rows[0].description,
            ownerId: rows[0].ownerId,
            createdAt: rows[0].createdAt,
            questions: []
        };

        const questionsMap = new Map();
        rows.forEach(row => {
            if (row.questionId) {
                if (!questionsMap.has(row.questionId)) {
                    questionsMap.set(row.questionId, {
                        id: row.questionId,
                        text: row.questionText,
                        type: row.questionType,
                        choices: []
                    });
                }
                const question = questionsMap.get(row.questionId);
                if (row.choiceId && (question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE')) {
                    if (!question.choices.find(c => c.id === row.choiceId)) {
                         question.choices.push({
                            id: row.choiceId,
                            text: row.choiceText
                        });
                    }
                }
            }
        });
        survey.questions = Array.from(questionsMap.values());
        res.json(survey);
    });
});

// ======== API-Endpunkte für Antworten (Responses) ========

// POST /api/surveys/:surveyId/responses - Antworten für eine Umfrage einreichen
app.post('/api/surveys/:surveyId/responses', (req, res) => {
    const { surveyId } = req.params;
    const { respondentId, answers } = req.body;

    if (!respondentId || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: "Respondent ID und mindestens eine Antwort sind erforderlich." });
    }

    // Prüfen, ob der Respondent bereits geantwortet hat
    const checkSql = `SELECT id FROM responses WHERE survey_id = ? AND respondentId = ?`;
    db.get(checkSql, [surveyId, respondentId], (err, row) => {
        if (err) {
            console.error("Fehler beim Überprüfen bestehender Antworten:", err.message);
            return res.status(500).json({ error: "Fehler beim Verarbeiten der Anfrage." });
        }
        if (row) {
            return res.status(409).json({ error: "Für diese Umfrage wurde bereits von dieser ID geantwortet." });
        }

        // Wenn noch nicht geantwortet, fortfahren
        const responseId = generateId();
        const submittedAt = new Date().toISOString();

        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const responseSql = `INSERT INTO responses (id, survey_id, respondentId, submittedAt) VALUES (?, ?, ?, ?)`;
            db.run(responseSql, [responseId, surveyId, respondentId, submittedAt], function(err) {
                if (err) {
                    console.error("Fehler beim Speichern der Hauptantwort:", err.message);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: "Fehler beim Speichern der Antwort." });
                }

                let answerPromises = answers.map(answer => {
                    return new Promise((resolve, reject) => {
                        if (!answer.questionId || typeof answer.value === 'undefined') {
                            return reject(new Error("Jede Antwort muss eine questionId und einen Wert haben."));
                        }
                        // Für MULTIPLE_CHOICE Antworten, die als Array kommen, speichern wir sie als JSON-String
                        const valueToStore = Array.isArray(answer.value) ? JSON.stringify(answer.value) : answer.value;
                        
                        const answerSql = `INSERT INTO answers (response_id, question_id, value) VALUES (?, ?, ?)`;
                        // Die Spalte 'id' in 'answers' ist AUTOINCREMENT, daher wird sie hier nicht eingefügt
                        db.run(answerSql, [responseId, answer.questionId, valueToStore], function(err) {
                            if (err) {
                                return reject(err);
                            }
                            // Wir geben die questionId und den gespeicherten Wert zurück, um die Struktur der Antwort zu bestätigen
                            resolve({ questionId: answer.questionId, value: answer.value }); 
                        });
                    });
                });

                Promise.all(answerPromises)
                    .then(savedAnswers => {
                        db.run("COMMIT;");
                        res.status(201).json({ 
                            id: responseId, 
                            surveyId, 
                            respondentId, 
                            submittedAt, 
                            answers: savedAnswers 
                        });
                    })
                    .catch(err => {
                        console.error("Fehler beim Speichern der einzelnen Antworten:", err.message);
                        db.run("ROLLBACK;");
                        res.status(500).json({ error: "Fehler beim Speichern der einzelnen Antworten: " + err.message });
                    });
            });
        });
    });
});

// GET /api/surveys/:surveyId/responses - Alle Antworten für eine Umfrage abrufen
app.get('/api/surveys/:surveyId/responses', (req, res) => {
    const { surveyId } = req.params;
    const sql = `
        SELECT r.id as responseId, r.respondentId, r.submittedAt,
               a.question_id as questionId, a.value as answerValue,
               q.type as questionType -- Um MULTIPLE_CHOICE Antworten korrekt zu parsen
        FROM responses r
        JOIN answers a ON r.id = a.response_id
        JOIN questions q ON a.question_id = q.id
        WHERE r.survey_id = ?
        ORDER BY r.submittedAt DESC, r.id, q.id;
    `;

    db.all(sql, [surveyId], (err, rows) => {
        if (err) {
            console.error(`Fehler beim Abrufen der Antworten für Umfrage ${surveyId}:`, err.message);
            return res.status(500).json({ error: "Fehler beim Abrufen der Antworten." });
        }

        const responsesMap = new Map();
        rows.forEach(row => {
            if (!responsesMap.has(row.responseId)) {
                responsesMap.set(row.responseId, {
                    id: row.responseId,
                    surveyId: surveyId,
                    respondentId: row.respondentId,
                    submittedAt: row.submittedAt,
                    answers: []
                });
            }
            const response = responsesMap.get(row.responseId);
            let parsedValue = row.answerValue;
            // Wenn die Frage MULTIPLE_CHOICE ist, versuchen wir den Wert als JSON zu parsen
            if (row.questionType === 'MULTIPLE_CHOICE') {
                try {
                    parsedValue = JSON.parse(row.answerValue);
                } catch (e) {
                    console.warn(`Konnte den MULTIPLE_CHOICE Wert für questionId ${row.questionId} nicht als JSON parsen:`, row.answerValue);
                    // Behalte den ursprünglichen String, falls das Parsen fehlschlägt
                }
            }
            response.answers.push({
                questionId: row.questionId,
                value: parsedValue
            });
        });
        res.json(Array.from(responsesMap.values()));
    });
});

// GET /api/responses/check/:surveyId/:respondentId - Prüfen, ob ein Teilnehmer bereits geantwortet hat
app.get('/api/responses/check/:surveyId/:respondentId', (req, res) => {
    const { surveyId, respondentId } = req.params;
    const sql = `SELECT id FROM responses WHERE survey_id = ? AND respondentId = ?`;
    db.get(sql, [surveyId, respondentId], (err, row) => {
        if (err) {
            console.error("Fehler beim Überprüfen des Antwortstatus:", err.message);
            return res.status(500).json({ error: "Fehler beim Überprüfen des Antwortstatus." });
        }
        res.json({ hasTaken: !!row });
    });
});


// PUT /api/surveys/:surveyId - Bestehende Umfrage aktualisieren (nur für Lehrer)
app.put('/api/surveys/:surveyId', authenticateToken, requireTeacherRole, (req, res) => {
  const { surveyId } = req.params;
  const { title, description, questions } = req.body;
  const ownerId = req.user.userId; // Benutzer-ID aus dem Token

  console.log("Update-Anfrage erhalten für Umfrage:", surveyId);
  console.log("Anfragedaten:", JSON.stringify(req.body, null, 2));

  // Validierung der Eingabedaten
  if (!title || !description || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Titel, Beschreibung und mindestens eine Frage sind erforderlich." });
  }
  
  // Validiere jede Frage
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text || !q.type) {
      return res.status(400).json({ error: `Frage ${i + 1} ist unvollständig.` });
    }
    
    if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && (!Array.isArray(q.choices) || q.choices.length === 0)) {
      return res.status(400).json({ error: `Frage ${i + 1} benötigt Antwortoptionen.` });
    }
    
    if (Array.isArray(q.choices)) {
      for (let j = 0; j < q.choices.length; j++) {
        if (!q.choices[j].text) {
          return res.status(400).json({ error: `Antwortoption ${j + 1} für Frage ${i + 1} ist unvollständig.` });
        }
      }
    }
  }

  // Überprüfen, ob die Umfrage existiert und dem Besitzer gehört
  db.get('SELECT * FROM surveys WHERE id = ?', [surveyId], (err, survey) => {
    if (err) {
      console.error("Fehler beim Abrufen der Umfrage:", err.message);
      return res.status(500).json({ error: "Fehler beim Aktualisieren der Umfrage." });
    }

    if (!survey) {
      return res.status(404).json({ error: "Umfrage nicht gefunden." });
    }
    
    console.log("Gefundene Umfrage:", survey);

    // Transaktion starten
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;");

      // Umfrage-Hauptdetails aktualisieren
      const updateSurveySql = `UPDATE surveys SET title = ?, description = ? WHERE id = ?`;
      db.run(updateSurveySql, [title, description, surveyId], function(err) {
        if (err) {
          console.error("Fehler beim Aktualisieren der Umfrage:", err.message);
          db.run("ROLLBACK;");
          return res.status(500).json({ error: "Fehler beim Aktualisieren der Umfrage." });
        }

        // Alle existierenden Antwortoptionen löschen
        db.run(`DELETE FROM choices WHERE question_id IN (SELECT id FROM questions WHERE survey_id = ?)`, [surveyId], function(err) {
          if (err) {
            console.error("Fehler beim Löschen der Antwortoptionen:", err.message);
            db.run("ROLLBACK;");
            return res.status(500).json({ error: "Fehler beim Aktualisieren der Umfrage." });
          }

          // Alle existierenden Fragen löschen
          db.run(`DELETE FROM questions WHERE survey_id = ?`, [surveyId], function(err) {
            if (err) {
              console.error("Fehler beim Löschen der Fragen:", err.message);
              db.run("ROLLBACK;");
              return res.status(500).json({ error: "Fehler beim Aktualisieren der Umfrage." });
            }

            // Neue Fragen und Antwortoptionen einfügen (ähnlich wie beim Erstellen)
            let questionPromises = questions.map((q, qIndex) => {
              return new Promise((resolve, reject) => {
                try {
                  if (!q.text || !q.type) {
                    return reject(new Error(`Frage ${qIndex + 1} ist unvollständig.`));
                  }
                  
                  // Generiere eine neue ID für die Frage oder verwende die bestehende, falls vorhanden
                  const questionId = q.id || generateId();
                  console.log(`Füge Frage ${qIndex + 1} hinzu mit ID: ${questionId}`);
                  console.log('Frage Daten:', JSON.stringify(q, null, 2));
                  
                  // Prüfe, ob die Frage-Daten korrekt formatiert sind
                  if (typeof q.text !== 'string' || typeof q.type !== 'string') {
                    console.error(`Ungültige Datentypen für Frage ${qIndex + 1}:`, { text: typeof q.text, type: typeof q.type });
                    return reject(new Error(`Ungültige Datentypen für Frage ${qIndex + 1}`));
                  }
                  
                  const questionSql = `INSERT INTO questions (id, survey_id, text, type) VALUES (?, ?, ?, ?)`;
                  db.run(questionSql, [questionId, surveyId, q.text, q.type], function(err) {
                    if (err) {
                      console.error(`Fehler beim Einfügen der Frage ${qIndex + 1}:`, err.message);
                      return reject(err);
                    }
                    
                    // Antwortoptionen speichern, falls vorhanden
                    if ((q.type === 'SINGLE_CHOICE' || q.type === 'MULTIPLE_CHOICE') && Array.isArray(q.choices)) {
                      console.log(`Füge ${q.choices.length} Antwortoptionen für Frage ${qIndex + 1} hinzu`);
                      
                      let choicePromises = q.choices.map((choice, cIndex) => {
                        return new Promise((resolveChoice, rejectChoice) => {
                          try {
                            if (!choice.text) {
                              return rejectChoice(new Error(`Antwortoption ${cIndex + 1} für Frage ${qIndex + 1} ist unvollständig.`));
                            }
                            
                            // Generiere eine neue ID für die Antwortoption oder verwende die bestehende, falls vorhanden
                            const choiceId = choice.id || generateId();
                            
                            // Prüfe, ob der Text der Antwortoption ein String ist
                            if (typeof choice.text !== 'string') {
                              console.error(`Ungültiger Datentyp für Antwortoption ${cIndex + 1} für Frage ${qIndex + 1}:`, { text: typeof choice.text });
                              return rejectChoice(new Error(`Ungültiger Datentyp für Antwortoption ${cIndex + 1} für Frage ${qIndex + 1}`));
                            }
                            
                            const choiceSql = `INSERT INTO choices (id, question_id, text) VALUES (?, ?, ?)`;
                            db.run(choiceSql, [choiceId, questionId, choice.text], function(err) {
                              if (err) {
                                console.error(`Fehler beim Einfügen der Antwortoption ${cIndex + 1} für Frage ${qIndex + 1}:`, err.message);
                                return rejectChoice(err);
                              }
                              resolveChoice({ id: choiceId, text: choice.text });
                            });
                          } catch (error) {
                            console.error(`Unerwarteter Fehler bei Antwortoption ${cIndex + 1} für Frage ${qIndex + 1}:`, error);
                            rejectChoice(error);
                          }
                        });
                      });
                      
                      Promise.all(choicePromises)
                        .then(savedChoices => {
                          console.log(`Alle Antwortoptionen für Frage ${qIndex + 1} erfolgreich gespeichert`);
                          resolve({ id: questionId, text: q.text, type: q.type, choices: savedChoices });
                        })
                        .catch(error => {
                          console.error(`Fehler beim Speichern der Antwortoptionen für Frage ${qIndex + 1}:`, error);
                          reject(error);
                        });
                    } else {
                      resolve({ id: questionId, text: q.text, type: q.type, choices: [] });
                    }
                  });
                } catch (error) {
                  console.error(`Unerwarteter Fehler bei Frage ${qIndex + 1}:`, error);
                  reject(error);
                }
              });
            });

            Promise.all(questionPromises)
              .then(savedQuestions => {
                console.log("Alle Fragen erfolgreich gespeichert. Commit der Transaktion...");
                db.run("COMMIT;", function(err) {
                  if (err) {
                    console.error("Fehler beim Commit der Transaktion:", err.message);
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: "Fehler beim Commit der Transaktion: " + err.message });
                  }
                  
                  console.log("Transaktion erfolgreich abgeschlossen. Sende Antwort...");
                  res.status(200).json({ 
                    id: surveyId, 
                    title, 
                    description, 
                    ownerId,
                    createdAt: survey.createdAt, // Behalte das ursprüngliche Erstellungsdatum
                    questions: savedQuestions 
                  });
                });
              })
              .catch(err => {
                console.error("Fehler beim Speichern der Fragen:", err.message);
                db.run("ROLLBACK;", function(rollbackErr) {
                  if (rollbackErr) {
                    console.error("Fehler beim Rollback der Transaktion:", rollbackErr.message);
                  }
                  res.status(500).json({ error: "Fehler beim Speichern der Fragen: " + err.message });
                });
              });
          });
        });
      });
    });
  });
});

// Löschen einer Umfrage (nur für Lehrer)
app.delete('/api/surveys/:surveyId', authenticateToken, requireTeacherRole, (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId;
  
  db.run('DELETE FROM surveys WHERE id = ?', [surveyId], function(err) {
    if (err) {
      console.error('Fehler beim Löschen der Umfrage:', err);
      return res.status(500).json({ error: 'Fehler beim Löschen der Umfrage' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Umfrage nicht gefunden' });
    }
    
    res.status(204).send();
  });
});

// Server starten
app.listen(PORT, () => {
  console.log(`Backend-Server läuft auf Port ${PORT}`);
});

// Fehlerbehandlung für nicht gefangene Fehler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1); 
});
