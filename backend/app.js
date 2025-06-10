require('dotenv').config();
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

// CORS-Konfiguration
const corsOptions = {
  origin: (origin, callback) => {
    // Erlaube Anfragen ohne Origin in der Entwicklung
    if (!origin && NODE_ENV === 'development') {
      console.log('CORS: Entwicklungsumgebung - erlaube Anfrage ohne Origin');
      return callback(null, true);
    }

    // Erlaubte Ursprünge
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'https://interaktive-umfrage-plattform.vercel.app',
      'https://interaktive-umfrage-plattform-git-main-array-stack.vercel.app',
      'https://interaktive-umfrage-plattform-array-stack.vercel.app',
      'https://interaktive-umfrage-plattform-production.up.railway.app',
      'http://localhost:3001'
    ];
    
    // Für Produktion: Erlaube alle Anfragen von der Vercel-Domain und Railway-Domain
    if (NODE_ENV === 'production' && origin && (origin.includes('vercel.app') || origin.includes('railway.app'))) {
      console.log(`CORS: Erlaube Anfrage von Vercel/Railway-Domain: ${origin}`);
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`CORS: Erlaube Anfrage von: ${origin || 'keine Origin'}`);
      return callback(null, true);
    }
    
    console.warn('CORS: Zugriff verweigert für Herkunft:', origin);
    return callback(new Error('Nicht erlaubt durch CORS'));
  },
  credentials: true, // Wichtig für Cookies und Authentifizierungs-Header
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-CSRF-Token',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count']
};

// CORS Middleware
app.use(cors(corsOptions));

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
