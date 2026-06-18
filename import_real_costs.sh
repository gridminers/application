#!/usr/bin/env bash
#
# Importiert Realkosten aus einer CSV-Datei in die laufende Backend-Datenbank.
#
# Verwendung:
#   ./import_real_costs.sh <csv-dateiname> [weitere optionen]
#
# Beispiele:
#   ./import_real_costs.sh ist_kosten.csv
#   ./import_real_costs.sh ist_kosten.csv --dry-run
#   ./import_real_costs.sh ist_kosten.csv --encoding utf-8-sig
#
# Hinweis: Die CSV muss in ./backend/input/ liegen.

set -euo pipefail

# In das Verzeichnis dieses Scripts wechseln (= /application/)
cd "$(dirname "$0")"

INPUT_DIR="./backend/input"
CONTAINER_INPUT="/app/input"

if [[ $# -lt 1 ]]; then
    echo "Fehler: Kein CSV-Dateiname angegeben." >&2
    echo "Verwendung: $0 <csv-dateiname> [optionen]" >&2
    echo "Beispiel:   $0 ist_kosten.csv --dry-run" >&2
    exit 1
fi

CSV_NAME="$1"
shift  # restliche Argumente werden an das Command durchgereicht

# Prüfen, ob die Datei lokal existiert
if [[ ! -f "${INPUT_DIR}/${CSV_NAME}" ]]; then
    echo "Fehler: Datei '${INPUT_DIR}/${CSV_NAME}' nicht gefunden." >&2
    echo "Lege die CSV bitte in ${INPUT_DIR}/ ab." >&2
    exit 1
fi

# Prüfen, ob der Backend-Container läuft
if ! docker compose ps --status running backend | grep -q backend; then
    echo "Backend-Container läuft nicht. Starte Stack..." >&2
    docker compose up -d backend
fi

echo "Importiere '${CSV_NAME}' (Standard-Delimiter ',', Encoding 'utf-8-sig')..."
echo "Zusätzliche Optionen: ${*:-keine}"
echo

MSYS_NO_PATHCONV=1 docker compose exec backend \
    python manage.py import_real_costs \
    "${CONTAINER_INPUT}/${CSV_NAME}" \
    --delimiter "," \
    "$@"
