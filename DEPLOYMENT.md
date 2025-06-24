# Deployment-Anleitung für OpinionBase

## Übersicht

Dieses Projekt besteht aus zwei Teilen:
1. **Frontend**: React-Anwendung (Vite)
2. **Backend**: Node.js/Express API

## Deployment-Strategie

### Frontend (Vercel)

Das Frontend wird auf Vercel gehostet. Die Konfiguration ist in `vercel.json` definiert.

```bash
# Frontend deployen
git push
# Vercel erkennt automatisch Änderungen und startet ein neues Deployment
```

### Backend (Railway)

Das Backend wird auf Railway gehostet. Die Konfiguration ist in `backend/railway.json` definiert.

```bash
# Backend deployen
cd backend
git push
# Railway erkennt automatisch Änderungen und startet ein neues Deployment
```

## Umgebungsvariablen

### Frontend (Vercel)

Folgende Umgebungsvariablen müssen in Vercel konfiguriert werden:

- `VITE_API_BASE_URL`: URL des Backend-API (z.B. https://interaktive-umfrage-plattform-nechts.up.railway.app/api)

### Backend (Railway)

Folgende Umgebungsvariablen müssen in Railway konfiguriert werden:

- `NODE_ENV`: `production`
- `PORT`: `8080` (oder vom Anbieter vorgegeben)
- `JWT_SECRET`: Geheimer Schlüssel für JWT-Tokens
- `DATABASE_URL`: Pfad zur Datenbank
- `SMTP_*`: SMTP-Konfiguration für E-Mail-Versand

## Deployment-Checkliste

- [ ] Frontend-Code ist getestet und bereit für Produktion
- [ ] Backend-Code ist getestet und bereit für Produktion
- [ ] Umgebungsvariablen sind konfiguriert
- [ ] API-Endpunkte sind korrekt konfiguriert
- [ ] CORS-Einstellungen sind korrekt konfiguriert
- [ ] Datenbank-Migrationen sind ausgeführt

## Troubleshooting

### CORS-Fehler

Wenn CORS-Fehler auftreten, überprüfen Sie die CORS-Einstellungen im Backend und die API-URL im Frontend.

### API-Verbindungsprobleme

Stellen Sie sicher, dass die API-URL korrekt konfiguriert ist und das Backend erreichbar ist.

### Datenbank-Probleme

Stellen Sie sicher, dass die Datenbank korrekt konfiguriert ist und die Migrationen ausgeführt wurden.