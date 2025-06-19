const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Konfiguration des E-Mail-Transporters
let transporter;

// Debug-Ausgabe der SMTP-Konfiguration (nur bei Fehlern anzeigen)

// Initialisierung des E-Mail-Transporters
async function initializeTransporter() {
  try {
    console.log('Initialisiere SMTP-Transporter...');
    
    // Debug-Ausgabe der Umgebungsvariablen
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('SMTP_HOST:', process.env.SMTP_HOST ? 'gesetzt' : 'nicht gesetzt');
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER ? 'gesetzt' : 'nicht gesetzt');
    
    // In Produktion oder wenn SMTP_HOST gesetzt ist, verwende die SMTP-Konfiguration
    if (process.env.NODE_ENV === 'production' || process.env.SMTP_HOST) {
      console.log('Verwende SMTP-Konfiguration für Gmail');
      
      const transporterOptions = {
        service: process.env.SMTP_SERVICE || 'gmail',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production',
          ciphers: 'SSLv3',
          ignoreTLS: process.env.SMTP_IGNORE_TLS === 'true',
          requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false'
        },
        debug: true,
        logger: true,
        pool: process.env.SMTP_POOL === 'true',
        maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS || '5'),
        maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES || '100'),
        rateDelta: 1000, // 1 Sekunde Verzögerung zwischen E-Mails
        rateLimit: 100 // Maximale Anzahl von E-Mails pro Stunde
      };

      console.log('Erstelle Transporter mit Optionen:', {
        ...transporterOptions,
        auth: { user: process.env.SMTP_USER, pass: '***' } // Passwort aus Sicherheitsgründen nicht anzeigen
      });

      transporter = nodemailer.createTransport(transporterOptions);
    } else {
      // Im Entwicklungsmodus: Testkonto erstellen
      console.log('Keine SMTP-Konfiguration gefunden, erstelle Testkonto...');
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Entwicklungs-E-Mail-Transporter initialisiert');
      console.log('Test-E-Mail-Konto:', testAccount.user);
      console.log('Ethereal URL zum Anzeigen der E-Mails:', `https://ethereal.email/message/login mit ${testAccount.user}`);
    }

    // Teste die Verbindung
    await transporter.verify();
    console.log('E-Mail-Server ist bereit zum Versand von Nachrichten');
    console.log('E-Mail-Transporter erfolgreich initialisiert');
    
    return transporter;
    
  } catch (error) {
    console.error('Fehler bei der Initialisierung des E-Mail-Transporters:', error);
    
    // Spezifische Fehlermeldungen für häufige Probleme
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ECONNECTION') {
        console.error('\x1b[31m%s\x1b[0m', 'Fehler: Konnte keine Verbindung zum E-Mail-Server herstellen.');
        console.error('Bitte überprüfen Sie Ihre Internetverbindung und die SMTP-Einstellungen in der .env-Datei.');
      } else if (error.code === 'EAUTH') {
        console.error('\x1b[31m%s\x1b[0m', 'Fehler: Authentifizierung fehlgeschlagen.');
        console.error('Bitte überprüfen Sie die Anmeldedaten in der .env-Datei.');
      }
    }
    
    throw new Error('E-Mail-Konfiguration fehlgeschlagen. Bitte überprüfen Sie die Einstellungen in der .env-Datei.');
  }
}

// Token für E-Mail-Bestätigung oder Passwort-Zurücksetzung generieren
function generateEmailToken() {
  return crypto.randomBytes(32).toString('hex');
}

