# AGENTS.md – Gridminers Backend Development Guidelines

Dieses Dokument entrichtet Richtlinien für Entwickler und AI-Assistenten (wie Mammouth Code) zur Arbeit am Gridminers Backend-Projekt.

## Projekt-Kontext

### Kernziel
Bereitstellung eines Django-REST-API-Backends für die Verwaltung von Investitionsanträgen einer Infrastruktur-Firma. Das Backend dient als Datenbank-Kern und API-Schnittstelle für Frontend- und andere Applikationen.

### Primäre Nutzer
- **Frontend (Angular)**: Präsentationsschicht für Benutzerinteraktion
- **Business-Applikationen**: Integration mit ERP/CRM-Systemen
- **Reporting-Tools**: Datenaggregation und -analyse

### Geschäftsdomain
Investitionsanträge für Bauprojekte im Bereich Leitungsbau/Kanalisation mit detaillierter Kostenverfolgung und Planung.

## Architektur-Prinzipien

### 1. Datenmodellierung
- **Deutsch-Englische Mapping**: Deutsche Feldnamen mit deutschen `verbose_name`
- **Decimal für Geldbeträge**: Konsistente `DecimalField`-Verwendung
- **JSON für komplexe Strukturen**: `JSONField` für Zahlungspläne
- **ForeignKey Beziehungen**: Klare Beziehungen zwischen Haupt- und Lookup-Tabellen

### 2. API-Design
- **RESTful Endpoints**: Vorhersagbare URL-Struktur
- **Read-Only als Basis**: Sicherheits-first Ansatz
- **Aggregation Layer**: Getrennte Endpunkte für aggregierte Daten
- **Filter-Before-Aggregate**: Filterung auf Query-Ebene vor Aggregation

### 3. Code-Organisation
- **App-basierte Struktur**: `core` als Haupt-App
- **Settings-Separation**: Dev/Prod/Common Trennung
- **DRF-Patterns**: Viewsets, Serializer, Filter-Klassen

## Entwicklungsworkflow für AI-Assistenten

### Bevorzugte Tools & Patterns

#### Datei-Suche und Exploration
```typescript
// Bevorzugt für Initiale Exploration
Task(explore, "very thorough", "Suche nach Patterns")

// Für spezifische Suchen
Glob("**/*.py")  // Python-Dateien
Glob("**/settings.py")  // Settings-Dateien
Read("requirements.txt")  // Abhängigkeiten
```

#### Code-Analyse
```typescript
// Models verstehen
Read("core/models.py")
// API-Endpoints analysieren
Read("core/views.py")
// URL-Routen nachvollziehen
Read("backend/urls.py")
Read("core/urls.py")
```

#### Änderungen durchführen
```typescript
// ALWAYS zuerst die Datei lesen
Read("core/models.py")
// DANN editieren mit exaktem Content
Edit("core/models.py", oldString, newString)
```

### Konfigurations-Checks vor Änderungen

**Vor jedem Edit:**
1. ✅ Settings-Struktur prüfen (`common.py`, `dev.py`, `prod.py`)
2. ✅ INSTALLED_APPS auf `'core'` prüfen
3. ✅ REST_FRAMEWORK Konfiguration prüfen
4. ✅ URL-Konfiguration prüfen

**Nach jedem Edit:**
1. ✅ Python Syntax-Check: `python manage.py check`
2. ✅ Migrationen prüfen: `python manage.py makemigrations --dry-run`
3. ✅ Server-Start testen: `python manage.py runserver --dry-run`

## Code-Konventionen

### Models (`core/models.py`)
```python
# Deutsche Feldnamen, englische Klassen
class Application(models.Model):
    project_title = models.CharField(
        max_length=255,
        verbose_name="Projekttitel",  # Deutsch
    )
    fiscal_year = models.PositiveSmallIntegerField(
        verbose_name="Geschäftsjahr",
        help_text="Deutsche Hilfe-Texte",
    )
```

### Views (`core/views.py`)
```python
# DRF Generic Views mit klarer Dokumentation
class PlannedCostListView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/"""
    
    def get(self, request):
        return super().get(request)
```

### Serializer (`core/serializers.py`)
```python
# Vollständige Feld-Exposition
class ApplicationSerializer(serializers.ModelSerializer):
    """Vollständiges Application-Objekt."""
    
    class Meta:
        model = Application
        fields = '__all__'
```

