"""
LLM-gestützte Veredelung eingehender Parser-Exporte.

Bevor ein Export deterministisch geparst und persistiert wird, schickt der
Importer dessen rohe ``targets`` durch dasselbe Azure-OpenAI-Modell, das auch
der Parser nutzt. Das Modell übernimmt einen *Refining-/Sanitizing-/Enriching*-
Schritt: Es bringt die extrahierten Werte in genau die kanonischen Formate, die
die deterministischen ``ValueParser`` erwarten (deutsche Dezimalzahlen,
vierstellige Jahre, ``von - bis``-Zeiträume, Zahlungsplan-Syntax …), ohne neue
Werte zu erfinden. Dadurch werden Anträge importiert, die bisher allein wegen
kleiner Formatprobleme abgelehnt wurden.

Designprinzipien:

* **Austauschbar/Testbar** – ``DocumentRefiner`` ist eine ABC; im Importer wird
  eine Implementierung injiziert (Default via :func:`default_refiner`).
* **Best effort** – schlägt der LLM-Aufruf fehl oder ist das Modell nicht
  konfiguriert, fällt der Refiner transparent auf die Originalwerte zurück; der
  Import läuft dann unverändert über die bestehende Parser-Infrastruktur.
* **Keine HTTP-/Django-View-Details** – nutzbar aus Views, Management-Commands
  und Tasks.
"""

from __future__ import annotations

import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Mapping, Optional

import requests

logger = logging.getLogger(__name__)

# Kanonische Labels der 19 Zielfelder (Reihenfolge wie im Parser-Export).
TARGET_FIELDS: tuple[str, ...] = (
    "Projekttitel",
    "Geschäftsjahr",
    "Ausführungszeit (von - bis)",
    "Antragsgrund",
    "Sparte",
    "Asset",
    "PSP-Element",
    "Leitungsmeter",
    "Euro pro Meter Trassenlänge",
    "Materialkosten (netto)",
    "Fremdleistungen",
    "Eigenleistungen",
    "Ingenieurleistungen Dritte",
    "Gesamtkosten ohne Zuschläge",
    "Materialkostenzuschläge (17%)",
    "Investitionszuschläge (23%)",
    "Zwischensumme Zuschläge",
    "Gesamtkosten",
    "Zahlungsplan",
)

# Strict-Schema für die Azure-Responses-API (structured outputs). Jede Property
# muss in ``required`` stehen und ``additionalProperties`` muss ``false`` sein;
# nullbare Felder nutzen die ``["string", "null"]``-Form.
REFINER_FORMAT: dict[str, Any] = {
    "type": "json_schema",
    "name": "refinement",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["targets", "warnings"],
        "properties": {
            "targets": {
                "type": "object",
                "additionalProperties": False,
                "required": list(TARGET_FIELDS),
                "properties": {
                    label: {"type": ["string", "null"]} for label in TARGET_FIELDS
                },
            },
            "warnings": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
    },
}

# Formatregeln, die exakt die Erwartungen der ``ValueParser`` widerspiegeln.
_FORMAT_RULES = (
    "Bringe jeden vorhandenen Wert in das folgende kanonische Zielformat. "
    "Erfinde oder berechne KEINE Werte: Was im Original fehlt oder unleserlich "
    "ist, bleibt null. Lasse bereits korrekte Werte unverändert.\n"
    "- 'Projekttitel', 'Antragsgrund': Freitext, nur offensichtliche OCR-/"
    "Zeichenfehler bereinigen.\n"
    "- 'Geschäftsjahr': eine vierstellige Jahreszahl, z. B. '2024'.\n"
    "- 'Ausführungszeit (von - bis)': 'TT.MM.JJJJ - TT.MM.JJJJ' mit ' - ' "
    "(Leerzeichen Bindestrich Leerzeichen) als Trenner zwischen Start und Ende.\n"
    "- 'Sparte': genau eine Kategorie aus Strom, Informationstechnik, Wasser, "
    "Gas oder Fernwärme.\n"
    "- 'Asset': die Asset-Kategorie als Freitext (z. B. 'Wassernetz').\n"
    "- 'PSP-Element': der Bezeichner exakt wie angegeben.\n"
    "- 'Leitungsmeter': deutsche Dezimalzahl mit Einheit, z. B. '250 m' oder "
    "'1.234,56 m' (Punkt = Tausendertrenner, Komma = Dezimaltrenner).\n"
    "- Alle Geldfelder ('Euro pro Meter Trassenlänge', 'Materialkosten (netto)', "
    "'Fremdleistungen', 'Eigenleistungen', 'Ingenieurleistungen Dritte', "
    "'Gesamtkosten ohne Zuschläge', 'Materialkostenzuschläge (17%)', "
    "'Investitionszuschläge (23%)', 'Zwischensumme Zuschläge', 'Gesamtkosten'): "
    "deutsche Dezimalzahl gefolgt von ' €', z. B. '93.500,00 €'. Behalte die "
    "Prozentangabe im Label der Zuschlagsfelder unverändert bei.\n"
    "- 'Zahlungsplan': pro Jahr ein Eintrag im Format 'JJJJ: <Anteil> % / "
    "<Betrag> €', mehrere Einträge mit '; ' getrennt, z. B. "
    "'2024: 100 % / 6.956 €' oder '2024: 50 % / 3.000 €; 2025: 50 % / 3.000 €'.\n"
)

