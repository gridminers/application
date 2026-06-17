"""
Straßen-Matching.

Der Projekttitel ist unstrukturierter Freitext. Wir versuchen, daraus eine der
in der Tabelle ``Street`` hinterlegten Straßen zu erkennen. Die Strategie ist
austauschbar (z. B. später durch eine Fuzzy-Variante mit ``rapidfuzz`` ersetzbar),
ohne den Importer anzufassen.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Iterable, Optional

# Hinweis: 'Street' wird nur für Typannotationen gebraucht. Import an die
# tatsächliche App anpassen, z. B. `from .models import Street`.
try:  # pragma: no cover - reiner Import-Komfort
    from .models import Street
except Exception:  # noqa: BLE001
    Street = object  # type: ignore[assignment, misc]


class StreetMatcher(ABC):
    """Findet die zum Projekttitel passende Straße (oder ``None``)."""

    @abstractmethod
    def match(self, project_title: str, streets: Iterable["Street"]) -> Optional["Street"]:
        ...


class SubstringStreetMatcher(StreetMatcher):
    """Erkennt eine Straße als Teilzeichenkette des Titels.

    Bei mehreren Treffern gewinnt der längste (spezifischste) Straßenname.
    Umlaute und ``ß`` werden normalisiert, damit Schreibvarianten matchen.
    """

    _REPLACEMENTS = {
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
        "ß": "ss",
    }

    def match(self, project_title: str, streets: Iterable["Street"]) -> Optional["Street"]:
        title = self._normalize(project_title)
        best: Optional["Street"] = None
        best_length = 0
        for street in streets:
            name = self._normalize(street.name)
            if name and name in title and len(name) > best_length:
                best, best_length = street, len(name)
        return best

    @classmethod
    def _normalize(cls, text: str) -> str:
        text = (text or "").casefold()
        for source, target in cls._REPLACEMENTS.items():
            text = text.replace(source, target)
        return text