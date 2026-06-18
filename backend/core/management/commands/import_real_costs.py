"""
Django management command – import_real_costs

Importiert/Istkosten aus einer CSV-Datei (Typ PSP_Elemente-Istkosten)
in die Felder real_* des Application-Modells.

Verwendung:
    python manage.py import_real_costs <dateiname.csv> [--delimiter ,] [--encoding utf-8-sig] [--dry-run]

Besonderheiten der Datei:
    - Erste Zeile ist leer/garbage → wird übersprungen.
    - Zweite Zeile ist der echte Header (Spaltennamen auf Deutsch).
    - Deutsche Schreibweisen mit Tippfehlern werden toleriert
      (z. B. "Ingeniersleistungen Dritte", "Materalkostenzuschlag").
    - Beträge im Format "12.345,67 €" oder "12345.67 €" → Decimal.
"""

from __future__ import annotations

import csv
import sys
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Application


# ------------------------------------------------------------------
# Header-Alias-Mapping: tolerante deutsche Schreibweisen → Feldnamen
# ------------------------------------------------------------------
_HEADER_ALIASES: dict[str, str] = {
    # exakte Schreibweisen aus der vorliegenden CSV
    "psp-element": "psp_element",
    "materialkosten": "real_material_costs",
    "fremdleistungen": "real_external_services",
    "eigenleistungen": "real_internal_services",
    # Tippfehler "Ingeniers..." wird akzeptiert
    "ingeniersleistungen dritte": "real_engineering_services",
    # Tippfehler "Materal..." wird akzeptiert
    "materalkostenzuschlag": "real_material_surcharge",
    "investitionszuschläge": "real_investment_surcharge",
    "gesamtkosten": "real_total_costs",
    # --------------------------------------------------------------
    # korrekte Schreibweisen (ohne Tippfehler) – ebenfalls akzeptiert
    # --------------------------------------------------------------
    "ingenieurleistungen dritte": "real_engineering_services",
    "materialkosten (netto)": "real_material_costs",
}


def normalise_header_cell(cell: str) -> str:
    """Klein, gestrippt, Leading/Trailing Spaces entfernt."""
    return cell.strip().lower()


def find_header_row(
    rows: list[list[str]], delimiter: str
) -> tuple[int, list[str]]:
    """
    Überspringe alle Zeilen, deren Zellen komplett leer sind.
    Gibt (index, zellen) der ersten Zeile zurück, die "psp-element" enthält.
    Erwartet bereits rows als Listen von Zellen (nach csv.reader).
    """
    for i, row in enumerate(rows):
        # Leere Zeile → überspringen
        if not any(cell.strip() for cell in row):
            continue
        # Header-Zeile erkennbar?
        if "psp-element" in normalise_header_cell(row[0]):
            return i, row
    raise CommandError(
        f"Keine Zeile mit 'PSP-Element' gefunden. "
        f"Datei enthält {len(rows)} Zeilen."
    )


def build_column_map(header_row: list[str]) -> dict[str, int]:
    """
    Aus einer Header-Zeile (Liste von Zellen) ein Mapping
    { feldname: spalten_index } erstellen.
    """
    col_map: dict[str, int] = {}
    seen: dict[str, int] = {}   # doppelte Erkennung
    for idx, cell in enumerate(header_row):
        norm = normalise_header_cell(cell)
        if not norm:
            continue
        field = _HEADER_ALIASES.get(norm)
        if field:
            if field in col_map:
                raise CommandError(
                    f"Spalte '{cell}' (Index {idx}) mappt auf dasselbe Feld "
                    f"'{field}' wie bereits Spalte {col_map[field]}."
                )
            col_map[field] = idx
    return col_map