### URLs (`core/urls.py`, `backend/urls.py`)
```python
# Klare URL-Hierarchie mit Kommentaren
urlpatterns = [
    # Lookup-Tabellen
    path('streets/', StreetViewSet.as_view({'get': 'list'})),
    path('streets/<int:pk>/', StreetViewSet.as_view({'get': 'retrieve'})),
    
    # Aggregierte Kosten
    path('planned_costs/', PlannedCostListView.as_view()),
    path('planned_costs/year/<int:year>/', PlannedCostYearView.as_view()),
]
```

## Sicherheitsrichtlinien

### Absolute No-Gos
1. **❌ NIEMALS** hardcoded Secrets commiten
2. **❌ NIEMALS** Authentifizierung deaktivieren für Benutzbarkeit
3. **❌ NIEMALS** CORS auf "*" setzen ohne Validierung
4. **❌ NIEMALS** Admin- oder Debug-Endpunkte öffentlich verfügbar machen

### Security-First Implementierung
1. **Stets JWT/Token-Auth** für neue Endpunkte
2. **Stets CORS-Whitelist** konfigurieren
3. **Stets Django Security Middleware** aktiviert lassen
4. **Stets Input-Validierung** auf Model- und Serializer-Ebene

## Test-Strategie

### Anforderungen vor Commits
1. **✅ Models**: Validierungs-Tests
2. **✅ Serializer**: Field-Level Tests
3. **✅ Views**: Endpunkt-Verfügbarkeit
4. **✅ API**: CRUD-Operationen für neue Features
5. **✅ Authentication**: Auth-Flow Tests für geschützte Endpunkte

### Test-Struktur
```
tests/
├── test_models.py          # Model-Validierung
├── test_serializers.py     # Serializer-Logik
├── test_views.py          # View-Logik
├── test_api.py            # API-Endpunkte
└── test_auth.py           # Authentifizierung
```

## Priorisierte Entwicklungs-Roadmap

### Phase 1: Kritische Sicherheit (Sofort)
1. **Authentifizierung**: JWT-Basierte Auth implementieren
2. **CORS-Konfiguration**: Whitelist für Frontend-Domains
3. **Environment-Variablen**: Secrets aus Code entfernen

### Phase 2: Core-Funktionalität (Kurzfristig)
1. **CRUD-Operationen**: Create/Update/Delete für Applications
2. **Business Logic**: Kostenberechnung aktivieren
3. **Validierung**: Geschäftsregeln implementieren

### Phase 3: Entwicklungshilfen (Mittelfristig)
1. **Test-Suite**: Komplette Test-Coverage
2. **API-Dokumentation**: Swagger/OpenAPI
3. **Dev-Tools**: Debug-Endpunkte, Health-Checks

### Phase 4: Production-Ready (Langfristig)
1. **Performance**: Caching, Indizes, Query-Optimierung
2. **Monitoring**: Logging, Metrics, Alerting
3. **CI/CD**: Automatisierte Tests und Deployment

## Häufige Tasks & Lösungen

### Neue Model-Felder hinzufügen
```bash
# 1. Model editieren
Edit("core/models.py", oldFieldDefinition, newFieldDefinition)

# 2. Migration generieren
python manage.py makemigrations

# 3. Migration anwenden
python manage.py migrate

# 4. Serializer aktualisieren
Edit("core/serializers.py", oldSerializer, newSerializer)
```

### Neue API-Endpunkte erstellen
```bash
# 1. View in views.py hinzufügen
# 2. URL in urls.py registrieren
# 3. Filter/Serializer bei Bedarf aktualisieren
# 4. Tests schreiben
```

### Authentifizierung hinzufügen
```python
# common.py REST_FRAMEWORK aktualisieren
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}
```

## Fehlerbehandlung & Debugging

### Häufige Fehler und Lösungen

#### "ModuleNotFoundError: No module named 'core'"
```bash
# Prüfen ob core in INSTALLED_APPS
Check: backend/settings/common.py INSTALLED_APPS
# Core App prüfen
Read("core/apps.py")
# __init__.py Dateien prüfen
```

#### "Database table does not exist"
```bash
# Migrationen ausführen
python manage.py migrate
# Oder Migrationen zurücknehmen
python manage.py migrate core zero
python manage.py migrate
```

#### "CSRF verification failed"
```python
# Für API normal - CSRF nur für Django Forms
# Für Entwicklung ausschalten (nicht in Production!)
# Oder korrekte CSRF-Tokens verwenden
```

#### "NoReverseMatch" in URLs
```bash
# URL-Patterns prüfen
python manage.py show_urls
# URL-Konfiguration debuggen
# URL-Namen vs. Patterns vergleichen
```

## Best Practices für AI-Assistenten

