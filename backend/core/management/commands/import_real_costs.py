"""
Django-Management-Command: Realkosten aus einer CSV-Datei importieren.

Liest eine CSV-Datei (Spalten wie im Investitionsantrag-Export) ein und
aktualisiert die `real_*`-Felder der passenden `Application`-Objekte.
Die Zuordnung erfolgt ausschließlich über die Spalte "PSP-Element".

Spaltenzuordnung (CSV -> Modellfeld):
    PSP-Element                  -> psp_element              (Lookup-Schlüssel)
    Materialkosten               -> real_material_costs
    Fremdleistungen              -> real_external_services
    Eigenleistungen              -> real_internal_services
    Ingenieurleistungen Dritte   -> real_engineering_services
    Materialkostenzuschläge      -> real_material_surcharge
    Investitionszuschläge        -> real_investment_surcharge
    Gesamtkosten                 -> real_total_costs

Ablage im Projekt:
    <app>/management/commands/import_real_costs.py
    (zusätzlich leere __init__.py in management/ und management/commands/)

Aufruf:
    python manage.py import_real_costs pfad/zur/datei.csv
    python manage.py import_real_costs daten.csv --delimiter ";" --encoding cp1252
    python manage.py import_real_costs daten.csv --dry-run
"""

from __future__ import annotations

import csv
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Application

DECIMAL_FIELDS = {
    "real_material_costs",
    "real_external_services",
    "real_internal_services",
    "real_engineering_services",
    "real_material_surcharge",
    "real_investment_surcharge",
    "real_total_costs",
}


def classify_header(header: str) -> str | None:
    """
    Ordnet eine CSV-Spaltenüberschrift einem Modellfeld zu.

    Bewusst tolerant gegenüber Tippfehlern und abgeschnittenen Überschriften
    (z. B. "Investitionszuschläg", "Materalkostenzuschla"): es wird nur auf
    charakteristische Wortbestandteile geprüft.
    """
    h = header.strip().lower()
    if not h:
        return None
    if "psp" in h:
        return "psp_element"

    # Zuschlags-Spalten zuerst prüfen, da sie ebenfalls "material" enthalten.
    has_surcharge = "zuschl" in h
    if has_surcharge and "invest" in h:
        return "real_investment_surcharge"
    if has_surcharge and ("material" in h or "materal" in h):
        return "real_material_surcharge"

    if "fremd" in h:
        return "real_external_services"
    if "eigen" in h:
        return "real_internal_services"
    if "ingeni" in h:  # Ingenieurleistungen / Ingenierleistungen
        return "real_engineering_services"
    if "gesamt" in h:
        return "real_total_costs"
    if "material" in h or "materal" in h:
        return "real_material_costs"
    return None


def parse_german_decimal(raw: str | None) -> Decimal | None:
    """
    Wandelt einen Betrag im deutschen Format in ein Decimal um.

        '2.800,00 €' -> Decimal('2800.00')
        '0,00 €'     -> Decimal('0.00')
        '' / '-'     -> None
    """
    if raw is None:
        return None
    value = raw.replace("€", "").replace("\xa0", "").strip()
    if value in ("", "-"):
        return None
    # Tausenderpunkt entfernen, Dezimalkomma in Punkt umwandeln.
    value = value.replace(".", "").replace(",", ".")
    try:
        return Decimal(value)
    except InvalidOperation as exc:
        raise ValueError(f"Ungültiger Betrag: {raw!r}") from exc