def parse_amount(raw: str) -> Decimal | None:
    """
    Wandle einen String wie '12.345,67 €' oder '12345.67 €' in Decimal um.

    Reihenfolge der Bereinigung:
        1. Whitespace entfernen.
        2. Euro-Zeichen und alle Varianten entfernen (€, EUR, EUR, etc.).
        3. Tausenderpunkte entfernen (nur wenn sie von Ziffern eingeschlossen sind).
        4. Komma als Dezimaltrennzeichen interpretieren.
        5. Rest als Decimal parsen.
    """
    if not raw.strip():
        return None

    s = raw.strip()

    # 1) Währungssymbole & -wörter entfernen
    for token in ("€", "EUR", "EURO", "euro"):
        s = s.replace(token, "")
    s = s.strip()

    # 2) Tausendertrennpunkte → entfernen (nur wenn von Ziffern flankiert)
    #    z.B. "12.345" → "12345"  aber ": 28362.57 €: ED.051305" bleibt erstmal so
    #    Wir splitten anhand der Struktur: alles nach dem letzten '.' gefolgt
    #    von genau 2 Ziffern → Dezimalpunkt; der Rest davor → Tausenderpunkte
    #
    #    Praktisch für die vorliegenden Werte (Format "2800.00 €"):
    #    Alles hinter einem '$' oder Whitespace abschneiden.
    #    Wir splitten am NICHT-Ziffern-Bereich rechts.
    import re
    # Trenne Wert von eventuellem Suffix (z.B. ": ED.051305")
    # → nimm nur den numerischen Prefix
    m = re.match(r"^([\d.,\s]+)", s)
    if m:
        s = m.group(1)
    else:
        return None

    s = s.strip()
    # Jetzt: Tausenderpunkte entfernen (nur 3er-Gruppen)
    # Komma als Dezimalzeichen, Punkt als Tausenderzeichen
    if "," in s:
        # DE-Format: 12.345,67 → 12345.67
        s = s.replace(".", "").replace(",", ".")
    else:
        # EN/US-Format: 12345.67 oder 12345 (kein Komma)
        pass

    try:
        return Decimal(s)
    except InvalidOperation:
        return None


# ------------------------------------------------------------------
# Django Management Command
# ------------------------------------------------------------------

