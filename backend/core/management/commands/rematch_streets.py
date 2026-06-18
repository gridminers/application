"""
Django-Management-Command: Straßen-Matching erneut ausführen.

Wendet den Straßen-Matcher erneut auf bereits importierte `Application`-Objekte
an. Nützlich, nachdem das Straßenregister (`Street`) erweitert/aktualisiert oder
der Schwellenwert angepasst wurde.

Die Matching-Logik selbst stammt unverändert aus `core.street_matching`
(dieselbe, die auch beim Import via `ApplicationImporter` verwendet wird).

Verhalten:
    Es werden ALLE Anträge neu bewertet. Weicht das neue Ergebnis von der
    aktuellen Zuordnung ab, wird es übernommen – inklusive Zurücksetzen auf
    `None`, falls der beste Treffer nun unter dem Schwellenwert liegt.

Aufruf:
    python manage.py rematch_streets --dry-run
    python manage.py rematch_streets
    python manage.py rematch_streets --score-cutoff 80
    python manage.py rematch_streets --matcher substring
"""

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Application, Street
from core.street_matching import (
    RapidFuzzStreetMatcher,
    StreetMatcher,
    SubstringStreetMatcher,
)


def build_matcher(name: str, score_cutoff: float) -> StreetMatcher:
    """Erstellt die gewählte Matcher-Strategie."""
    if name == "rapidfuzz":
        return RapidFuzzStreetMatcher(score_cutoff=score_cutoff)
    if name == "substring":
        return SubstringStreetMatcher()
    raise CommandError(f"Unbekannte Matcher-Strategie: {name!r}.")


class Command(BaseCommand):
    help = (
        "Wendet den Straßen-Matcher erneut auf alle bereits importierten "
        "Application-Objekte an und aktualisiert das street-Feld."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--matcher",
            choices=("rapidfuzz", "substring"),
            default="rapidfuzz",
            help="Matcher-Strategie (Standard: 'rapidfuzz').",
        )
        parser.add_argument(
            "--score-cutoff",
            type=float,
            default=85.0,
            help="Schwellenwert 0–100 für rapidfuzz (Standard: 85.0).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Nur prüfen und anzeigen, nichts in der Datenbank speichern.",
        )

    def handle(self, *args, **options):
        matcher_name = options["matcher"]
        score_cutoff = options["score_cutoff"]
        dry_run = options["dry_run"]

        matcher = build_matcher(matcher_name, score_cutoff)

        streets = list(Street.objects.all())
        if not streets:
            raise CommandError(
                "Keine Straßen in der Datenbank. Zuerst das Straßenregister "
                "laden: python manage.py loaddata core/fixtures/streets.json"
            )

        applications = list(Application.objects.all())
        if not applications:
            self.stdout.write(self.style.WARNING("Keine Anträge vorhanden – nichts zu tun."))
            return

        self.stdout.write(
            f"Matcher: {matcher_name} (cutoff={score_cutoff}) – "
            f"{len(applications)} Antrag/Anträge, {len(streets)} Straßen."
        )

        changed = 0
        newly_matched = 0
        cleared = 0
        unchanged = 0

        with transaction.atomic():
            for app in applications:
                new_street = matcher.match(app.project_title, streets)
                old_id = app.street_id
                new_id = new_street.id if new_street is not None else None

                if old_id == new_id:
                    unchanged += 1
                    continue

                old_label = app.street.name if app.street_id else "—"
                new_label = new_street.name if new_street is not None else "—"
                self.stdout.write(
                    f"  #{app.id}: {old_label!r} -> {new_label!r}  "
                    f"({app.project_title!r})"
                )

                if old_id is None:
                    newly_matched += 1
                elif new_id is None:
                    cleared += 1
                changed += 1

                app.street = new_street
                if not dry_run:
                    app.save(update_fields=["street", "updated_at"])

            if dry_run:
                transaction.set_rollback(True)

        # --- Zusammenfassung -----------------------------------------------
        prefix = "[DRY-RUN] " if dry_run else ""
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(f"{prefix}{changed} Antrag/Anträge geändert."))
        if newly_matched:
            self.stdout.write(f"  davon neu zugeordnet: {newly_matched}")
        if cleared:
            self.stdout.write(f"  davon zurückgesetzt (None): {cleared}")
        self.stdout.write(f"{unchanged} unverändert.")
        if dry_run:
            self.stdout.write("Hinweis: Im Dry-Run wurde nichts gespeichert.")
