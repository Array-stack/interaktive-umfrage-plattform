// Lade Umgebungsvariablen basierend auf der aktuellen Umgebung
const envPath = process.env.NODE_ENV === 'production'
    ? './.env.production'
    : '.env';
require('dotenv').config({ path: envPath });
// Setze die Umgebungsvariable für den Datenbankpfad explizit
process.env.DATABASE_PATH = process.env.DATABASE_PATH || './data/surveys.db';
console.log('Datenbankpfad in app.js:', process.env.DATABASE_PATH);
const express = require('express');
const path = require('path'); // Das 'path'-Modul von Node.js importieren
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const db = require('./database');
// TypeScript-Typen für bessere Entwicklererfahrung
/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 */
// Express App erstellen
const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
// Hilfsfunktion zur Ermittlung der Client-IP
/**
 * @param {Request} req - Express Request Objekt
 * @returns {string} Client IP-Adresse
 */
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const ips = forwardedStr.split(',');
        return ips[0].trim();
    }
    return req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip || '127.0.0.1';
};
// Trust Proxy für korrekte IP-Erkennung hinter Proxies
app.set('trust proxy', true);
// ======== CORS-Konfiguration =========
const allowedOrigins = [
    'https://interaktive-umfrage-plattform.vercel.app',
    'https://interaktive-umfrage-plattform-icn72borz.vercel.app',
    'https://interaktive-umfrage-plattform.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://interaktive-umfrage-plattform-nechts.up.railway.app',
];
const corsOptions = {
    origin: function (/** @type {string | undefined} */ origin, /** @type {function(Error | null, boolean): void} */ callback) {
        if (!origin) {
            return callback(null, true); // Same-origin, erlaubt
        }
        // Vercel-Domain explizit überprüfen
        if (origin.includes('vercel.app')) {
            console.log('Vercel-Domain erkannt, CORS erlaubt:', origin);
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin.toLowerCase())) {
            return callback(null, true); // Whitelisted, erlaubt
        }
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true); // Im Entwicklungsmodus alles erlauben
        }
        console.log('CORS-Anfrage abgelehnt für Origin:', origin);
        // KORRIGIERTER AUFRUF:
        // Übergeben Sie den Fehler UND den Status 'false' für nicht erlaubt.
        callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// CORS-Header für alle Antworten setzen
/**
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
app.use((req, res, next) => {
    const origin = req.headers.origin;
    // Vercel-Domain oder erlaubte Ursprünge oder Railway-App
    if (origin && (allowedOrigins.includes(origin) ||
        /^https?:\/\/.*\.railway\.app$/.test(origin) ||
        /^https?:\/\/.*\.vercel\.app$/.test(origin))) {
        console.log('CORS-Header gesetzt für Origin:', origin);
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        // Bei OPTIONS-Anfragen sofort antworten
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
    }
    next();
});
// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Sicherheits- und Response-Header Middleware
/**
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
app.use((req, res, next) => {
    // Diese Zeile wurde entfernt, da sie mit res.json() in Konflikt geraten könnte
    // und zu 'Unexpected Content-Type: text/plain'-Fehlern führen kann
    // if (req.path.startsWith('/api/')) {
    //   res.setHeader('Content-Type', 'application/json');
    // }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (req.method === 'OPTIONS')
        return res.status(200).end();
    next();
});
// Logging
/**
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
app.use((req, res, next) => {
    const start = Date.now();
    const clientIp = getClientIp(req);
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${clientIp}`);
    });
    next();
});
// Authentifizierungsstatus basierend auf Umgebungsvariable
const authEnabled = process.env.ENABLE_AUTH === 'true';
if (authEnabled) {
    console.log('Authentifizierung ist aktiviert.');
}
else {
    console.log('Achtung: Authentifizierung ist deaktiviert!');
}
// API-Routen
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);
// API-404-Absicherung
/**
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
app.use('/api', (req, res, next) => {
    res.status(404).json({
        error: 'API-Endpunkt nicht gefunden',
        path: req.originalUrl
    });
});
// Produktion: Statische Dateien & HTML-Fallback
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../dist');
    // Nur statisch ausliefern, wenn nicht /api/
    /**
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    app.use((req, res, next) => {
        if (req.path.startsWith('/api/'))
            return next();
        express.static(buildPath)(req, res, next);
    });
    // Fallback auf index.html für Nicht-API-Routen
    /**
     * @param {Request} req
     * @param {Response} res
     * @param {NextFunction} next
     */
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/'))
            return next();
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}
// 404 Handler für alle anderen
app.use(notFoundHandler);
// Globaler Fehlerhandler
app.use(errorHandler);
// Server starten
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT} in ${process.env.NODE_ENV || 'development'} Mode`);
    console.log(`Datenbankpfad: ${process.env.DATABASE_PATH || 'Standardpfad wird verwendet'}`);
});
// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM empfangen. Server wird heruntergefahren...');
    server.close(() => {
        console.log('Server heruntergefahren');
        process.exit(0);
    });
});
module.exports = app;