_PROMPT_HEADER = (
    "Du bereinigst und normalisierst Felder, die aus der ersten Seite eines "
    "deutschen Infrastruktur-Investitionsantrags extrahiert wurden. Ziel ist es, "
    "die Werte so zu formatieren, dass ein nachgelagerter, strenger Parser sie "
    "akzeptiert. Gib ausschließlich JSON mit denselben 19 Ziel-Labels (Schlüssel "
    "unverändert) plus 'warnings' zurück."
)

_PROMPT_FOOTER = (
    "Übernimm die canonical Labels exakt wie vorgegeben. Behalte bestehende "
    "Warnungen bei und ergänze eine knappe Warnung, wenn ein Wert vorhanden, "
    "aber mehrdeutig/unleserlich ist. Antworte nur mit dem JSON-Objekt."
)


def build_refine_prompt(
        targets: Mapping[str, Any], warnings: Optional[list[str]] = None
) -> str:
    """Baut den Prompt für die LLM-Veredelung eines ``targets``-Mappings."""
    payload = {
        "targets": {label: targets.get(label) for label in TARGET_FIELDS},
        "warnings": list(warnings or []),
    }
    raw_json = json.dumps(payload, ensure_ascii=False, indent=2)
    return "\n\n".join(
        [
            _PROMPT_HEADER,
            _FORMAT_RULES,
            "Rohdaten (Label -> Rohwert oder null):\n" + raw_json,
            _PROMPT_FOOTER,
        ]
    )


# -- Azure-Responses-Client --------------------------------------------------


@dataclass(frozen=True)
class RefinerConfig:
    """Konfiguration für den LLM-Refiner (aus den Django-Settings befüllt)."""

    api_key: str
    model: str
    endpoint: str
    api_version: str
    timeout: int = 60
    max_retries: int = 3
    backoff_base: float = 2.0


class ResponsesClient:
    """Dünner Client für die Azure-OpenAI-Responses-API (structured outputs).

    Spiegelt das Verhalten des Parsers (``parser/main.py``): ``api-key``-Header,
    ``api-version``-Query-Parameter, Retry/Backoff bei 429/5xx. Bei nicht
    behebbaren Fehlern wird eine ``RuntimeError`` geworfen.
    """

    def __init__(self, config: RefinerConfig) -> None:
        self._config = config

    def complete(self, prompt: str, response_format: Mapping[str, Any]) -> dict:
        cfg = self._config
        payload = {
            "model": cfg.model,
            "input": [
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": prompt}],
                }
            ],
            "text": {"format": dict(response_format)},
        }
        headers = {"api-key": cfg.api_key, "Content-Type": "application/json"}
        params = {"api-version": cfg.api_version}

        last_err: Optional[Exception] = None
        for attempt in range(1, cfg.max_retries + 1):
            try:
                resp = requests.post(
                    cfg.endpoint,
                    headers=headers,
                    params=params,
                    json=payload,
                    timeout=cfg.timeout,
                )
            except requests.RequestException as exc:
                last_err = exc
            else:
                if resp.status_code == 200:
                    return self._extract_json(resp.json())
                if resp.status_code == 429 or resp.status_code >= 500:
                    last_err = RuntimeError(
                        f"HTTP {resp.status_code}: {resp.text[:500]}"
                    )
                else:
                    raise RuntimeError(
                        f"HTTP {resp.status_code}: {resp.text[:500]}"
                    )

            if attempt < cfg.max_retries:
                time.sleep(cfg.backoff_base * (2 ** (attempt - 1)))

        raise RuntimeError(f"LLM-Refiner: Retries erschöpft ({last_err})")

    @staticmethod
    def _extract_json(body: Mapping[str, Any]) -> dict:
        """Holt den strukturierten JSON-Text aus einer Responses-API-Antwort."""
        text = body.get("output_text")
        if not text:
            chunks: list[str] = []
            for item in body.get("output", []):
                if item.get("type") != "message":
                    continue
                for part in item.get("content", []):
                    if part.get("type") in ("output_text", "text") and part.get("text"):
                        chunks.append(part["text"])
            text = "".join(chunks)
        if not text:
            raise ValueError(f"Keine Antwort im Body: {json.dumps(body)[:500]}")
        return json.loads(text)


