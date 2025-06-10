# Backend für die Interaktive Umfrage-Plattform

## Railway Deployment-Konfiguration

Für ein erfolgreiches Deployment auf Railway müssen folgende Umgebungsvariablen konfiguriert werden:

### Erforderliche Umgebungsvariablen

- `PORT`: Standardmäßig auf 8080 gesetzt (Railway erwartet diesen Port)
- `NODE_ENV`: Auf `production` setzen
- `DATABASE_PATH`: Pfad zur SQLite-Datenbank (z.B. `./surveys.db`)
- `APP_URL`: Die URL der Frontend-Anwendung (z.B. `https://interaktive-umfrage-plattform-production.up.railway.app`)

### Optionale SMTP-Konfiguration (für E-Mail-Funktionalität)

- `SMTP_HOST`: SMTP-Server-Host
- `SMTP_PORT`: SMTP-Server-Port
- `SMTP_SECURE`: `true` für Port 465, `false` für andere Ports
- `SMTP_USER`: SMTP-Benutzername
- `SMTP_PASS`: SMTP-Passwort
- `EMAIL_FROM_NAME`: Name des E-Mail-Absenders
- `EMAIL_FROM_ADDRESS`: E-Mail-Adresse des Absenders

## CORS-Konfiguration

Die CORS-Konfiguration erlaubt Anfragen von folgenden Ursprüngen:
- Lokale Entwicklungsserver (`localhost`)
- Vercel-Domains (`vercel.app`)
- Railway-Domains (`railway.app`)

## Datenbank

Die Anwendung verwendet SQLite als Datenbank. Für Railway-Deployments sollte beachtet werden, dass:
1. Die Datenbank bei jedem Deployment zurückgesetzt wird, wenn keine persistente Speicherung konfiguriert ist
2. Der Pfad zur Datenbank über die `DATABASE_PATH`-Umgebungsvariable konfiguriert werden kann

## Port-Konfiguration

Die Anwendung verwendet standardmäßig Port 8080, wenn keine `PORT`-Umgebungsvariable gesetzt ist. Railway erwartet, dass die Anwendung auf Port 8080 läuft.