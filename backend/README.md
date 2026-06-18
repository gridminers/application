# Gridminers Application Backend

Ein Django-REST-API Backend für Investitionsantragsverwaltung einer Infrastruktur-Firma (Leitungsbau/Kanalisation).

## Überblick

Das Backend dient als Kern für eine Datenbank und API-Endpunkte zur Frontend- und Applikationsintegration. Basierend auf Django und Python verwaltet es Investitionsanträge für Bauprojekte mit detaillierter Kostenverfolgung (geplant vs. real).

## Funktionen

- **Investitionsantragsverwaltung**: Erfassung und Verwaltung von Bauprojektanträgen
- **Kostenberechnung**: Geplante und reale Kosten mit automatischer Aggregation
- **Filterbare API-Endpunkte**: Flexible Abfragen nach Jahr, Sparte, Asset, Gewerk, Straße
- **Lookup-Tabellen**: Referenzdaten für Sparten, Assets, Gewerke, Straßen
- **JSON-basierte Zahlungspläne**: Monatliche Zahlungsraten über 3 Jahre

## Datenmodell

### Zentrale Tabellen

#### Application (Antrag)
- **Projektinformationen**: Titel, Geschäftsjahr, Ausführungszeitraum, Grund
- **Klassifizierung**: Sparte, Asset, Gewerk, Straße, PSP-Element
- **Technische Kennzahlen**: Leitungs-/Trassenlänge, Kosten pro Meter
- **Kostenberechnung**:
  - **Geplant**: Materialkosten, Fremdleistungen, Eigenleistungen, Ingenieurleistungen
  - **Real**: Tatsächliche Kosten (optional)
  - **Zuschläge**: Materialkosten- und Investitionszuschläge
- **Zahlungsplan**: JSON-Feld für monatliche Raten

#### Lookup-Tabellen
- **Division (Sparte)**: Organisatorische Einheit
- **Asset**: Technisches Betriebsmittel/Infrastrukturobjekt
- **Trade (Gewerk)**: Spezialisierung (One-to-One mit Asset)
- **Street**: Straßeninformationen

### Beziehungen
- Jeder `Application` gehört zu einer `Division`, einem `Asset`, einem `Trade` und einer `Street`
- `Trade` hat eine One-to-One-Beziehung mit `Asset`

## API-Endpunkte

### Haupt-Endpunkte
- `GET /api/applications/` - Liste aller Anträge (filterbar)
- `GET /api/applications/{id}/` - Detail eines Antrags

### Aggregierte Kostenberechnung
- `GET /api/planned_costs/` - Gesamtsumme geplanter Kosten
- `GET /api/real_costs/` - Gesamtsumme realer Kosten

### Filteroptionen (für beide Kosten-Endpunkte)
- `/year/{year}/` - Nach Geschäftsjahr
- `/street/{id}/` - Nach Straße
- `/division/{id}/` - Nach Sparte
- `/asset/{id}/` - Nach Asset
- `/trade/{id}/` - Nach Gewerk
- `/street/{id}/{year}/` - Kombinationen

### Lookup-Tabellen
- `GET /api/streets/` - Alle Straßen
- `GET /api/divisions/` - Alle Sparten
- `GET /api/assets/` - Alle Assets
- `GET /api/trades/` - Alle Gewerke

## Technologie-Stack

### Backend
- **Framework**: Django 5.2 + Django REST Framework 3.17.1
- **Datenbank**: PostgreSQL 16 (Production) / SQLite (Development)
- **Filterung**: django-filter 25.2
- **Treiber**: psycopg 3.3.4 (PostgreSQL)
- **Fuzzy-Matching**: RapidFuzz 3.14.5 (Straßennamen-Normalisierung beim Import)
- **Container**: Docker (python:3.13-slim)

### Frontend (separat)
- **Framework**: Angular
- **Location**: `../ui/` Verzeichnis

## Projektstruktur

```
backend/
├── backend/                        # Django-Projektkonfiguration
│   ├── settings/
│   │   ├── common.py               # Gemeinsame Einstellungen
│   │   ├── dev.py                  # Dev: SQLite, hartcodierte Werte
│   │   └── prod.py                 # Prod: PostgreSQL, Env-Variablen
│   ├── urls.py                     # Haupt-URL-Konfiguration
│   ├── wsgi.py
│   └── asgi.py
├── core/                           # Haupt-Django-App
│   ├── models.py                   # Datenbankmodelle
│   ├── views.py                    # API-Views (DRF Generic Views)
│   ├── serializers.py              # DRF-Serializer
│   ├── filters.py                  # django-filter Klassen
│   ├── urls.py                     # App-URLs
│   ├── field_mapping.py            # Feld-Mapping für Datenimport
│   ├── parsers.py                  # Parsing-Logik (Excel/CSV)
│   ├── importer.py                 # ETL-Pipeline: Daten einlesen
│   ├── street_matching.py          # Fuzzy-Straßennamen-Matching (RapidFuzz)
│   ├── admin.py
│   ├── fixtures/
│   │   └── streets.json            # Seed-Daten: Straßenregister Braunschweig
│   ├── management/
│   │   └── commands/
│   │       └── import_applications.py  # manage.py import_applications
│   └── migrations/                 # 4 Datenbank-Migrationen
├── Dockerfile                      # python:3.13-slim → migrate + runserver
├── .dockerignore
├── manage.py
├── requirements.txt                # Pinned Python-Abhängigkeiten
├── pyproject.toml
└── db.sqlite3                      # SQLite-Datenbank (nur Dev, nicht versioniert)
```

