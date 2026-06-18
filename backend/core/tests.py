"""
Tests für die LLM-Veredelung (Refining/Sanitizing/Enriching) eingehender
Parser-Exporte und deren Einbindung in den Importer.

Die Tests rufen kein echtes LLM auf – die Azure-Antwort wird über einen
``FakeResponsesClient`` bzw. einen Stub-Refiner injiziert.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Mapping, Optional

from django.test import TestCase

from core.importer import ApplicationImporter, DuplicateDocumentError
from core.models import Application
from core.parsers import FieldParseError
from core.refiner import (
    DocumentRefiner,
    LLMDocumentRefiner,
    NullDocumentRefiner,
    ResponsesClient,
    TARGET_FIELDS,
)


def canonical_targets(**overrides: Any) -> dict[str, Any]:
    """Vollständiges, sauber formatiertes ``targets``-Mapping für Tests."""
    targets: dict[str, Any] = {
        "Projekttitel": "Erneuerung Wasserleitung Hauptstraße",
        "Geschäftsjahr": "2024",
        "Ausführungszeit (von - bis)": "01.03.2024 - 30.09.2024",
        "Antragsgrund": "Sanierung",
        "Sparte": "Wasser",
        "Asset": "Wassernetz",
        "PSP-Element": "A-1234",
        "Leitungsmeter": "250 m",
        "Euro pro Meter Trassenlänge": "374 €",
        "Materialkosten (netto)": "93.500,00 €",
        "Fremdleistungen": "10.000,00 €",
        "Eigenleistungen": "5.000,00 €",
        "Ingenieurleistungen Dritte": "2.000,00 €",
        "Gesamtkosten ohne Zuschläge": "110.500,00 €",
        "Materialkostenzuschläge (17%)": "15.895,00 €",
        "Investitionszuschläge (23%)": "25.415,00 €",
        "Zwischensumme Zuschläge": "41.310,00 €",
        "Gesamtkosten": "151.810,00 €",
        "Zahlungsplan": "2024: 100 % / 151.810 €",
    }
    targets.update(overrides)
    return targets


class _StubRefiner(DocumentRefiner):
    """Liefert immer ein fest vorgegebenes, sauberes ``targets``-Mapping."""

    def __init__(self, fixed: Mapping[str, Any]) -> None:
        self._fixed = dict(fixed)
        self.calls: list[dict[str, Any]] = []

    def refine(
            self, targets: Mapping[str, Any], warnings: Optional[list[str]] = None
    ) -> dict[str, Any]:
        self.calls.append(dict(targets))
        return dict(self._fixed)


class FakeResponsesClient:
    """Ersatz für ``ResponsesClient``: gibt eine vorgegebene Antwort zurück."""

    def __init__(self, response: Any = None, error: Optional[Exception] = None):
        self._response = response
        self._error = error
        self.calls: list[tuple[str, Mapping[str, Any]]] = []

    def complete(self, prompt: str, response_format: Mapping[str, Any]) -> dict:
        self.calls.append((prompt, response_format))
        if self._error is not None:
            raise self._error
        return self._response


# -- Refiner-Unit-Tests ------------------------------------------------------


class NullRefinerTests(TestCase):
    def test_passthrough_returns_copy(self) -> None:
        refiner = NullDocumentRefiner()
        targets = {"Projekttitel": "X"}
        result = refiner.refine(targets)
        self.assertEqual(result, targets)
        self.assertIsNot(result, targets)


class LLMRefinerTests(TestCase):
    def test_merges_refined_targets(self) -> None:
        refined = {label: None for label in TARGET_FIELDS}
        refined["Geschäftsjahr"] = "2024"
        client = FakeResponsesClient(response={"targets": refined, "warnings": []})
        refiner = LLMDocumentRefiner(client)

        result = refiner.refine({"Geschäftsjahr": "zwanzig vierundzwanzig"})

        self.assertEqual(result["Geschäftsjahr"], "2024")
        self.assertEqual(len(client.calls), 1)

    def test_falls_back_to_original_on_client_error(self) -> None:
        client = FakeResponsesClient(error=RuntimeError("boom"))
        refiner = LLMDocumentRefiner(client)
        original = {"Geschäftsjahr": "2024"}

        result = refiner.refine(original)

        self.assertEqual(result, original)

    def test_falls_back_when_targets_missing(self) -> None:
        client = FakeResponsesClient(response={"warnings": []})
        refiner = LLMDocumentRefiner(client)
        original = {"Geschäftsjahr": "2024"}

        result = refiner.refine(original)

        self.assertEqual(result, original)


class ExtractJsonTests(TestCase):
    def test_reads_output_text(self) -> None:
        body = {"output_text": '{"targets": {}, "warnings": []}'}
        self.assertEqual(
            ResponsesClient._extract_json(body), {"targets": {}, "warnings": []}
        )

    def test_reads_message_content(self) -> None:
        body = {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {"type": "output_text", "text": '{"targets": {}, "warnings": []}'}
                    ],
                }
            ]
        }
        self.assertEqual(
            ResponsesClient._extract_json(body), {"targets": {}, "warnings": []}
        )


# -- Importer-Integration ----------------------------------------------------


class ImporterRefinerIntegrationTests(TestCase):
    def test_malformed_export_is_rejected_without_refiner(self) -> None:
        """Ohne Veredelung scheitert ein unsauberes Jahr wie bisher (400)."""
        importer = ApplicationImporter(refiner=NullDocumentRefiner())
        export = {
            "source_file": "bad.pdf",
            "targets": canonical_targets(Geschäftsjahr="kein Jahr"),
            "warnings": [],
        }
        with self.assertRaises(FieldParseError):
            importer.import_export(export)

    def test_refiner_sanitizes_so_import_succeeds(self) -> None:
        """Der Refiner bereinigt die Rohdaten; der Import gelingt."""
        stub = _StubRefiner(canonical_targets())
        importer = ApplicationImporter(refiner=stub)
        export = {
            "source_file": "bad.pdf",
            "targets": canonical_targets(
                Geschäftsjahr="kein Jahr",
                **{"Materialkosten (netto)": "n/a"},
            ),
            "warnings": ["Betrag unleserlich"],
        }

        application = importer.import_export(export)

        self.assertIsInstance(application, Application)
        self.assertEqual(application.fiscal_year, 2024)
        self.assertEqual(application.planned_material_costs, Decimal("93500.00"))
        # Der Refiner hat die unsauberen Rohdaten erhalten.
        self.assertEqual(stub.calls[0]["Geschäftsjahr"], "kein Jahr")

    def test_dedup_runs_before_refiner(self) -> None:
        """Bereits importierte Extraktionen erreichen das LLM gar nicht."""
        first = ApplicationImporter(refiner=NullDocumentRefiner())
        export = {
            "source_file": "ok.pdf",
            "targets": canonical_targets(),
            "warnings": [],
        }
        first.import_export(export)

        stub = _StubRefiner(canonical_targets())
        importer = ApplicationImporter(refiner=stub)
        with self.assertRaises(DuplicateDocumentError):
            importer.import_export(export)
        self.assertEqual(stub.calls, [])