// E-Mail zur Bestätigung der E-Mail-Adresse senden
async function sendVerificationEmail(email, name, token, baseUrl) {
  if (!transporter) {
    await initializeTransporter();
  }
  const currentYear = new Date().getFullYear();
  let emailSent = false;
  let previewUrl = '';
  let error = null;
  
  // Erstelle den Bestätigungslink
  const resetLink = `${baseUrl}/verify-email?token=${token}`;

  // HTML-Inhalt für die E-Mail
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Passwort zurücksetzen</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto;
          background-color: #f5f7fa;
          padding: 20px;
        }
        .email-container {
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #4a6baf;
          padding: 25px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }
        .content {
          padding: 30px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #4a6baf;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #3a5a9f;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #d97706;
          padding: 12px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }
        .text-muted {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }
        .divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 24px 0;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 24px 16px !important;
          }
          .button {
            width: 100%;
            padding: 14px 24px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Passwort zurücksetzen</h1>
        </div>
        <div class="content">
          <p>Sehr geehrte/r ${name || 'Nutzer/in'},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Passwort zurücksetzen</a>
          </div>
          
          <div class="warning">
            <p><strong>Wichtig:</strong> Dieser Link ist nur für die nächste Stunde gültig. Danach müssen Sie eine neue Anfrage stellen.</p>
          </div>
          
          <p class="text-muted">Falls der Button nicht funktioniert, kopieren Sie bitte den folgenden Link in die Adresszeile Ihres Browsers:</p>
          <p style="word-break: break-all; font-size: 13px; color: #4f46e5; background-color: #f5f3ff; padding: 12px; border-radius: 4px; margin: 16px 0; line-height: 1.5;">
            ${resetLink}
          </p>
          
          <div class="divider"></div>
          
          <p class="text-muted">Falls Sie diese Anfrage nicht veranlasst haben, können Sie diese E-Mail ignorieren. Ihr Konto bleibt sicher, solange Sie den Link nicht bestätigen.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Team der Umfrage-Plattform</p>
        </div>
        <div class="footer">
          <p>© ${currentYear} Umfrage-Plattform. Alle Rechte vorbehalten.</p>
          <p class="text-muted">Diese E-Mail wurde an ${email} gesendet.</p>
          <p class="text-muted">Wenn Sie Fragen haben, antworten Sie bitte auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Nur-Text-Version für E-Mail-Clients, die kein HTML unterstützen
  const emailText = `
    Passwort zurücksetzen
    ====================
    
    Sehr geehrte/r ${name || 'Nutzer/in'},
    
    Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. 
    Bitte besuchen Sie den folgenden Link, um ein neues Passwort festzulegen:
    
    ${resetLink}
    
    Wichtiger Hinweis: Dieser Link ist nur für die nächste Stunde gültig.
    
    Falls Sie diese Anfrage nicht veranlasst haben, können Sie diese E-Mail ignorieren. 
    Ihr Konto bleibt sicher, solange Sie den Link nicht bestätigen.
    
    Mit freundlichen Grüßen,
    Ihr Team der Umfrage-Plattform
    
    ---------------------
    © ${currentYear} Umfrage-Plattform. Alle Rechte vorbehalten.
    
    Diese E-Mail wurde an ${email} gesendet.
    Wenn Sie Fragen haben, antworten Sie bitte auf diese E-Mail.
  `;

  // E-Mail-Optionen
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Passwort zurücksetzen - Umfrage-Plattform',
    text: emailText,
    html: emailHtml,
    priority: 'high',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Return-Path': process.env.EMAIL_FROM_ADDRESS,
      'Reply-To': process.env.EMAIL_FROM_ADDRESS
    }
  };

  try {
    // E-Mail senden
    const info = await transporter.sendMail(mailOptions);
    
    emailSent = true;
    
    // Logge erfolgreichen Versand (ohne sensible Daten)
    console.log('Bestätigungs-E-Mail gesendet');
  } catch (err) {
    console.error('Fehler beim Senden der Passwort-Zurücksetzungs-E-Mail:', err);
    
    if (err && typeof err === 'object' && 'message' in err) {
      error = `E-Mail konnte nicht gesendet werden: ${err.message}`;
    } else {
      error = 'E-Mail konnte nicht gesendet werden: Unbekannter Fehler';
    }
    
    // Spezifische Fehlerbehandlung für Gmail
    if (err && typeof err === 'object') {
      if ('code' in err && err.code === 'EAUTH') {
        error = 'Authentifizierungsfehler bei der E-Mail. Bitte überprüfen Sie die Anmeldedaten in der .env-Datei.';
      } else if ('code' in err && err.code === 'ECONNECTION') {
        error = 'Verbindung zum E-Mail-Server fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if ('responseCode' in err && err.responseCode === 550) {
        error = 'Die E-Mail-Adresse existiert nicht oder ist ungültig.';
      }
    }
  }

  return {
    success: emailSent,
    previewUrl: previewUrl,
    error: error
  };
}

