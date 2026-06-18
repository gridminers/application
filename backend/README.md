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
- **Import-Pipeline**: Annahme von Parser-Exporten über `POST /api/applications/import/` mit
  Deduplizierung (SHA256), LLM-Veredelung (siehe [LLM-Refiner](#llm-refiner-import-veredelung)),
  Fuzzy-Straßen-Matching (RapidFuzz) und transaktionalem Persistieren.
- **Istkosten-Import**: CSV-basierter Import realer Kosten via Management-Command.

## Datenmodell

### Zentrale Tabellen

#### Application (Antrag)
- **Identität**: `sha256` (Prüfsumme des Quelldokuments, `unique` – verhindert Doppelimporte)
- **Projektinformationen**: Titel, Geschäftsjahr, Ausführungszeitraum, Grund
- **Klassifizierung**: Sparte, Asset, Gewerk, Straße, PSP-Element
- **Technische Kennzahlen**: Leitungs-/Trassenlänge, Kosten pro Meter
- **Kostenberechnung** (separate Feldgruppen mit Präfix):
  - **Geplant** (`planned_*`): Materialkosten, Fremd-, Eigen- und Ingenieurleistungen, Zwischensumme, Zuschläge, Gesamtkosten
  - **Real** (`real_*`): tatsächliche Kosten (nullable, via Istkosten-Import befüllt)
  - **Zuschlagssätze**: `material_surcharge_rate`, `investment_surcharge_rate`
- **Zahlungsplan**: JSON-Feld (`payment_schedule`) für monatliche Raten
- **Metadaten**: `created_at`, `updated_at`

#### Lookup-Tabellen
- **Division (Sparte)**: Organisatorische Einheit
- **Asset**: Technisches Betriebsmittel/Infrastrukturobjekt; optional einer `Division` zugeordnet
- **Trade (Gewerk)**: One-to-One mit `Asset` (`asset` ist Primary Key)
- **Street**: Straßeninformationen

### Beziehungen
- Jeder `Application` gehört zu einer `Division` und einem `Asset` (Pflicht) sowie optional zu einem `Trade` und einer `Street` (beide nullable)
- `Asset` ist optional einer `Division` zugeordnet (`Asset.division`)
- `Trade` hat eine One-to-One-Beziehung mit `Asset`

## API-Endpunkte

Alle Endpunkte sind unter dem Präfix `/api/` registriert (Namespace `core`).

### Anträge
- `GET /api/applications/` - Liste aller Anträge (filterbar, read-only ViewSet)
- `GET /api/applications/{id}/` - Detail eines Antrags
- `POST /api/applications/import/` - Parser-Export importieren
  - `204 No Content` bei Erfolg
  - `409 Conflict` bei bereits vorhandenem Dokument (gleiche SHA256)
  - `400 Bad Request` bei Parse-/Validierungsfehlern

### Aggregierte Kostenberechnung
- `GET /api/planned_costs/` - Summe geplanter Kosten (`{ "count", "total_costs" }`)
- `GET /api/real_costs/` - Summe realer Kosten

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
- **CORS**: django-cors-headers 4.9.0
- **Fuzzy-Matching**: RapidFuzz 3.14.5 (Straßennamen-Normalisierung beim Import)
- **HTTP-Client**: requests 2.34.2 (Azure-OpenAI-Aufrufe im LLM-Refiner)
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
│   ├── views.py                    # API-Views (DRF Generic Views + ViewSets)
│   ├── serializers.py              # DRF-Serializer (inkl. ExportSerializer für Import)
│   ├── filters.py                  # django-filter Klassen
│   ├── urls.py                     # App-URLs (Router + Kosten-/Import-Routen)
│   ├── field_mapping.py            # Feld-Mapping für Datenimport
│   ├── parsers.py                  # Wert-Parser (deutsche Zahlen, Zeiträume, Zahlungsplan)
│   ├── importer.py                 # Import-Pipeline: Dedup → Refine → Parse → Persist
│   ├── refiner.py                  # LLM-Veredelung eingehender Exporte (Azure OpenAI)
│   ├── street_matching.py          # Fuzzy-Straßennamen-Matching (RapidFuzz)
│   ├── admin.py
│   ├── tests.py
│   ├── fixtures/
│   │   └── streets.json            # Seed-Daten: Straßenregister Braunschweig
│   ├── management/
│   │   └── commands/
│   │       ├── import_applications.py  # manage.py import_applications
│   │       ├── import_real_costs.py    # manage.py import_real_costs <csv>
│   │       └── rematch_streets.py      # manage.py rematch_streets
│   └── migrations/                 # Datenbank-Migrationen (0001–0006 inkl. Merge)
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

## Import-Pipeline

`POST /api/applications/import/` nimmt einen Parser-Export entgegen
(`ApplicationImportView` → `ApplicationImporter`) und durchläuft:

1. **Deduplizierung** – über die `sha256`-Prüfsumme des Quelldokuments; Duplikate werden mit `409` abgewiesen.
2. **LLM-Veredelung** – siehe unten (optional, Best-Effort).
3. **Parsen** – deterministische `ValueParser` für deutsche Zahlen, Zeiträume und Zahlungspläne.
4. **Fremdschlüssel auflösen** – inkl. Fuzzy-Straßen-Matching (RapidFuzz) gegen das `Street`-Register.
5. **Persistieren** – transaktional als neuer `Application`-Datensatz.

### LLM-Refiner (Import-Veredelung)

Vor dem deterministischen Parsen werden die rohen `targets` eines Exports durch
dasselbe Azure-OpenAI-Modell geschickt, das auch der PDF-Parser nutzt
(`refiner.py`). Der Refiner bringt extrahierte Werte in die kanonischen Formate,
die die Parser erwarten – **ohne neue Werte zu erfinden** –, sodass Anträge mit
kleinen Formatproblemen nicht mehr abgelehnt werden.

Der Schritt ist **Best-Effort**: Ohne API-Key oder bei `LLM_REFINER_ENABLED=false`
arbeitet der Refiner als Passthrough und der Import läuft unverändert über die
bestehende Parser-Infrastruktur.

| Variable                 | Beschreibung                                  | Default        |
|--------------------------|-----------------------------------------------|----------------|
| `LLM_REFINER_ENABLED`    | Refiner aktivieren (`true`/`false`)           | `true`         |
| `AZURE_OPENAI_API_KEY`   | API-Key (leer ⇒ Passthrough)                  | –              |
| `AZURE_OPENAI_MODEL`     | Deployment-/Modellname                        | `gpt-5.4`      |
| `AZURE_OPENAI_ENDPOINT`  | Responses-Endpoint                            | siehe `common.py` |
| `AZURE_OPENAI_API_VERSION` | API-Version                                 | `2025-04-01-preview` |
| `LLM_REFINER_TIMEOUT`    | Timeout in Sekunden                           | `60`           |
| `LLM_REFINER_MAX_RETRIES`| Wiederholungen bei Fehlern                    | `3`            |

## Installation

### Voraussetzungen
- Python 3.13+
- PostgreSQL (für Production)
- pip (Python Package Manager)

### Docker (empfohlen)

Das Backend wird am einfachsten via Docker Compose gestartet (aus dem Projekt-Wurzelverzeichnis):

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
| `CORS_ALLOWED_ORIGINS`    | Komma-separierte Liste erlaubter Frontend-Origins |

Zusätzlich werden die `LLM_REFINER_*`-/`AZURE_OPENAI_*`-Variablen aus dem
Abschnitt [LLM-Refiner](#llm-refiner-import-veredelung) gelesen.

### Lokale Entwicklung (ohne Docker)

```bash
cd backend

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

### Implementiert
- Datenbankmodelle mit Beziehungen
- Read-Only API-Endpunkte (Anträge, Lookups, Kosten-Aggregation)
- Mehrschichtige Filterung
- Settings-Separation (Common/Dev/Prod)
- Import-Endpunkt (`POST /api/applications/import/`) mit Dedup, Parsing und Straßen-Matching
- LLM-Veredelung eingehender Exporte (Azure OpenAI, Best-Effort)
- Istkosten-Import (`import_real_costs`) und Straßen-Rematch (`rematch_streets`)
- CORS-Konfiguration (django-cors-headers, Origins über `.env`)

### In Arbeit / Offen
- API-Authentifizierung & Autorisierung (derzeit offen zugänglich)
- Schreibende CRUD-Endpunkte für Anträge (aktuell read-only + Import)
- Test-Coverage
- API-Dokumentation (Swagger/OpenAPI)

## Sicherheitshinweise

**Aktuelle Einschränkungen:**
- Keine API-Authentifizierung – API ist öffentlich zugänglich
- Hardcoded Secret Key in den Development-Settings (`dev.py`)
- `ALLOWED_HOSTS = ["*"]` in Produktion – ggf. auf konkrete Hosts einschränken

**Empfohlene Maßnahmen vor Produktionseinsatz:**
1. JWT- oder Token-basierte Authentifizierung implementieren
2. `SECRET_KEY` ausschließlich über Environment-Variablen bereitstellen
3. `CORS_ALLOWED_ORIGINS` und `ALLOWED_HOSTS` strikt auf bekannte Domains setzen
4. Rate Limiting implementieren
5. `AZURE_OPENAI_API_KEY` als Secret behandeln (nicht committen)

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

# Istkosten (real) aus CSV importieren
python manage.py import_real_costs <dateiname.csv> [--delimiter ,] [--encoding utf-8-sig] [--dry-run]

# Straßen-Matching nach Registeränderungen erneut anwenden
python manage.py rematch_streets [--dry-run] [--score-cutoff 80]
```

## Lizenz

Proprietär – Gridminers GmbH