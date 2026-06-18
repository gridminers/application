"""
Straßen-Matching.

Der Projekttitel ist unstrukturierter Freitext. Wir versuchen, daraus eine der
in der Tabelle ``Street`` hinterlegten Straßen zu erkennen. Die Strategie ist
über das ``StreetMatcher``-Interface austauschbar.

Zwei Implementierungen stehen bereit:
  * ``RapidFuzzStreetMatcher`` (Default) – unscharfer Abgleich via rapidfuzz,
    toleriert Tippfehler/OCR-Rauschen, mit konfigurierbarem Schwellenwert.
  * ``SubstringStreetMatcher`` – reiner Teilzeichenketten-Abgleich ohne externe
    Abhängigkeit (Fallback).
"""

from __future__ import annotations

import re
from abc import ABC, abstractmethod
from typing import Callable, Iterable, Optional

from rapidfuzz import fuzz, process

# Import an die tatsächliche App anpassen, z. B. `from .models import Street`.
try:  # pragma: no cover - reiner Import-Komfort
    from .models import Street
except Exception:  # noqa: BLE001
    Street = object  # type: ignore[assignment, misc]


# -- Normalisierung (von beiden Matchern genutzt) ---------------------------

_CHAR_REPLACEMENTS = {"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}

# Schreibvarianten von Straßentyp-Bezeichnern -> Normalform. Längere zuerst.
# Erweiterbar: weitere Paare (regex, normalform) ergänzen.
_ABBREVIATIONS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"strasse\b\.?"), "str"),
    (re.compile(r"str\b\.?"), "str"),
    (re.compile(r"platz\b\.?"), "pl"),
    (re.compile(r"pl\b\.?"), "pl"),
)

_NON_ALNUM = re.compile(r"[^a-z0-9]+")


def normalize_street_text(text: str) -> str:
    """Bringt Straßennamen/Titel auf eine vergleichbare Normalform.

    Faltet Umlaute/ß, vereinheitlicht Straßentyp-Abkürzungen ('str.'/'strasse'
    -> 'str') und entfernt restliche Sonderzeichen und Leerräume.
    """
    text = (text or "").casefold()
    for source, target in _CHAR_REPLACEMENTS.items():
        text = text.replace(source, target)
    for pattern, replacement in _ABBREVIATIONS:
        text = pattern.sub(replacement, text)
    return _NON_ALNUM.sub("", text)


# -- Strategie-Interface -----------------------------------------------------

class StreetMatcher(ABC):
    """Findet die zum Projekttitel passende Straße (oder ``None``)."""

    @abstractmethod
    def match(self, project_title: str, streets: Iterable["Street"]) -> Optional["Street"]:
        ...


class RapidFuzzStreetMatcher(StreetMatcher):
    """Unscharfer Abgleich via rapidfuzz.

    Bewertet jeden (normalisierten) Straßennamen gegen den normalisierten Titel
    mit ``partial_ratio`` – findet den Namen damit auch als Teilstück langer
    Titel und toleriert Tippfehler/OCR-Rauschen. Es gewinnt der höchste Score,
    sofern er ``score_cutoff`` (0–100) erreicht.
    """

    def __init__(
        self,
        *,
        score_cutoff: float = 85.0,
        scorer: Callable = fuzz.partial_ratio,
    ) -> None:
        self._score_cutoff = score_cutoff
        self._scorer = scorer

    def match(self, project_title: str, streets: Iterable["Street"]) -> Optional["Street"]:
        street_list = list(streets)
        if not street_list:
            return None
        title = normalize_street_text(project_title)
        choices = [normalize_street_text(street.name) for street in street_list]
        result = process.extractOne(
            title,
            choices,
            scorer=self._scorer,
            score_cutoff=self._score_cutoff,
        )
        if result is None:
            return None
        _matched_text, _score, index = result
        return street_list[index]


class SubstringStreetMatcher(StreetMatcher):
    """Reiner Teilzeichenketten-Abgleich ohne externe Abhängigkeit.

    Bei mehreren Treffern gewinnt der längste (spezifischste) Straßenname.
    """

    def match(self, project_title: str, streets: Iterable["Street"]) -> Optional["Street"]:
        title = normalize_street_text(project_title)
        best: Optional["Street"] = None
        best_length = 0
        for street in streets:
            name = normalize_street_text(street.name)
            if name and name in title and len(name) > best_length:
                best, best_length = street, len(name)
        return best