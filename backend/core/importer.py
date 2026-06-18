"""
Importer-Service.

Orchestriert: Deduplizierung -> Parsen -> Fremdschlüssel auflösen -> Persistieren.
Kennt keine HTTP-Details (das macht die View); dadurch ist der Service auch aus
Management-Commands oder Tasks heraus nutzbar.
"""

from __future__ import annotations

import hashlib
import json
import re
from decimal import Decimal
from typing import Any, Mapping, Optional

from django.db import transaction

from .field_mapping import (
    LABEL_ASSET,
    LABEL_DIVISION,
    LABEL_EXECUTION_TIME,
    LABEL_PAYMENT_SCHEDULE,
    SCALAR_FIELD_MAP,
    SURCHARGE_RULES,
    field_type_for_label,
)
# Importe an die tatsächliche App anpassen.
from .models import Application, Asset, Division, Street, Trade
from .parsers import ParserRegistry, default_registry
from .street_matching import RapidFuzzStreetMatcher, StreetMatcher

_PERCENT_IN_LABEL = re.compile(r"\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)")

# Ein Asset ist ein Gewerk, wenn sein Name hierauf endet.
GEWERK_NAME_SUFFIX = "Netz"


class DuplicateDocumentError(Exception):
    """Ein Dokument mit dieser Prüfsumme wurde bereits importiert."""

    def __init__(self, sha256: str) -> None:
        super().__init__(f"Dokument mit sha256={sha256} existiert bereits.")
        self.sha256 = sha256


