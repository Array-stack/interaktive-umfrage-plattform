# Proxy-Konfiguration für OpinionBase

## Problem
Die Kommunikation zwischen Frontend und Backend funktioniert nicht korrekt, da:

1. Der Backend-Server auf Port 8080 läuft (statt 3001)
2. Die Proxy-Konfiguration in vite.config.ts auf Port 3001 zeigt
3. Es gibt inkonsistente API-URL-Definitionen im Projekt

## Lösung

### 1. Backend-Server-Port anpassen

Ändere in der `.env`-Datei im Backend-Verzeichnis den Port auf 3001:

```
PORT=3001
```

ODER passe die Proxy-Konfiguration in vite.config.ts an den aktuellen Port (8080) an.

### 2. Proxy-Konfiguration in vite.config.ts korrigieren

Aktualisiere die Proxy-Konfiguration in `vite.config.ts`:

```typescript
server: {
  port: 5173,
  open: true,
  proxy: {
    '/api': {
      target: 'http://localhost:8080', // Anpassen an den tatsächlichen Backend-Port
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path
    }
  }
}
```

### 3. API-URLs im Code vereinheitlichen

Stelle sicher, dass alle API-Aufrufe relative Pfade verwenden:

- In `services/authService.ts` und `services/surveyService.ts` ist bereits korrekt:
  ```typescript
  const API_BASE_URL = '/api';
  ```

- In `src/services/surveyService.ts` sollte es einheitlich sein:
  ```typescript
  const API_BASE_URL = '/api';
  ```
  statt
  ```typescript
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
  ```

### 4. CORS-Konfiguration im Backend prüfen

Stelle sicher, dass der Frontend-Port (5173) in der CORS-Konfiguration in `app.js` enthalten ist:

```javascript
const allowedOrigins = [
  'https://interaktive-umfrage-plattform.vercel.app',
  'http://localhost:5173', // Frontend-Port
  'http://localhost:5174',
  'http://localhost:3000',
  'https://interaktive-umfrage-plattform-nechts.up.railway.app'
];
```

## Testen

1. Starte den Backend-Server neu
2. Starte das Frontend neu
3. Überprüfe die Netzwerkanfragen im Browser-Entwicklertool, um sicherzustellen, dass die API-Anfragen korrekt weitergeleitet werden