class Command(BaseCommand):
    help = "Importiert/Istkosten (real_*) aus einer PSP-Elemente-Istkosten-CSV."

    def add_arguments(self, parser):
        parser.add_argument(
            "filename",
            type=str,
            help="Dateiname (muss in INPUT_DIR liegen, Standard: ./backend/input/).",
        )
        parser.add_argument(
            "--delimiter",
            type=str,
            default=",",
            help="CSV-Trennzeichen (Standard: ',').",
        )
        parser.add_argument(
            "--encoding",
            type=str,
            default="utf-8-sig",
            help="Dateikodierung (Standard: 'utf-8-sig' → BOM wird entfernt).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Einlesen und validieren, aber keine Datenbankänderungen speichern.",
        )

    def handle(self, *args, **options):
        filename = options["filename"]
        delimiter = options["delimiter"]
        encoding = options["encoding"]
        dry_run = options["dry_run"]

        # ── Pfad auflösen ────────────────────────────────────────────────
        input_dir = Path(__file__).resolve().parent.parent / "input"
        filepath = input_dir / filename

        if not filepath.exists():
            raise CommandError(
                f"Datei '{filepath}' nicht gefunden. "
                f"Lege die CSV bitte in {input_dir} ab."
            )

        self.stdout.write(
            f"Importiere '{filename}' "
            f"(Delimiter '{delimiter}', Encoding '{encoding}')..."
        )
        if dry_run:
            self.stdout.write("Dry-Run-Modus: keine Änderungen werden gespeichert.\n")

        # ── CSV einlesen ─────────────────────────────────────────────────
        with filepath.open("r", encoding=encoding) as fh:
            reader = csv.reader(fh, delimiter=delimiter)
            rows: list[list[str]] = list(reader)

        # ── Header-Zeile finden (leere Zeilen überspringen) ───────────────
        header_idx, header_row = find_header_row(rows, delimiter)
        self.stdout.write(f"Header gefunden in Zeile {header_idx + 1}: {header_row}\n")

        col_map = build_column_map(header_row)

        def _col(field: str) -> int:
            """Column index for a field name."""
            return col_map[field]

        required = {
            "psp_element",
            "real_material_costs",
            "real_external_services",
            "real_internal_services",
            "real_engineering_services",
            "real_material_surcharge",
            "real_investment_surcharge",
            "real_total_costs",
        }
        missing = required - set(col_map.keys())
        if missing:
            raise CommandError(
                f"Folgende Pflichtspalten fehlen im Header: {missing}\n"
                f"Gefundene Spalten: {list(col_map.keys())}"
            )

        # ── Datenzeilen verarbeiten ──────────────────────────────────────
        data_rows = rows[header_idx + 1:]

        stats = {"updated": 0, "not_found": 0, "ambiguous": 0, "parse_errors": 0}
        errors: list[str] = []

        def _get(row: list[str], field: str) -> str:
            return row[_col(field)].strip()

        @transaction.atomic
        def _do_update():
            for line_no, row in enumerate(data_rows, start=header_idx + 2):
                # Zeile überspringen, wenn komplett leer
                if not any(cell.strip() for cell in row):
                    continue

                psp = _get(row, "psp_element")

                # ── Application lookup ─────────────────────────────────
                matches = list(Application.objects.filter(psp_element=psp))
                if not matches:
                    stats["not_found"] += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"  Zeile {line_no}: PSP '{psp}' nicht gefunden → übersprungen."
                        )
                    )
                    continue
                if len(matches) > 1:
                    stats["ambiguous"] += 1
                    self.stdout.write(
                        self.style.ERROR(
                            f"  Zeile {line_no}: PSP '{psp}' → "
                            f"{len(matches)} Treffer (ambiguous) → übersprungen."
                        )
                    )
                    continue

                app = matches[0]

                # ── Felder parsen ───────────────────────────────────────
                field_updates: dict[str, Decimal | None] = {}
                parse_ok = True

                for field in required - {"psp_element"}:
                    raw = _get(row, field)
                    val = parse_amount(raw)
                    if val is None and raw:
                        # Non-empty string that failed to parse
                        parse_ok = False
                        errors.append(
                            f"  Zeile {line_no}: Feld '{field}' = '{raw}' "
                            f"konnte nicht als Decimal geparst werden."
                        )
                    field_updates[field] = val

                if not parse_ok:
                    stats["parse_errors"] += 1
                    continue

                # ── Speichern (oder nur anzeigen) ───────────────────────
                for field, val in field_updates.items():
                    setattr(app, field, val)

                if not dry_run:
                    app.save(update_fields=list(field_updates.keys()))

                stats["updated"] += 1

        _do_update()

        # ── Zusammenfassung ───────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(self.style.SUCCESS("  Import-Zusammenfassung"))
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(
            f"  Datensätze aktualisiert : {stats['updated']}"
        )
        self.stdout.write(
            f"  PSP nicht in DB gefunden : {stats['not_found']}"
        )
        self.stdout.write(
            self.style.WARNING(
                f"  Ambiguous (doppelte PSP)  : {stats['ambiguous']}"
            )
        )
        self.stdout.write(
            self.style.ERROR(
                f"  Parse-Fehler              : {stats['parse_errors']}"
            )
        )

        if errors:
            self.stdout.write("")
            self.stdout.write(self.style.NOTICE("Details zu Parse-Fehlern:"))
            for e in errors:
                self.stdout.write(self.style.ERROR(e))

        if dry_run:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "Dry-Run beendet – keine Datenbankänderungen vorgenommen."
                )
            )
        else:
            self.stdout.write("")
            self.stdout.write(
                self.style.SUCCESS(
                    f"Import abgeschlossen. "
                    f"{stats['updated']} Datensätze aktualisiert."
                )
            )