class ApplicationImporter:
    """Erzeugt aus einem Parser-Export genau eine ``Application``."""

    def __init__(
            self,
            parser_registry: Optional[ParserRegistry] = None,
            street_matcher: Optional[StreetMatcher] = None,
    ) -> None:
        self._parsers = parser_registry or default_registry()
        self._street_matcher = street_matcher or RapidFuzzStreetMatcher()

    @transaction.atomic
    def import_export(self, export: Mapping[str, Any]) -> Application:
        """Importiert einen Export im neuen Parser-Format.

        Erwartet ein flaches ``targets``-Mapping (Label -> Rohwert/``null``).
        Wirft ``DuplicateDocumentError`` bei einem bereits importierten Dokument.
        """
        targets = export.get("targets", {})
        sha256 = self._compute_sha256(export.get("source_file", ""), targets)
        if Application.objects.filter(sha256=sha256).exists():
            raise DuplicateDocumentError(sha256)

        fields_by_label = self._fields_from_targets(targets)

        data: dict[str, Any] = {"sha256": sha256}
        self._apply_scalar_fields(fields_by_label, data)
        self._apply_execution_time(fields_by_label, data)
        self._apply_surcharges(fields_by_label, data)
        self._apply_payment_schedule(fields_by_label, data)
        self._resolve_foreign_keys(fields_by_label, data)

        return Application.objects.create(**data)

    # -- Eingabe-Normalisierung ----------------------------------------------

    @staticmethod
    def _compute_sha256(source_file: str, targets: Mapping[str, Any]) -> str:
        """Leitet eine deterministische Prüfsumme aus dem Export ab.

        Das neue Format liefert keine Prüfsumme mit; identische Extraktionen
        (gleicher Dateiname + gleiche ``targets``) ergeben denselben Hash und
        werden so weiterhin dedupliziert.
        """
        canonical = json.dumps(
            {"source_file": source_file, "targets": dict(targets)},
            sort_keys=True,
            ensure_ascii=False,
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    @staticmethod
    def _fields_from_targets(
            targets: Mapping[str, Any]
    ) -> dict[str, dict[str, Any]]:
        """Wandelt das flache ``targets``-Mapping in Feld-Datensätze um.

        Pro Label wird der passende Parser-Typ ermittelt, sodass die bestehende
        Parser-Infrastruktur unverändert genutzt werden kann. ``null`` oder
        leere Werte werden übersprungen.
        """
        fields: dict[str, dict[str, Any]] = {}
        for label, value in targets.items():
            if value is None:
                continue
            normalized = str(value).strip()
            if not normalized:
                continue
            fields[label] = {
                "label": label,
                "type": field_type_for_label(label),
                "value_normalized": normalized,
            }
        return fields

    # -- Teilschritte --------------------------------------------------------

    def _apply_scalar_fields(
            self, fields_by_label: Mapping[str, Any], data: dict[str, Any]
    ) -> None:
        for label, target in SCALAR_FIELD_MAP.items():
            field = fields_by_label.get(label)
            if field is None:
                continue
            value = self._parsers.parse(field)
            if value is not None:
                data[target] = value

    def _apply_execution_time(
            self, fields_by_label: Mapping[str, Any], data: dict[str, Any]
    ) -> None:
        field = fields_by_label.get(LABEL_EXECUTION_TIME)
        if field is None:
            return
        start, end = self._parsers.parse(field)
        data["execution_start"] = start
        data["execution_end"] = end

    def _apply_surcharges(
            self, fields_by_label: Mapping[str, Any], data: dict[str, Any]
    ) -> None:
        for rule in SURCHARGE_RULES:
            field = self._find_by_prefix(fields_by_label, rule.label_prefix)
            if field is None:
                continue
            data[rule.amount_field] = self._parsers.parse(field)
            rate = self._rate_from_label(field["label"])
            if rate is not None:
                data[rule.rate_field] = rate

    def _apply_payment_schedule(
            self, fields_by_label: Mapping[str, Any], data: dict[str, Any]
    ) -> None:
        field = fields_by_label.get(LABEL_PAYMENT_SCHEDULE)
        if field is not None:
            data["payment_schedule"] = self._parsers.parse(field)

    def _resolve_foreign_keys(
            self, fields_by_label: Mapping[str, Any], data: dict[str, Any]
    ) -> None:
        division_field = fields_by_label.get(LABEL_DIVISION)
        if division_field is not None:
            name = self._parsers.parse(division_field)
            data["division"], _ = Division.objects.get_or_create(name=name)

        asset_field = fields_by_label.get(LABEL_ASSET)
        if asset_field is not None:
            name = self._parsers.parse(asset_field)
            asset, _ = Asset.objects.get_or_create(name=name)
            data["asset"] = asset
            data["trade"] = self._resolve_trade(asset)

        # Straße aus dem (unstrukturierten) Projekttitel ableiten.
        data["street"] = self._street_matcher.match(
            data.get("project_title", ""), Street.objects.all()
        )

    # -- Helfer --------------------------------------------------------------

    @staticmethod
    def _resolve_trade(asset: Asset) -> Optional[Trade]:
        """Liefert das Gewerk zum Asset.

        Endet der Asset-Name auf ``GEWERK_NAME_SUFFIX`` ('Netz'), ist es auf
        jeden Fall ein Gewerk; der Datensatz wird bei Bedarf angelegt.
        Andernfalls wird ein bereits vorhandenes Gewerk übernommen, sonst nichts.
        """
        if asset.name.casefold().endswith(GEWERK_NAME_SUFFIX.casefold()):
            trade, _ = Trade.objects.get_or_create(asset=asset)
            return trade
        return Trade.objects.filter(pk=asset.pk).first()

    @staticmethod
    def _find_by_prefix(
            fields_by_label: Mapping[str, Any], prefix: str
    ) -> Optional[Mapping[str, Any]]:
        for label, field in fields_by_label.items():
            if label.startswith(prefix):
                return field
        return None

    @staticmethod
    def _rate_from_label(label: str) -> Optional[Decimal]:
        match = _PERCENT_IN_LABEL.search(label)
        if not match:
            return None
        percent = Decimal(match.group(1).replace(",", "."))
        return percent / Decimal(100)
