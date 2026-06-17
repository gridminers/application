"""
Value-Parser für den BA-Import.

Jeder Parser kennt genau einen Quell-Datentyp aus der Export-JSON (``type``)
und überführt den Rohwert in einen sauberen Python-Typ. Neue Datentypen werden
durch eine neue Parser-Klasse + Registrierung ergänzt, ohne bestehende Parser
anzufassen (Open/Closed).
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Mapping


class FieldParseError(ValueError):
    """Ein Feldwert ließ sich nicht in den Zieltyp überführen."""


def parse_german_decimal(raw: str) -> Decimal:
    """Wandelt eine deutsche Zahldarstellung in ein ``Decimal``.

    ``.`` ist Tausendertrenner, ``,`` ist Dezimaltrenner. Einheiten und
    Währungszeichen (``€``, ``m`` …) werden vorab entfernt.

    >>> parse_german_decimal("93.500 €")
    Decimal('93500')
    >>> parse_german_decimal("1.234,56 €")
    Decimal('1234.56')
    """
    cleaned = re.sub(r"[^\d,.\-]", "", raw)
    cleaned = cleaned.replace(".", "").replace(",", ".")
    if not cleaned or cleaned in {"-", "."}:
        raise FieldParseError(f"Keine Zahl in {raw!r} gefunden.")
    try:
        return Decimal(cleaned)
    except InvalidOperation as exc:
        raise FieldParseError(f"{raw!r} ist keine gültige Zahl.") from exc


class ValueParser(ABC):
    """Basisklasse für alle Value-Parser."""

    @abstractmethod
    def parse(self, field: Mapping[str, Any]) -> Any:
        """Liefert den getypten Wert für ein einzelnes Export-Feld."""

    @staticmethod
    def raw_value(field: Mapping[str, Any]) -> str:
        """Bevorzugt ``value_normalized``, sonst ``sanitized_value``."""
        value = field.get("value_normalized") or field.get("sanitized_value") or ""
        return str(value).strip()


class StringParser(ValueParser):
    """Reiner Text/Kategorie/Identifier."""

    def parse(self, field: Mapping[str, Any]) -> str:
        return self.raw_value(field)


class YearParser(ValueParser):
    """Vierstellige Jahreszahl -> int."""

    def parse(self, field: Mapping[str, Any]) -> int:
        match = re.search(r"\d{4}", self.raw_value(field))
        if not match:
            raise FieldParseError(f"Keine Jahreszahl in {field.get('label')!r}.")
        return int(match.group())


class CurrencyParser(ValueParser):
    """Währungsbetrag (deutsches Format) -> Decimal."""

    def parse(self, field: Mapping[str, Any]) -> Decimal:
        return parse_german_decimal(self.raw_value(field))


class LengthParser(ValueParser):
    """Längenangabe ('0 m') -> Decimal."""

    def parse(self, field: Mapping[str, Any]) -> Decimal:
        return parse_german_decimal(self.raw_value(field))


class DateRangeParser(ValueParser):
    """'TT/MM/JJJJ - TT/MM/JJJJ' -> (start, end)."""

    _SEPARATOR = re.compile(r"\s+-\s+")
    _DATE_FORMAT = "%d/%m/%Y"

    def parse(self, field: Mapping[str, Any]) -> tuple[date, date]:
        raw = self.raw_value(field)
        parts = self._SEPARATOR.split(raw)
        if len(parts) != 2:
            raise FieldParseError(f"Kein gültiger Zeitraum: {raw!r}.")
        return self._to_date(parts[0]), self._to_date(parts[1])

    def _to_date(self, value: str) -> date:
        try:
            return datetime.strptime(value.strip(), self._DATE_FORMAT).date()
        except ValueError as exc:
            raise FieldParseError(f"Ungültiges Datum: {value!r}.") from exc


class PaymentPlanParser(ValueParser):
    """Zahlungsplan -> Liste aus {'year', 'share', 'amount'}.

    ``share`` ist ein Bruch (50 % -> 0.5), ``amount`` ein Decimal-String
    (JSON-serialisierbar).
    """

    _ENTRY = re.compile(
        r"(?P<year>\d{4})\s*:\s*(?P<amount>[\d.,]+)\s*€\s*"
        r"\(\s*(?P<share>\d+)\s*%\s*\)"
    )

    def parse(self, field: Mapping[str, Any]) -> list[dict[str, Any]]:
        raw = self.raw_value(field)
        entries: list[dict[str, Any]] = []
        for chunk in raw.split(";"):
            match = self._ENTRY.search(chunk)
            if not match:
                continue
            entries.append(
                {
                    "year": int(match.group("year")),
                    "share": int(match.group("share")) / 100,
                    "amount": str(parse_german_decimal(match.group("amount"))),
                }
            )
        if not entries:
            raise FieldParseError(f"Kein Zahlungsplan erkennbar: {raw!r}.")
        return entries


class ParserRegistry:
    """Bildet ``type`` -> Parser ab. Unbekannte Typen liefern ``None``."""

    def __init__(self) -> None:
        self._by_type: dict[str, ValueParser] = {}

    def register(self, field_type: str, parser: ValueParser) -> None:
        self._by_type[field_type] = parser

    def parse(self, field: Mapping[str, Any]) -> Any:
        parser = self._by_type.get(field.get("type", ""))
        return parser.parse(field) if parser is not None else None


def default_registry() -> ParserRegistry:
    """Standard-Registry mit allen aktuell benötigten Parsern."""
    registry = ParserRegistry()
    string_parser = StringParser()
    for field_type in ("string", "category", "identifier", "text", "boolean"):
        registry.register(field_type, string_parser)
    registry.register("year", YearParser())
    registry.register("currency", CurrencyParser())
    registry.register("length", LengthParser())
    registry.register("date_range", DateRangeParser())
    registry.register("payment_plan", PaymentPlanParser())
    return registry
