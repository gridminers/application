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
- **Datenbank**: PostgreSQL (Production) / SQLite (Development)
- **Filterung**: django-filter 25.2
- **Treiber**: psycopg 3.3.4 (PostgreSQL)

### Frontend (separat)
- **Framework**: Angular
- **Location**: `../ui/` Verzeichnis

## Projektstruktur

```
backend/
├── backend/                    # Hauptprojekt
│   ├── settings/              # Konfiguration
│   │   ├── common.py         # Gemeinsame Einstellungen
│   │   ├── dev.py            # Development-Einstellungen
│   │   └── prod.py           # Production-Einstellungen
│   ├── urls.py               # Haupt-URL-Konfiguration
├── core/                      # Haupt-Anwendung
│   ├── models.py             # Datenbankmodelle
│   ├── views.py              # API-Views
│   ├── serializers.py        # DRF-Serializer
│   ├── filters.py            # Filter für API
│   ├── urls.py               # App-URLs
│   └── migrations/           # Datenbank-Migrationen
├── manage.py                 # Django Management
├── requirements.txt          # Python-Abhängigkeiten
└── db.sqlite3               # SQLite-Datenbank (Dev)
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
- Python 3.8+
- PostgreSQL (für Production)
- pip (Python Package Manager)

### Entwicklungsumgebung
```bash
# Repository klonen
git clone <repository-url>
cd application/backend

# Virtuelle Umgebung erstellen
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Abhängigkeiten installieren
pip install -r requirements.txt

# Datenbank-Migrationen anwenden
python manage.py migrate

# Entwicklungsserver starten
python manage.py runserver
```

### Production Setup
1. `backend/settings/prod.py` anpassen
2. Environment-Variablen setzen:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `ALLOWED_HOSTS`
3. PostgreSQL-Datenbank einrichten
4. Statische Dateien sammeln: `python manage.py collectstatic`

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
```

## Lizenz

Proprietär – Gridminers GmbH