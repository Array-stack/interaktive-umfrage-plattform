// Lade Umgebungsvariablen basierend auf der aktuellen Umgebung
const envPath = process.env.NODE_ENV === 'production' 
  ? './.env.production' 
  : '.env';
require('dotenv').config({ path: envPath });
const express = require('express');
const cors = require('cors');
const path = require('path');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const db = require('./database');

// Express App erstellen
const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';

// Hilfsfunktion zur Ermittlung der Client-IP
const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  return req.connection.remoteAddress || req.socket.remoteAddress || req.ip;
};

// Trust Proxy für korrekte IP-Erkennung hinter Proxies
app.set('trust proxy', true);

// ======== CORS-Konfiguration =========
const allowedOrigins = [
  'https://interaktive-umfrage-plattform.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://interaktive-umfrage-plattform-nechts.up.railway.app',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin.toLowerCase())) return callback(null, true);
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    callback(new Error('Not allowed by CORS'));
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
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || /^https?:\/\/.*\.railway\.app$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sicherheits- und Response-Header Middleware
// Sicherheits- und Response-Header Middleware
app.use((req, res, next) => {
  // Nur für API-Routen den Content-Type auf application/json setzen
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  const clientIp = getClientIp(req);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${clientIp}`);
  });
  next();
});

console.log('Achtung: Authentifizierung ist deaktiviert!');

// API-Routen
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// API-404-Absicherung
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
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    express.static(buildPath)(req, res, next);
  });

  // Fallback auf index.html für Nicht-API-Routen
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
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
