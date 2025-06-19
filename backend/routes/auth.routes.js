const express = require('express');
const router = express.Router();
const db = require('../database');
const { 
  hashPassword, 
  comparePassword, 
  generateToken,
  generateAuthToken 
} = require('../authUtils');
const { 
  generateEmailToken, 
  sendVerificationEmail,
  sendPasswordResetEmail 
} = require('../emailUtils');

/**
 * @typedef {Object} LoginRequest
 * @property {string} email - E-Mail-Adresse des Benutzers
 * @property {string} password - Passwort des Benutzers
 */

/**
 * @typedef {Object} RegisterRequest
 * @property {string} email - E-Mail-Adresse des Benutzers
 * @property {string} password - Passwort des Benutzers
 * @property {string} name - Name des Benutzers
 * @property {string} role - Rolle des Benutzers (teacher oder student)
 */

/**
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} name - User name
 * @property {string} role - User role
 * @property {string} password - Hashed password
 * @property {number} email_verified - Email verification flag
 * @property {string} verification_token - Email verification token
 * @property {string} verification_token_expires - Token expiration date
 * @property {string} created_at - Creation date
 * @property {string} last_login - Last login date
 */

/**
 * @typedef {Object} LoginResponse
 * @property {string} message - Erfolgsmeldung
 * @property {string} token - JWT-Token für die Authentifizierung
 * @property {Object} user - Benutzerinformationen
 * @property {string} user.id - ID des Benutzers
 * @property {string} user.email - E-Mail-Adresse des Benutzers
 * @property {string} user.name - Name des Benutzers
 * @property {string} user.role - Rolle des Benutzers
 * @property {boolean} user.emailVerified - Gibt an, ob die E-Mail bestätigt wurde
 */

/**
 * @typedef {Object} VerifyEmailRequest
 * @property {string} token - Verifizierungstoken aus der E-Mail
 */

/**
 * @typedef {Object} VerifyEmailResponse
 * @property {string} message - Erfolgsmeldung
 * @property {string} email - E-Mail-Adresse des Benutzers
 * @property {string} redirect - URL für die Weiterleitung
 */

/**
 * @typedef {Object} ForgotPasswordRequest
 * @property {string} email - E-Mail-Adresse des Benutzers
 */

/**
 * @typedef {Object} ForgotPasswordResponse
 * @property {string} message - Erfolgsmeldung
 * @property {string} [emailPreviewUrl] - URL für die Vorschau der E-Mail (nur in Entwicklungsumgebung)
 */

/**
 * @typedef {Object} ResetPasswordRequest
 * @property {string} token - Token für die Passwort-Zurücksetzung
 * @property {string} newPassword - Neues Passwort des Benutzers
 */

/**
 * @typedef {Object} ResetPasswordResponse
 * @property {string} message - Erfolgsmeldung
 */

/**
 * @typedef {Object} ProfileResponse
 * @property {Object} [user] - Benutzerinformationen oder null, wenn nicht authentifiziert
 * @property {string} user.id - ID des Benutzers
 * @property {string} user.email - E-Mail-Adresse des Benutzers
 * @property {string} user.name - Name des Benutzers
 * @property {string} user.role - Rolle des Benutzers
 * @property {string} user.createdAt - Erstellungsdatum des Benutzers
 * @property {string} user.lastLogin - Zeitpunkt des letzten Logins
 * @property {boolean} isAuthenticated - Gibt an, ob der Benutzer authentifiziert ist
 */

/**
 * Generiert eine zufällige ID für neue Datensätze
 * @function generateId
 * @returns {string} Eine zufällig generierte ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * @route   POST /api/auth/login
 * @desc    Authentifiziert einen Benutzer und gibt ein JWT-Token zurück
 * @param   {import('express').Request<{}, {}, LoginRequest>} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {Promise<void>} - Promise, der nach Abschluss aufgelöst wird
 * @throws  {Error} - Fehler bei der Datenbankabfrage oder Authentifizierung
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login-Versuch für E-Mail:', email);

  if (!email || !password) {
    console.log('Fehlende Anmeldedaten');
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  try {
    /**
     * @type {Promise<User|null>}
     */
    const userPromise = new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          console.error('Datenbankfehler beim Login:', err.message);
          return reject(err);
        }
        resolve(user || null);
      });
    });

    const user = await userPromise;
    console.log('Gefundener Benutzer:', user ? 'Ja' : 'Nein');

    if (!user) {
      console.log('Kein Benutzer mit dieser E-Mail gefunden');
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    console.log('Überprüfe Passwort...');
    const isPasswordValid = await comparePassword(password, user.password);
    console.log('Passwort gültig:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Ungültiges Passwort');
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    console.log('Generiere Token...');
    const token = generateAuthToken(user.id, user.email, user.role);

    const lastLogin = new Date().toISOString();
    /**
     * @type {Promise<void>}
     */
    const updatePromise = new Promise((resolve, reject) => {
      db.run('UPDATE users SET last_login = ? WHERE id = ?', [lastLogin, user.id], (err) => {
        if (err) {
          console.error('Fehler beim Aktualisieren des letzten Logins:', err.message);
          return reject(err);
        }
        resolve();
      });
    });

    await updatePromise;
    console.log('Login erfolgreich für Benutzer:', user.email);
    
    /**
     * @type {LoginResponse}
     */
    const response = {
      message: 'Erfolgreich eingeloggt',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified === 1
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ error: 'Interner Serverfehler bei der Anmeldung.' });
  }
});

