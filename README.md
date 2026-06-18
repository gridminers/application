```
   ____      _     _           _
  / ___|_ __(_) __| |_ __ ___ (_)_ __   ___ _ __ ___
 | |  _| '__| |/ _` | '_ ` _ \| | '_ \ / _ \ '__/ __|
 | |_| | |  | | (_| | | | | | | | | | |  __/ |  \__ \
  \____|_|  |_|\__,_|_| |_| |_|_|_| |_|\___|_|  |___/

        Investitionsanträge · erfassen · auswerten · visualisieren
```

<div align="center">

[![Backend](https://img.shields.io/badge/Backend-Django%205.2%20%C2%B7%20DRF-092E20?logo=django&logoColor=white)](backend/README.md)
[![Frontend](https://img.shields.io/badge/Frontend-Angular%2022-DD0031?logo=angular&logoColor=white)](ui/README.md)
[![Parser](https://img.shields.io/badge/Parser-Python%20%C2%B7%20Azure%20OpenAI-3776AB?logo=python&logoColor=white)](parser/README.md)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)](#technologie-stack)
[![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker&logoColor=white)](#docker-empfohlen)

</div>

---

**Gridminers** ist eine Plattform zur Verwaltung von Investitionsanträgen im Infrastrukturbau
(Leitungsbau / Kanalisation). Sie kombiniert ein **Django-REST-Backend**, ein **Angular-Frontend**
und einen **PDF-Parser** mit Azure-OpenAI-Vision, der eingehende Anträge automatisch ausliest und
in die Datenbank importiert.

## Funktionen

- **Antragsverwaltung** – Erfassung von Bauprojektanträgen mit voller Kostenstruktur (Material, Fremd-, Eigen- und Ingenieurleistungen).
- **Kostenanalyse** – Geplante vs. reale Kosten mit automatischer Aggregation, filterbar nach Jahr, Sparte, Asset, Gewerk und Straße.
- **Automatischer Import** – PDFs werden vom Parser erkannt, per Vision-Modell ausgelesen und über die API ins Backend übernommen.
- **Visualisierung** – Auswertungen über ECharts-Diagramme und Straßen-Geometrien auf einer Leaflet-Karte.

## Projektstruktur

```
gridminers-app/
├── backend/            # Django REST API (Python 3.12, Django 5.2, DRF)
├── ui/                 # Angular 22 Frontend (ECharts, Leaflet)
├── parser/             # PDF-Parser mit Azure OpenAI Vision
├── docker-compose.yml  # Orchestrierung aller Services
└── README.md
```

## Docker (empfohlen)

Voraussetzungen: **Docker** & **Docker Compose**

**1. Umgebungsvariablen vorbereiten**

```bash
cp .env.example .env
# .env öffnen und Werte anpassen (SECRET_KEY, Passwörter etc.)

cp parser/.env.example parser/.env
# parser/.env öffnen und AZURE_OPENAI_API_KEY eintragen
```

**2. Services starten**

```bash
docker compose up --build       # bauen und starten
docker compose up --build -d    # im Hintergrund starten
```

**3. Anwendung öffnen**

| Service    | URL                     | Beschreibung                                  |
|------------|-------------------------|-----------------------------------------------|
| UI         | http://localhost:4200   | Angular Frontend (nginx)                      |
| Backend    | http://localhost:8000   | Django REST API                               |
| PostgreSQL | Port 5432 (intern)      | Nur innerhalb des Docker-Netzwerks            |
| Parser     | – (Hintergrund)         | Überwacht `parser/dump` und importiert PDFs   |

Die PostgreSQL-Daten werden im Docker-Volume `postgres_data` persistiert. Das Backend wartet per
Healthcheck, bis die Datenbank bereit ist, bevor Migrationen ausgeführt werden.

Der **Parser** läuft im Watch-Modus: PDFs in `parser/dump` werden automatisch verarbeitet, das
Ergebnis-JSON landet in `parser/processed_files` und wird per POST an
`http://backend:8000/api/applications/import/` (intern) übergeben. Beide Verzeichnisse sind als
Bind-Mounts eingebunden und bleiben auf dem Host erhalten.

> **Hinweis:** Die `.env`-Dateien enthalten Secrets und dürfen nicht committed werden – nur die
> `.env.example`-Vorlagen werden versioniert.

## Lokale Entwicklung (ohne Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

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

| Endpoint                                                   | Beschreibung                  |
|-----------------------------------------------------------|-------------------------------|
| `GET /api/applications/`                                  | Liste aller Anträge (filterbar) |
| `GET /api/planned_costs/`                                 | Geplante Gesamtkosten         |
| `GET /api/real_costs/`                                    | Reale Gesamtkosten            |
| `GET /api/streets/`, `/api/divisions/`, `/api/assets/`, `/api/trades/` | Lookup-Tabellen  |

Vollständige API-Dokumentation: [`backend/README.md`](backend/README.md)

## Technologie-Stack

| Komponente | Technologie                                  |
|------------|----------------------------------------------|
| Backend    | Python 3.12, Django 5.2, Django REST Framework |
| Datenbank  | PostgreSQL 16 (Docker) · SQLite (lokal)      |
| Frontend   | Angular 22, TypeScript, ECharts, Leaflet     |
| Parser     | Python, PyMuPDF, Azure OpenAI Vision         |
| Container  | Docker, Docker Compose, nginx                |
