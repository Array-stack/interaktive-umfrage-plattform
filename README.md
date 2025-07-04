# OpinionBase - Interaktive Umfrage-Plattform

## Übersicht

OpinionBase ist eine interaktive Umfrage-Plattform, die es Lehrern ermöglicht, Umfragen zu erstellen und Schülern, an diesen teilzunehmen. Die Anwendung besteht aus einem Frontend (React/Vite) und einem Backend (Node.js/Express).

## Lokale Entwicklung

### Voraussetzungen
- Node.js (>= 16.0.0)
- npm (>= 8.0.0)

### Frontend starten

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktionsbuild erstellen
npm run build:production
```

### Backend starten

```bash
# In das Backend-Verzeichnis wechseln
cd backend

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Produktionsserver starten
npm start
```

## Deployment

### Frontend (Vercel)

Das Frontend wird auf Vercel gehostet. Die Konfiguration ist in `vercel.json` definiert.

### Backend (Railway)

Das Backend wird auf Railway gehostet. Die Konfiguration ist in `backend/railway.json` definiert.

Weitere Informationen zum Deployment finden Sie in der [DEPLOYMENT.md](DEPLOYMENT.md)-Datei.

## Projektstruktur

```
/
├── src/                  # Frontend-Quellcode
├── public/               # Statische Dateien
├── backend/              # Backend-Quellcode
├── dist/                 # Produktionsbuild (generiert)
├── vercel.json           # Vercel-Konfiguration
├── vite.config.ts        # Vite-Konfiguration
└── package.json          # Abhängigkeiten und Skripte
```

## Funktionen

- Umfragen erstellen und verwalten
- Umfragen beantworten
- Ergebnisse visualisieren
- Benutzerauthentifizierung
- Responsive Design

## Technologien

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Chart.js
- **Backend**: Node.js, Express, SQLite
- **Deployment**: Vercel (Frontend), Railway (Backend)