## Geschäftslogik

### Kostenberechnung (geplant)
```
1. Zwischenkosten = Materialkosten + Fremdleistungen + Eigenleistungen + Ingenieurleistungen
2. Materialkostenzuschlag = Materialkosten × Materialzuschlagssatz
3. Investitionszuschlag = Zwischenkosten × Investitionszuschlagssatz
4. Gesamtzuschläge = Materialkostenzuschlag + Investitionszuschlag
5. Gesamtkosten = Zwischenkosten + Gesamtzuschläge
```

### Filterung
- Apps: Nach Geschäftsjahr, Sparte, Asset, Gewerk, Straße
- Aggregation: Kostensummen nach den gleichen Kriterien

## Installation

### Voraussetzungen
- Python 3.13+
- PostgreSQL (für Production)
- pip (Python Package Manager)

### Docker (empfohlen)

Das Backend wird am einfachsten via Docker Compose gestartet (vom `application/`-Verzeichnis aus):

```bash
cp .env.example .env   # einmalig; Werte anpassen
docker compose up --build
```

Der Container setzt automatisch `DJANGO_SETTINGS_MODULE=backend.settings.prod`, wartet auf den PostgreSQL-Healthcheck und führt dann `manage.py migrate` aus. Das Backend ist anschließend unter `http://localhost:8000` erreichbar.

Benötigte Umgebungsvariablen (`.env`):

| Variable                  | Beschreibung                      |
|---------------------------|-----------------------------------|
| `SECRET_KEY`              | Django Secret Key                 |
| `DJANGO_SETTINGS_MODULE`  | `backend.settings.prod`           |
| `POSTGRES_DB`             | Datenbankname                     |
| `POSTGRES_USER`           | Datenbankbenutzer                 |
| `POSTGRES_PASSWORD`       | Datenbankpasswort                 |
| `POSTGRES_HOST`           | Hostname des DB-Containers (`db`) |
| `POSTGRES_PORT`           | Port (Standard: `5432`)           |

### Lokale Entwicklung (ohne Docker)

```bash
cd application/backend

# Virtuelle Umgebung erstellen
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Datenbank-Migrationen anwenden (SQLite)
python manage.py migrate

# Entwicklungsserver starten
python manage.py runserver
```

Die Dev-Umgebung nutzt SQLite (`db.sqlite3`) und die Settings `backend.settings.dev`.

### Unterschiede Dev vs. Docker

| Aspekt           | Dev (lokal)                    | Docker                              |
|------------------|--------------------------------|-------------------------------------|
| Settings         | `backend.settings.dev`         | `backend.settings.prod`             |
| Datenbank        | SQLite (`db.sqlite3`)          | PostgreSQL 16 (Service `db`)        |
| Konfiguration    | Hartcodiert in `dev.py`        | Über `.env`-Datei                   |
| Server           | `manage.py runserver`          | `manage.py runserver 0.0.0.0:8000`  |

## Aktuelle Status & To-Do's

### ✅ Implementiert
- ✅ Datenbankmodelle mit Beziehungen
- ✅ Read-Only API-Endpunkte
- ✅ Kosten-Aggregation
- ✅ Mehrschichtige Filterung
- ✅ Settings-Separation (Dev/Prod)

### 🔄 In Arbeit
- 🔄 API-Authentifizierung
- 🔄 CRUD-Operationen
- 🔄 Unit-Tests
- 🔄 Frontend-Integration

### ❌ Fehlt
- ❌ Authentifizierung/Autorisierung
- ❌ Create/Update/Delete Endpoints
- ❌ Geschäftslogik-Implementierung
- ❌ Test-Coverage
- ❌ CORS-Konfiguration
- ❌ API-Dokumentation

## Sicherheitshinweise

**Aktuelle Einschränkungen:**
- Keine API-Authentifizierung – API ist öffentlich zugänglich
- Hardcoded Secrets in Development Settings
- Keine CORS-Konfiguration – Frontend-Integration blockiert

**Empfohlene Maßnahmen vor Produktionseinsatz:**
1. JWT- oder Token-basierte Authentifizierung implementieren
2. SECRET_KEY über Environment-Variablen bereitstellen
3. CORS für Frontend-Domains konfigurieren
4. Rate Limiting implementieren

## Entwicklung

### Code-Konventionen
- **Models**: Deutsche Feldnamen mit deutschen Verbosenamen
- **Serializers**: Vollständige Felder-Expose
- **Views**: DRF Generic Views mit Mixins
- **Filter**: django-filter für API-Filterung

### Commands
```bash
# Migrationen erstellen/anwenden
python manage.py makemigrations
python manage.py migrate

# Superuser erstellen
python manage.py createsuperuser

# Test-Server (Development)
python manage.py runserver

# Test-Server (Production-Settings)
python manage.py runserver --settings=backend.settings.prod

# Straßen-Seed-Daten laden
python manage.py loaddata core/fixtures/streets.json

# Anträge aus Quelldaten importieren
python manage.py import_applications
```

## Lizenz

Proprietär – Gridminers GmbH