// E-Mail zum Zurücksetzen des Passworts senden
async function sendPasswordResetEmail(email, name, token, baseUrl) {
  if (!transporter) {
    await initializeTransporter();
  }
  
  // Füge das # für den Hash-Router hinzu
  const resetLink = `${baseUrl}/#/reset-password?token=${token}`;
  const currentYear = new Date().getFullYear();
  let emailSent = false;
  let previewUrl = '';
  let error = null;

  // HTML-Inhalt für die E-Mail
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Passwort zurücksetzen</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto;
          background-color: #f5f7fa;
          padding: 20px;
        }
        .email-container {
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #4a6baf;
          padding: 25px 20px;
          text-align: center;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
        }
        .content {
          padding: 30px;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #4a6baf;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #3a5a9f;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #d97706;
          padding: 12px;
          margin: 20px 0;
          border-radius: 0 4px 4px 0;
          color: #92400e;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 13px;
          color: #6b7280;
          text-align: center;
        }
        .text-muted {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }
        .divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 24px 0;
        }
        @media only screen and (max-width: 600px) {
          .content {
            padding: 24px 16px !important;
          }
          .button {
            width: 100%;
            padding: 14px 24px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Passwort zurücksetzen</h1>
        </div>
        <div class="content">
          <p>Sehr geehrte/r ${name || 'Nutzer/in'},</p>
          <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen:</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Passwort zurücksetzen</a>
          </div>
          
          <div class="warning">
            <p><strong>Wichtig:</strong> Dieser Link ist nur für die nächste Stunde gültig. Danach müssen Sie eine neue Anfrage stellen.</p>
          </div>
          
          <p class="text-muted">Falls der Button nicht funktioniert, kopieren Sie bitte den folgenden Link in die Adresszeile Ihres Browsers:</p>
          <p style="word-break: break-all; font-size: 13px; color: #4f46e5; background-color: #f5f3ff; padding: 12px; border-radius: 4px; margin: 16px 0; line-height: 1.5;">
            ${resetLink}
          </p>
          
          <div class="divider"></div>
          
          <p class="text-muted">Falls Sie diese Anfrage nicht veranlasst haben, können Sie diese E-Mail ignorieren. Ihr Konto bleibt sicher, solange Sie den Link nicht bestätigen.</p>
          
          <p>Mit freundlichen Grüßen,<br>Ihr Team der Umfrage-Plattform</p>
        </div>
        <div class="footer">
          <p>© ${currentYear} Umfrage-Plattform. Alle Rechte vorbehalten.</p>
          <p class="text-muted">Diese E-Mail wurde an ${email} gesendet.</p>
          <p class="text-muted">Wenn Sie Fragen haben, antworten Sie bitte auf diese E-Mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Nur-Text-Version für E-Mail-Clients, die kein HTML unterstützen
  const emailText = `
    Passwort zurücksetzen
    ====================
    
    Sehr geehrte/r ${name || 'Nutzer/in'},
    
    Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. 
    Bitte besuchen Sie den folgenden Link, um ein neues Passwort festzulegen:
    
    ${resetLink}
    
    Wichtiger Hinweis: Dieser Link ist nur für die nächste Stunde gültig.
    
    Falls Sie diese Anfrage nicht veranlasst haben, können Sie diese E-Mail ignorieren. 
    Ihr Konto bleibt sicher, solange Sie den Link nicht bestätigen.
    
    Mit freundlichen Grüßen,
    Ihr Team der Umfrage-Plattform
    
    ---------------------
    © ${currentYear} Umfrage-Plattform. Alle Rechte vorbehalten.
    
    Diese E-Mail wurde an ${email} gesendet.
    Wenn Sie Fragen haben, antworten Sie bitte auf diese E-Mail.
  `;

  // E-Mail-Optionen
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: email,
    subject: 'Passwort zurücksetzen - Umfrage-Plattform',
    text: emailText,
    html: emailHtml,
    priority: 'high',
    headers: {
      'X-Priority': '1',
      'X-MSMail-Priority': 'High',
      'Importance': 'High',
      'Return-Path': process.env.EMAIL_FROM_ADDRESS,
      'Reply-To': process.env.EMAIL_FROM_ADDRESS
    }
  };

  try {
    // E-Mail senden
    const info = await transporter.sendMail(mailOptions);
    
    emailSent = true;
    
    // Logge erfolgreichen Versand (ohne sensible Daten)
    console.log('Passwort-Zurücksetzungs-E-Mail gesendet');
  } catch (err) {
    console.error('Fehler beim Senden der Passwort-Zurücksetzungs-E-Mail:', err);
    
    if (err && typeof err === 'object' && 'message' in err) {
      error = `E-Mail konnte nicht gesendet werden: ${err.message}`;
    } else {
      error = 'E-Mail konnte nicht gesendet werden: Unbekannter Fehler';
    }
    
    // Spezifische Fehlerbehandlung für Gmail
    if (err && typeof err === 'object') {
      if ('code' in err && err.code === 'EAUTH') {
        error = 'Authentifizierungsfehler bei der E-Mail. Bitte überprüfen Sie die Anmeldedaten in der .env-Datei.';
      } else if ('code' in err && err.code === 'ECONNECTION') {
        error = 'Verbindung zum E-Mail-Server fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung.';
      } else if ('responseCode' in err && err.responseCode === 550) {
        error = 'Die E-Mail-Adresse existiert nicht oder ist ungültig.';
      }
    }
  }

  return {
    success: emailSent,
    previewUrl: previewUrl,
    error: error
  };
}

module.exports = {
  initializeTransporter,
  generateEmailToken,
  sendVerificationEmail,
  sendPasswordResetEmail
};