# -- Refiner -----------------------------------------------------------------


class DocumentRefiner(ABC):
    """Veredelt ein rohes ``targets``-Mapping vor der Persistierung."""

    @abstractmethod
    def refine(
            self, targets: Mapping[str, Any], warnings: Optional[list[str]] = None
    ) -> dict[str, Any]:
        """Liefert ein bereinigtes ``targets``-Mapping (gleiche Label)."""


class NullDocumentRefiner(DocumentRefiner):
    """No-Op-Refiner: reicht die Werte unverändert durch.

    Default, wenn kein LLM konfiguriert oder der Refiner deaktiviert ist – das
    bestehende Verhalten bleibt damit vollständig erhalten.
    """

    def refine(
            self, targets: Mapping[str, Any], warnings: Optional[list[str]] = None
    ) -> dict[str, Any]:
        return dict(targets)


class LLMDocumentRefiner(DocumentRefiner):
    """Veredelt ``targets`` per Azure-OpenAI-Modell.

    Schlägt der Aufruf fehl, wird best effort auf die Originalwerte
    zurückgefallen, damit ein LLM-Ausfall keinen Import verhindert.
    """

    def __init__(self, client: ResponsesClient) -> None:
        self._client = client

    def refine(
            self, targets: Mapping[str, Any], warnings: Optional[list[str]] = None
    ) -> dict[str, Any]:
        prompt = build_refine_prompt(targets, warnings)
        try:
            result = self._client.complete(prompt, REFINER_FORMAT)
        except Exception:  # noqa: BLE001 - LLM darf den Import nie blockieren
            logger.warning(
                "LLM-Refiner fehlgeschlagen; nutze Originalwerte.", exc_info=True
            )
            return dict(targets)

        refined = result.get("targets")
        if not isinstance(refined, Mapping):
            logger.warning(
                "LLM-Refiner lieferte kein 'targets'-Objekt; nutze Originalwerte."
            )
            return dict(targets)

        # Nur bekannte Labels übernehmen; fehlende Labels aus dem Original
        # ergänzen, sodass die Struktur stabil bleibt.
        merged = dict(targets)
        for label in TARGET_FIELDS:
            if label in refined:
                merged[label] = refined[label]
        return merged


# -- Factory -----------------------------------------------------------------


def default_refiner() -> DocumentRefiner:
    """Wählt den Refiner anhand der Django-Settings.

    Liefert einen :class:`LLMDocumentRefiner`, sofern die Veredelung aktiviert
    und ein API-Key hinterlegt ist; andernfalls einen :class:`NullDocumentRefiner`.
    """
    from django.conf import settings

    config = getattr(settings, "LLM_REFINER", {}) or {}
    if not config.get("ENABLED"):
        return NullDocumentRefiner()
    api_key = (config.get("API_KEY") or "").strip()
    if not api_key:
        logger.warning(
            "LLM-Refiner aktiviert, aber AZURE_OPENAI_API_KEY fehlt; "
            "veredele nicht (Passthrough)."
        )
        return NullDocumentRefiner()

    client = ResponsesClient(
        RefinerConfig(
            api_key=api_key,
            model=config.get("MODEL", "gpt-5.4"),
            endpoint=config.get("ENDPOINT", ""),
            api_version=config.get("API_VERSION", ""),
            timeout=int(config.get("TIMEOUT", 60)),
            max_retries=int(config.get("MAX_RETRIES", 3)),
        )
    )
    return LLMDocumentRefiner(client)