// Registrierung
/**
 * @route   POST /api/auth/login
 * @desc    Authentifiziert einen Benutzer und gibt ein JWT-Token zurück
 * @param   {import('express').Request<{}, {}, LoginRequest>} req - Express Request-Objekt
 * @param   {import('express').Response} res - Express Response-Objekt
 * @returns {Promise<void>}
 * @throws  {Error} Wenn die Authentifizierung fehlschlägt oder ein Datenbankfehler auftritt
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login-Versuch für E-Mail:', email);

  if (!email || !password) {
    console.log('Fehlende Anmeldedaten');
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  try {
    /**
     * @typedef {Object} User
     * @property {string} id - User ID
     * @property {string} email - User email
     * @property {string} name - User name
     * @property {string} role - User role
     * @property {string} password - Hashed password
     * @property {number} email_verified - Email verification flag
     * @property {string} verification_token - Email verification token
     * @property {string} verification_token_expires - Token expiration date
     * @property {string} created_at - Creation date
     * @property {string} last_login - Last login date
     */

    const userPromise = new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
          console.error('Datenbankfehler beim Login:', err.message);
          return reject(err);
        }
        resolve(user || null);
      });
    });

    const user = await userPromise;
    console.log('Gefundener Benutzer:', user ? 'Ja' : 'Nein');

    if (!user) {
      console.log('Kein Benutzer mit dieser E-Mail gefunden');
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    console.log('Überprüfe Passwort...');
    const isPasswordValid = await comparePassword(password, user.password);
    console.log('Passwort gültig:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Ungültiges Passwort');
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    console.log('Generiere Token...');
    const token = generateAuthToken(user.id, user.email, user.role);

    const lastLogin = new Date().toISOString();
    /**
     * @type {Promise<void>}
     */
    const updatePromise = new Promise((resolve, reject) => {
      db.run('UPDATE users SET last_login = ? WHERE id = ?', [lastLogin, user.id], (err) => {
        if (err) {
          console.error('Fehler beim Aktualisieren des letzten Logins:', err.message);
          return reject(err);
        }
        resolve();
      });
    });

    await updatePromise;
    console.log('Login erfolgreich für Benutzer:', user.email);
    
    /**
     * @type {LoginResponse}
     */
    const response = {
      message: 'Erfolgreich eingeloggt',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.email_verified === 1
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Fehler beim Login:', error);
    res.status(500).json({ error: 'Interner Serverfehler bei der Anmeldung.' });
  }
});

// Registrierung
router.post('/register', async (req, res) => {
  console.log('Registrierungsanfrage erhalten:', JSON.stringify(req.body, null, 2));
  
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      console.log('Validierungsfehler: Fehlende Pflichtfelder');
      return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
    }

    if (role !== 'teacher' && role !== 'student') {
      console.log(`Validierungsfehler: Ungültige Rolle: ${role}`);
      return res.status(400).json({ error: 'Rolle muss entweder \'teacher\' oder \'student\' sein.' });
    }
    
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler bei der Registrierung:', err.message);
        return res.status(500).json({ error: 'Serverfehler bei der Registrierung.' });
      }

      if (user) {
        return res.status(409).json({ error: 'Diese E-Mail wird bereits verwendet.' });
      }

      const hashedPassword = await hashPassword(password);
      const userId = generateId();
      const createdAt = new Date().toISOString();
      const email_verified = 0;
      const verificationToken = generateEmailToken();
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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
          return res.status(500).json({ 
            error: 'Fehler beim Erstellen des Kontos.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
          });
        }

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
        
        res.status(201).json({ 
          message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.', 
          userId,
          emailPreviewUrl: emailResult.previewUrl
        });
      });
    });
  } catch (error) {
    console.error('Fehler bei der Registrierung:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Interner Serverfehler bei der Registrierung.',
        details: process.env.NODE_ENV === 'development' ? /** @type {Error} */(error).message : undefined
      });
    }
  }
});

