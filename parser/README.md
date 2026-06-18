# Gridminers Parser

PDF-Parser für Investitionsanträge. Rendert die **erste Seite** jeder PDF-Datei,
schickt sie an ein **Azure-OpenAI-Vision-Modell** (Responses API) und schreibt
ein sauberes JSON mit den **19 Zielfeldern** plus Warnungen. Das Ergebnis wird
zusätzlich per HTTP an die Import-Schnittstelle des
[Backends](../backend/README.md) übergeben.

## Funktionsweise

```
dump/*.pdf  →  Seite 1 rendern (PyMuPDF, 300 DPI)
            →  Bild + optionaler Text-Layer an Azure OpenAI senden
            →  strukturiertes JSON (strict json_schema) erhalten
            →  processed_files/<name>.json schreiben
            →  POST an IMPORT_API_URL (Backend)
```

- **Deduplizierung**: Der SHA256-Hash jeder verarbeiteten Datei wird in
  `processed_files/.manifest.json` festgehalten. Bereits verarbeitete PDFs
  (identischer Inhalt) werden übersprungen.
- **Robustheit**: Bis zu 4 Versuche mit exponentiellem Backoff bei `429`/`5xx`.
  Nicht-wiederholbare Fehler (Auth, falscher Modellname, Bad Request) brechen die
  Datei sofort ab; andere PDFs laufen weiter.
- **Text-Layer**: Ist ein brauchbarer Text-Layer vorhanden (≥ 20 Zeichen), wird
  er als zusätzlicher Kontext mitgeschickt – das Bild bleibt aber maßgeblich.

## Verzeichnisse

| Pfad                          | Zweck                                                   |
|-------------------------------|---------------------------------------------------------|
| `dump/`                       | Eingang: hier abgelegte `*.pdf` werden verarbeitet      |
| `processed_files/`            | Ausgang: ein `<name>.json` pro PDF                      |
| `processed_files/.manifest.json` | SHA256-Manifest zur Deduplizierung                   |

## Ausgabeformat

Pro PDF entsteht eine JSON-Datei in `processed_files/`:

```json
{
  "source_file": "antrag_4711.pdf",
  "targets": {
    "Projekttitel": "…",
    "Geschäftsjahr": "2025",
    "...": "…"
  },
  "warnings": ["…"]
}
```

Dasselbe Objekt wird per `POST` an `IMPORT_API_URL` gesendet. Werte, die nicht
gefunden werden, sind `null`; es werden keine Werte berechnet oder erfunden.

### Zielfelder (19)

`Projekttitel`, `Geschäftsjahr`, `Ausführungszeit (von - bis)`, `Antragsgrund`,
`Sparte`, `Asset`, `PSP-Element`, `Leitungsmeter`,
`Euro pro Meter Trassenlänge`, `Materialkosten (netto)`, `Fremdleistungen`,
`Eigenleistungen`, `Ingenieurleistungen Dritte`, `Gesamtkosten ohne Zuschläge`,
`Materialkostenzuschläge (17%)`, `Investitionszuschläge (23%)`,
`Zwischensumme Zuschläge`, `Gesamtkosten`, `Zahlungsplan`.

Die kanonischen Labels und ihre Reihenfolge sind in `prompts.py` (`TARGET_FIELDS`)
definiert; das strikte JSON-Schema für die Responses API in `schema.py`.

## Konfiguration

Die Konfiguration erfolgt über eine `.env`-Datei (nicht versioniert):

```bash
cp .env.example .env
# .env öffnen und AZURE_OPENAI_API_KEY eintragen
```

| Variable                   | Beschreibung                                  | Default |
|----------------------------|-----------------------------------------------|---------|
| `AZURE_OPENAI_API_KEY`     | API-Key (erforderlich)                        | –       |
| `IMPORT_API_URL`           | Import-Endpunkt des Backends (erforderlich)   | –       |
| `AZURE_OPENAI_MODEL`       | Deployment-/Modellname                        | `gpt-5.4` |
| `AZURE_OPENAI_ENDPOINT`    | Responses-Endpoint                            | siehe `.env.example` |
| `AZURE_OPENAI_API_VERSION` | API-Version                                   | `2025-04-01-preview` |

`AZURE_OPENAI_API_KEY` und `IMPORT_API_URL` sind **Pflicht** – fehlen sie, bricht
der Start mit einer Fehlermeldung ab.

> **Hinweis:** Der Import-Endpunkt des Backends lautet
> `…/api/applications/import/`. Lokal (ohne Docker) also z. B.
> `IMPORT_API_URL=http://localhost:8000/api/applications/import/`. Im Docker-Setup
> wird dieser Wert in `docker-compose.yml` automatisch auf
> `http://backend:8000/api/applications/import/` überschrieben.

## Lokale Ausführung

Voraussetzungen: Python 3.12+

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Einmaliger Durchlauf über alle PDFs in dump/
python main.py

# Watch-Modus: dump/ überwachen und neue/geänderte PDFs verarbeiten
python main.py --watch [--interval SECONDS]
```

Im Watch-Modus wartet der Parser, bis eine Datei vollständig geschrieben wurde
(Stabilitätsprüfung von Größe/mtime), bevor er sie verarbeitet. Beenden mit
`Ctrl+C`.

## Docker / Container

Der Parser läuft im Gesamt-Setup als Service (siehe `docker-compose.yml` im
Projekt-Wurzelverzeichnis) standardmäßig im Watch-Modus. `dump/` und
`processed_files/` sind als Bind-Mounts eingebunden und bleiben auf dem Host
erhalten.

```bash
# Image bauen
docker build -f Containerfile -t gridminers-parser .

# Standalone starten (Watch-Modus), Verzeichnisse mounten
docker run --rm \
  --env-file .env \
  -v "$(pwd)/dump:/app/dump" \
  -v "$(pwd)/processed_files:/app/processed_files" \
  gridminers-parser --watch
```

Der `Containerfile`-Entrypoint ist `python main.py`; Flags wie `--watch` /
`--interval` werden zur Laufzeit angehängt.

## Abhängigkeiten

| Paket          | Zweck                                  |
|----------------|----------------------------------------|
| PyMuPDF (fitz) | PDF-Seite zu PNG rendern, Text-Layer   |
| requests       | HTTP-Aufrufe (Azure OpenAI, Backend)   |
| python-dotenv  | `.env`-Konfiguration laden             |
