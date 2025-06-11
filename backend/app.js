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
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:8080',
  'https://interaktive-umfrage-plattform.vercel.app',
  'https://interaktive-umfrage-plattform-git-main-array-stack.vercel.app',
  'https://interaktive-umfrage-plattform-array-stack.vercel.app',
  'https://interaktive-umfrage-plattform-production.up.railway.app',
  'https://interaktive-umfrage-plattform-backend.up.railway.app'
];

// Einfache CORS-Konfiguration
const corsOptions = {
  origin: function (origin, callback) {
    // Erlaube alle Subdomains von vercel.app und railway.app
    const allowedPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https?:\/\/.*\.vercel\.app$/,
      /^https?:\/\/.*\.railway\.app$/
    ];

    // Erlaube fehlenden Ursprung (z.B. bei nicht-Browser-Anfragen)
    if (!origin) return callback(null, true);

    // Erlaube explizit aufgeführte Domains
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Prüfe Muster
    if (allowedPatterns.some(pattern => pattern.test(origin))) {
      return callback(null, true);
    }

    console.warn('Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  optionsSuccessStatus: 200 // Einige ältere Browser benötigen dies
};

// CORS für alle Routen aktivieren
app.use(cors(corsOptions));

// Preflight für alle Routen erlauben
app.options('*', cors(corsOptions));
// ======================================

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging
app.use((req, res, next) => {
  const start = Date.now();
  const clientIp = getClientIp(req);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - ${clientIp}`);
  });
  
  next();
});

// Authentifizierung temporär deaktiviert
console.log('Achtung: Authentifizierung ist deaktiviert!');

// Root-Pfad definieren
app.get('/', (req, res) => {
  res.json({ message: 'Willkommen zur Umfrage-API' });
});

// API-Routen einbinden
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// Statische Dateien für Produktion
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));
  
  // Client-Side Routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 404 Handler
app.use(notFoundHandler);

// Globaler Fehlerhandler
app.use(errorHandler);

module.exports = app;