class Command(BaseCommand):
    help = (
        "Importiert Realkosten aus einer CSV-Datei und aktualisiert die "
        "Application-Objekte (Zuordnung über das PSP-Element)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path",
            help="Pfad zur CSV-Datei.",
        )
        parser.add_argument(
            "--delimiter",
            default=";",
            help="CSV-Trennzeichen (Standard: ';').",
        )
        parser.add_argument(
            "--encoding",
            default="utf-8-sig",
            help="Datei-Encoding (Standard: 'utf-8-sig'; bei Excel-Exporten oft 'cp1252').",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Nur prüfen und anzeigen, nichts in der Datenbank speichern.",
        )

    def handle(self, *args, **options):
        path = options["csv_path"]
        delimiter = options["delimiter"]
        encoding = options["encoding"]
        dry_run = options["dry_run"]

        # --- Datei öffnen und Header analysieren ----------------------------
        try:
            handle = open(path, newline="", encoding=encoding)
        except OSError as exc:
            raise CommandError(f"Datei kann nicht geöffnet werden: {exc}")

        with handle:
            reader = csv.reader(handle, delimiter=delimiter)
            try:
                header = next(reader)
            except StopIteration:
                raise CommandError("Die CSV-Datei ist leer.")

            col_to_field: dict[int, str] = {}
            for idx, col in enumerate(header):
                field = classify_header(col)
                if field:
                    col_to_field[idx] = field

            if "psp_element" not in col_to_field.values():
                raise CommandError(
                    "Keine PSP-Element-Spalte gefunden. Gelesene Überschriften: "
                    + ", ".join(repr(c) for c in header)
                )

            psp_idx = next(i for i, f in col_to_field.items() if f == "psp_element")
            value_cols = {i: f for i, f in col_to_field.items() if f != "psp_element"}

            self.stdout.write("Erkannte Spaltenzuordnung:")
            for i, field in col_to_field.items():
                self.stdout.write(f"  {header[i].strip()!r:40s} -> {field}")

            rows = list(reader)

        # --- Zeilen verarbeiten --------------------------------------------
        updated = 0
        not_found = 0
        ambiguous = 0
        errors = 0

        with transaction.atomic():
            for line_no, row in enumerate(rows, start=2):
                if not row or all(cell.strip() == "" for cell in row):
                    continue

                psp = row[psp_idx].strip() if psp_idx < len(row) else ""
                if not psp:
                    continue

                # Beträge parsen
                try:
                    values = {
                        field: parse_german_decimal(row[i] if i < len(row) else "")
                        for i, field in value_cols.items()
                    }
                except ValueError as exc:
                    self.stderr.write(
                        self.style.ERROR(f"Zeile {line_no} (PSP {psp}): {exc} – übersprungen.")
                    )
                    errors += 1
                    continue

                qs = Application.objects.filter(psp_element=psp)
                count = qs.count()

                if count == 0:
                    self.stderr.write(
                        self.style.WARNING(
                            f"Zeile {line_no}: Kein Antrag mit PSP-Element {psp!r} – übersprungen."
                        )
                    )
                    not_found += 1
                    continue

                if count > 1:
                    ambiguous += 1
                    self.stderr.write(
                        self.style.WARNING(
                            f"Zeile {line_no}: {count} Anträge mit PSP-Element {psp!r} – alle werden aktualisiert."
                        )
                    )

                for app in qs:
                    for field, value in values.items():
                        setattr(app, field, value)
                    if not dry_run:
                        app.save(update_fields=list(values.keys()) + ["updated_at"])
                    updated += 1

            if dry_run:
                # Alle Änderungen verwerfen.
                transaction.set_rollback(True)

        # --- Zusammenfassung -----------------------------------------------
        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"{prefix}{updated} Antrag/Anträge aktualisiert."
            )
        )
        if not_found:
            self.stdout.write(self.style.WARNING(f"{not_found} PSP-Element(e) nicht gefunden."))
        if ambiguous:
            self.stdout.write(self.style.WARNING(f"{ambiguous} mehrdeutige PSP-Element(e)."))
        if errors:
            self.stdout.write(self.style.ERROR(f"{errors} Zeile(n) mit Parsing-Fehlern."))
        if dry_run:
            self.stdout.write("Hinweis: Im Dry-Run wurde nichts gespeichert.")