### Do's
- ✅ **Immer erst analyiseren**, dann implementieren
- ✅ **Settings trennen**: Dev vs. Prod beachten
- ✅ **Deutsche Domain-Sprache**: Models + Hilfe-Texte
- ✅ **Migrationen beachten**: Model-Änderungen brauchen Migrationen
- ✅ **Backup vor großen Änderungen**: Git commit oder Backup

### Don'ts
- ❌ **Nie alle Felder exposed** ohne Validierung
- ❌ **Nie Debug-Informationen** in Production-Endpunkten
- ❌ **Nie Passwörter/Secrets** in Code/Commits
- ❌ **Nie CORS auf "*"** in Production
- ❌ **Nie ohne Tests** kritische Logik ändern

## Kommunikation mit Entwicklern

### Code-Kommentare
- **TODO**: Funktionen die implementiert werden müssen
- **FIXME**: Bekannte Probleme die behoben werden müssen
- **HACK**: Temporäre Lösungen die refactored werden müssen
- **OPTIMIZE**: Performance-Verbesserungspotential

### Commit Messages
```
Feat: Neue Funktionalität
Fix: Bug-Behebung
Docs: Dokumentations-Änderungen
Style: Code-Formatierung (keine Logik-Änderungen)
Refactor: Code-Restrukturierung
Test: Test-Änderungen
Chore: Wartungsaufgaben (Dependencies, etc.)
```

## Deployment-Checkliste

### Pre-Flight Check
- [ ] `SECRET_KEY` über Environment-Variable
- [ ] `DEBUG = False` in Production
- [ ] `ALLOWED_HOSTS` korrekt konfiguriert
- [ ] CORS Whitelist gesetzt
- [ ] Datenbank-Migrationen angewendet
- [ ] Statische Dateien gesammelt
- [ ] Tests durchgelaufen

### Post-Deployment
- [ ] Health-Check Endpoint verfügbar
- [ ] API-Endpunkte erreichbar
- [ ] Authentifizierung funktioniert
- [ ] Datenbank-Verbindung stabil
- [ ] Logging funktioniert
- [ ] Monitoring eingerichtet

## Docker-Betrieb

### Settings für Docker

Die Datei `backend/settings/docker.py` erbt von `dev.py` und setzt `ALLOWED_HOSTS = ["*"]`, damit der Container von außen erreichbar ist. Sie wird über die Umgebungsvariable `DJANGO_SETTINGS_MODULE=backend.settings.docker` aktiviert (im `Dockerfile` gesetzt).

**Neue Settings-Dateien** für andere Umgebungen (z. B. `staging.py`) genauso anlegen: von `common.py` oder `dev.py` erben und nur die Delta-Werte überschreiben.

### Umgebungsvariablen

Alle Secrets und Konfigurationswerte werden über eine `.env`-Datei übergeben (liegt in `application/`, eine Ebene über `backend/`). Die Datei wird **nicht versioniert** – nur `.env.example` liegt im Repository.

Benötigte Variablen:

| Variable              | Beschreibung                            |
|-----------------------|-----------------------------------------|
| `SECRET_KEY`          | Django Secret Key                       |
| `DJANGO_SETTINGS_MODULE` | z. B. `backend.settings.prod`        |
| `POSTGRES_DB`         | Datenbankname                           |
| `POSTGRES_USER`       | Datenbankbenutzer                       |
| `POSTGRES_PASSWORD`   | Datenbankpasswort                       |
| `POSTGRES_HOST`       | Hostname des DB-Containers (`db`)       |
| `POSTGRES_PORT`       | Port (Standard: `5432`)                 |

### Container starten

```bash
# Vom application/-Verzeichnis aus
cp .env.example .env   # einmalig, dann Werte anpassen
docker compose up --build
```

Backend läuft auf Port **8000**, Migrationen werden automatisch beim Start ausgeführt.
Der Backend-Container startet erst, wenn der PostgreSQL-Healthcheck erfolgreich ist.

### Wichtige Unterschiede Dev vs. Docker

| Aspekt           | Dev (lokal)                        | Docker                              |
|------------------|------------------------------------|-------------------------------------|
| Settings         | `backend.settings.dev`             | `backend.settings.prod`             |
| ALLOWED_HOSTS    | `[]`                               | `["*"]`                             |
| Datenbank        | SQLite in `backend/db.sqlite3`     | PostgreSQL 16 (Service `db`)        |
| DB-Konfiguration | hartcodiert in `dev.py`            | via `.env`-Datei                    |
| Server           | `manage.py runserver`              | `manage.py runserver 0.0.0.0:8000`  |

---

*Stand: Letzte Aktualisierung durch AI-Assistent – Docker-Setup hinzugefügt*