// @ts-nocheck
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

// Debug-Middleware VOR allen anderen Middlewares platzieren
app.use((req, res, next) => {
  console.log(`[DEBUG] Anfrage an: ${req.method} ${req.originalUrl}`);
  console.log(`[DEBUG] Headers: ${JSON.stringify(req.headers)}`);
  next();
});

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

// CORS-Konfiguration
const corsOptions = {
  origin: function (origin, callback) {
    // Erlaube alle Anfragen ohne Origin-Header (z.B. cURL, Postman)
    if (!origin) {
      console.log('No origin header - allowing request');
      return callback(null, true);
    }
    
    // Debug-Ausgabe
    console.log('Incoming request from origin:', origin);
    
    // Erlaube explizit aufgeführte Domains
    if (allowedOrigins.some(allowed => 
      origin.toLowerCase() === allowed.toLowerCase()
    )) {
      console.log('Origin allowed by whitelist:', origin);
      return callback(null, true);
    }
    
    // Erlaube lokale Entwicklung
    if (process.env.NODE_ENV === 'development') {
      console.log('Allowing all origins in development');
      return callback(null, true);
    }
    
    // Blockiere nicht erlaubte Domains
    console.log('Origin not allowed:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept'
  ],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  maxAge: 86400, // 24 Stunden
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// CORS für alle Routen aktivieren
app.use(cors(corsOptions));

// Preflight für alle Routen explizit erlauben
app.options('*', cors(corsOptions));

// Manuelle CORS-Header für alle Antworten
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || /^https?:\/\/.*\.railway\.app$/.test(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
// ======================================

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response Header Middleware
// Response Header Middleware - MUSS VOR allen anderen Middlewares stehen
app.use((req, res, next) => {
  // Strikte Prüfung auf API-Pfade mit originalUrl
  if (req.originalUrl.startsWith('/api/')) {
    // Explizit Content-Type setzen und sicherstellen, dass er nicht überschrieben wird
    res.setHeader('Content-Type', 'application/json');
    
    // Wichtig: Originale res.send und res.json Methoden speichern
    const originalSend = res.send;
    const originalJson = res.json;
    
    // res.send überschreiben, um sicherzustellen, dass Content-Type erhalten bleibt
    res.send = function(body) {
      res.setHeader('Content-Type', 'application/json');
      return originalSend.call(this, body);
    };
    
    // res.json überschreiben, um sicherzustellen, dass Content-Type erhalten bleibt
    res.json = function(body) {
      res.setHeader('Content-Type', 'application/json');
      return originalJson.call(this, body);
    };
  }
  
  next();
});

// Rest der Middleware unverändert lassen
  // CORS-Header
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Preflight Request Handling
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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

// API-Routen einbinden - WICHTIG: Direkte Einbindung der einzelnen Routen
const authRoutes = require('./routes/auth.routes');
const surveyRoutes = require('./routes/survey.routes');
const surveyResponseRoutes = require('./routes/survey.responses.routes');
const studentRoutes = require('./routes/student.routes');
const teacherRoutes = require('./routes/teacher.routes');

// Direkte Einbindung der Routen unter /api
app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/survey-responses', surveyResponseRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);

// 404 Handler für API-Routen - MUSS VOR der statischen Datei-Middleware stehen
app.use('/api/*', (req, res) => {
  // Explizit JSON Content-Type setzen
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'API-Endpunkt nicht gefunden' });
});

// Statische Dateien für Produktion - NACH den API-Routen
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');

  // Statische Dateien nur für Nicht-API-Routen
  app.use((req, res, next) => {
    // Strikte Prüfung auf API-Pfade mit originalUrl
    if (req.originalUrl.startsWith('/api/')) {
      return next();
    }
    express.static(buildPath)(req, res, next);
  });

  // ❗ Wichtig: Fallback auf index.html nur für Nicht-API
  app.get('*', (req, res, next) => {
    // Strikte Prüfung auf API-Pfade mit originalUrl
    if (req.originalUrl.startsWith('/api/')) {
      return next(); // Weiter zu API-Handler oder 404
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 404 Handler
app.use(notFoundHandler);

// Globaler Fehlerhandler
app.use(errorHandler);

// Server starten
const PORT = process.env.PORT || 3001; // 3001 ist nur der Fallback für lokale Entwicklung
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
