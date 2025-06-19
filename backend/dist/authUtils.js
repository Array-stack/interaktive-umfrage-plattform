const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createError } = require('./middleware/errorHandler');
// Konfiguration aus Umgebungsvariablen mit Fallback-Werten
const JWT_SECRET = process.env.JWT_SECRET || 'umfrage-plattform-secret-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'; // Standard: 24 Stunden
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '10') || 10;
const TOKEN_EXPIRATION = {
    PASSWORD_RESET: 3600000, // 1 Stunde in Millisekunden
    EMAIL_VERIFICATION: 86400000, // 24 Stunden in Millisekunden
};
/**
 * Generiert einen zufälligen Token mit der angegebenen Länge
 * @param {number} length - Länge des Tokens in Bytes (Standard: 32)
 * @returns {string} Hex-kodierter Token
 */
const generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};
/**
 * Hasht ein Passwort mit bcrypt
 * @param {string} password - Das zu hashende Passwort
 * @returns {Promise<string>} Gehashtes Passwort
 */
const hashPassword = async (password) => {
    if (!password || typeof password !== 'string') {
        throw createError('Ungültiges Passwortformat', 400, 'INVALID_PASSWORD');
    }
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};
/**
 * Vergleicht ein Klartext-Passwort mit einem Hash
 * @param {string} password - Das zu überprüfende Passwort
 * @param {string} hashedPassword - Der gespeicherte Hash
 * @returns {Promise<boolean>} true, wenn das Passwort übereinstimmt
 */
const comparePassword = async (password, hashedPassword) => {
    if (!password || !hashedPassword) {
        return false;
    }
    return await bcrypt.compare(password, hashedPassword);
};
/**
 * Generiert einen JWT-Token für die Authentifizierung
 * @param {string} userId - Die Benutzer-ID
 * @param {string} email - Die E-Mail des Benutzers
 * @param {string} role - Die Rolle des Benutzers (z.B. 'teacher', 'student')
 * @returns {string} JWT-Token
 */
const generateAuthToken = (userId, email, role) => {
    if (!userId || !email || !role) {
        throw createError('Fehlende erforderliche Felder für Token-Generierung', 500, 'TOKEN_GENERATION_ERROR');
    }
    // @ts-ignore - JWT_SECRET ist ein gültiger Secret-Typ für jwt.sign
    return jwt.sign({
        userId,
        email,
        role,
        iat: Math.floor(Date.now() / 1000) // Issued At
    }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'umfrage-plattform-api',
        audience: ['web', 'mobile']
    });
};
/**
 * Verifiziert einen JWT-Token
 * @param {string} token - Der zu verifizierende JWT-Token
 * @returns {Object|null} Die dekodierten Token-Daten oder null bei Fehler
 */
const verifyAuthToken = (token) => {
    if (!token)
        return null;
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'umfrage-plattform-api',
            audience: ['web', 'mobile']
        });
    }
    catch (error) {
        console.error('Token-Verifizierungsfehler:', error instanceof Error ? error.message : 'Unbekannter Fehler');
        return null;
    }
};
/**
 * Middleware zur Authentifizierung von Anfragen mit JWT
 * Fügt die Benutzerdaten dem Request-Objekt hinzu, wenn gültig
 */
const authenticateToken = (req, res, next) => {
    // Ignoriere Authentifizierung für öffentliche Routen
    const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/verify-email', '/api/health', '/api/surveys/recommended'];
    if (publicRoutes.includes(req.path)) {
        return next();
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) {
        return res.status(401).json({
            error: {
                message: 'Kein Authentifizierungstoken bereitgestellt',
                code: 'MISSING_TOKEN'
            }
        });
    }
    const decoded = verifyAuthToken(token);
    if (!decoded) {
        return res.status(401).json({
            error: {
                message: 'Ungültiger oder abgelaufener Token',
                code: 'INVALID_TOKEN'
            }
        });
    }
    // Füge Benutzerdaten zum Request-Objekt hinzu
    req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
    };
    next();
};
/**
 * Middleware zur Überprüfung, ob der Benutzer ein Lehrer ist
 * @returns {void}
 */
const requireTeacherRole = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: {
                message: 'Nicht authentifiziert',
                code: 'UNAUTHORIZED'
            }
        });
    }
    if (req.user.role !== 'teacher') {
        return res.status(403).json({
            error: {
                message: 'Nur Lehrer können diese Aktion ausführen',
                code: 'FORBIDDEN',
                userRole: req.user.role
            }
        });
    }
    next();
};
/**
 * Middleware zur Überprüfung der Benutzerrolle
 * @param {...string} allowedRoles - Erlaubte Rollen
 * @returns {Function} Middleware-Funktion
 */
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: {
                    message: 'Nicht authentifiziert',
                    code: 'UNAUTHORIZED'
                }
            });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: {
                    message: 'Keine Berechtigung für diese Aktion',
                    code: 'FORBIDDEN',
                    requiredRoles: allowedRoles,
                    userRole: req.user.role
                }
            });
        }
        next();
    };
};
/**
 * Generiert einen Token für die E-Mail-Bestätigung
 * @param {string} userId - Die Benutzer-ID
 * @param {string} email - Die E-Mail des Benutzers
 * @returns {{token: string, expiresAt: Date}} Token und Ablaufdatum
 */
const generateEmailVerificationToken = (userId, email) => {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.EMAIL_VERIFICATION);
    // In einer Produktionsumgebung würde man den Token hier in der Datenbank speichern
    // z.B. await saveVerificationToken(userId, token, expiresAt);
    return { token, expiresAt };
};
/**
 * Generiert einen Token zum Zurücksetzen des Passworts
 * @param {string} userId - Die Benutzer-ID
 * @returns {{token: string, expiresAt: Date}} Token und Ablaufdatum
 */
const generatePasswordResetToken = (userId) => {
    const token = generateToken(32);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION.PASSWORD_RESET);
    // In einer Produktionsumgebung würde man den Token hier in der Datenbank speichern
    // z.B. await savePasswordResetToken(userId, token, expiresAt);
    return { token, expiresAt };
};
module.exports = {
    // Token-Funktionen
    generateToken,
    generateAuthToken,
    verifyAuthToken,
    // Passwort-Funktionen
    hashPassword,
    comparePassword,
    // Middleware
    authenticateToken,
    authorizeRole,
    requireTeacherRole,
    // Spezielle Token-Generatoren
    generateEmailVerificationToken,
    generatePasswordResetToken,
    // Konstanten
    TOKEN_EXPIRATION
};
