# Gridminers Application

Django-REST-API Backend + Angular Frontend für die Verwaltung von Investitionsanträgen.

## Projektstruktur

```
application/
├── backend/        # Django REST API
├── ui/             # Angular Frontend
├── docker-compose.yml
└── README.md
```

## Docker (empfohlen)

Voraussetzungen: Docker & Docker Compose

**1. Umgebungsvariablen vorbereiten:**

```bash
cp .env.example .env
# .env öffnen und Werte anpassen (SECRET_KEY, Passwörter etc.)
```

**2. Services starten:**

```bash
# Alle Services bauen und starten
docker compose up --build

# Im Hintergrund starten
docker compose up --build -d
```

| Service    | URL                    | Beschreibung                        |
|------------|------------------------|-------------------------------------|
| Backend    | http://localhost:8000  | Django REST API                     |
| UI         | http://localhost:4200  | Angular Frontend (nginx)            |
| PostgreSQL | Port 5432 (intern)     | Nur innerhalb des Docker-Netzwerks  |

Die PostgreSQL-Daten werden im Docker-Volume `postgres_data` persistiert.
Das Backend wartet automatisch, bis die Datenbank bereit ist (Healthcheck), bevor Migrationen ausgeführt werden.

> **Hinweis:** Die `.env`-Datei enthält Secrets und darf nicht ins Repository committed werden. Nur `.env.example` wird versioniert.

## Lokale Entwicklung (ohne Docker)

### Backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### UI

```bash
cd ui
npm install
npm start
```

## API-Endpunkte (Übersicht)

- `GET /api/applications/` – Liste aller Anträge
- `GET /api/planned_costs/` – Geplante Gesamtkosten
- `GET /api/real_costs/` – Reale Gesamtkosten
- `GET /api/streets/`, `/api/divisions/`, `/api/assets/`, `/api/trades/` – Lookup-Tabellen

Vollständige API-Dokumentation: [`backend/README.md`](backend/README.md)

## Technologie-Stack

| Komponente | Technologie                    |
|------------|-------------------------------|
| Backend    | Python 3.12, Django 5.2, DRF  |
| Datenbank  | PostgreSQL 16 (Docker) / SQLite (lokal Dev) |
| Frontend   | Angular 22, TypeScript        |
| Container  | Docker, nginx                 |