// E-Mail-Adresse bestätigen
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token ist erforderlich.' });
  }

  try {
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

        const tokenExpires = new Date(user.verification_token_expires);
        if (tokenExpires < new Date()) {
          return res.status(400).json({ error: 'Token ist abgelaufen. Bitte fordern Sie einen neuen an.' });
        }

        db.run(
          'UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
          [user.id],
          function(err) {
            if (err) {
              console.error('Fehler beim Aktualisieren des Benutzers:', err.message);
              return res.status(500).json({ error: 'Fehler bei der E-Mail-Bestätigung.' });
            }

            const frontendUrl = process.env.APP_URL || 'http://localhost:5173';
            const redirectUrl = `${frontendUrl}/forgot-password?email=${encodeURIComponent(user.email)}`;
            
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
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-Mail-Adresse ist erforderlich.' });
  }

  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('Datenbankfehler bei der Passwort-Zurücksetzung:', err.message);
        return res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
      }

      if (!user) {
        return res.status(200).json({ message: 'Wenn ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail zum Zurücksetzen des Passworts gesendet.' });
      }

      const resetToken = generateEmailToken();
      const tokenId = generateId();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      const sql = `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
      db.run(
        sql,
        [tokenId, user.id, resetToken, expiresAt.toISOString(), 0, new Date().toISOString()],
        async function(err) {
          if (err) {
            console.error('Fehler beim Speichern des Reset-Tokens:', err.message);
            return res.status(500).json({ error: 'Fehler bei der Passwort-Zurücksetzung.' });
          }

          const baseUrl = process.env.APP_URL || req.headers.origin || 'http://localhost:5173';
          const emailResult = await sendPasswordResetEmail(email, user.name, resetToken, baseUrl);

          if (!emailResult.success) {
            console.error('Fehler beim Senden der Passwort-Zurücksetzen-E-Mail:', emailResult.error);
            return res.status(500).json({ error: 'Fehler beim Senden der E-Mail.' });
          }

          console.log('Passwort-Zurücksetzen-E-Mail gesendet. Vorschau:', emailResult.previewUrl);

          res.status(200).json({ 
            message: 'E-Mail zum Zurücksetzen des Passworts wurde gesendet.',
            emailPreviewUrl: emailResult.previewUrl
          });
        }
      );
    });
  } catch (error) {
    console.error('Fehler bei der Passwort-Zurücksetzung:', error);
    res.status(500).json({ error: 'Serverfehler bei der Passwort-Zurücksetzung.' });
  }
});

// Passwort zurücksetzen
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token und neues Passwort sind erforderlich.' });
  }

  try {
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

        const hashedPassword = await hashPassword(newPassword);

        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, resetToken.user_id],
          function(err) {
            if (err) {
              console.error('Fehler beim Aktualisieren des Passworts:', err.message);
              return res.status(500).json({ error: 'Fehler bei der Passwort-Zurücksetzung.' });
            }

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

// Benutzerprofil abrufen
router.get('/profile', (req, res) => {
  // Wenn kein Benutzer eingeloggt ist, gebe einen leeren Benutzer zurück
  if (!req.user || !req.user.userId) {
    console.log('Kein eingeloggter Benutzer - gebe leeres Profil zurück');
    return res.status(200).json({ 
      user: null,
      isAuthenticated: false
    });
  }

  const userId = req.user.userId;
  console.log('Lade Profil für Benutzer ID:', userId);

  db.get('SELECT id, email, name, role, created_at as createdAt, last_login as lastLogin FROM users WHERE id = ?', 
    [userId], 
    (err, user) => {
      if (err) {
        console.error('Fehler beim Abrufen des Benutzerprofils:', err.message);
        return res.status(500).json({ 
          error: 'Fehler beim Abrufen des Benutzerprofils.',
          details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }

      if (!user) {
        console.warn(`Benutzer mit ID ${userId} nicht gefunden`);
        return res.status(404).json({ 
          error: 'Benutzer nicht gefunden.',
          isAuthenticated: false
        });
      }

      console.log('Profil gefunden:', { id: user.id, email: user.email, role: user.role });
      res.status(200).json({ 
        user,
        isAuthenticated: true 
      });
  });
});

module.exports = router;
