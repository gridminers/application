"""Prompt construction for first-page extraction.

The prompt has been optimized down from the original three-section template:
evidence snippets, per-item confidence, bbox output and page-number injection
were dropped because the stored result is the 19 target fields + warnings only,
and every PDF is processed on its first page.
"""

# Canonical labels for the 19 target fields, in their required order.
TARGET_FIELDS = [
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
]

_BASE = (
    "You are extracting data from the first page of a German infrastructure "
    "planning approval PDF. Read the page image (and the provided text layer, "
    "if any) and return JSON only. Use null for any value you cannot find. Do "
    "not calculate or invent values. Some fields may be striked through by hand, maybe there is even a handwritten follow up: Prefer the follow up handwritten one in such cases."
)

_TARGET = (
    "Find these 19 target values whenever visible:\n"
    + "\n".join(f"{i}. {label}" for i, label in enumerate(TARGET_FIELDS, start=1))
    + "\n\n"
    "Use the canonical label exactly as written above, even if the document "
    "uses a synonym or abbreviation. For Geschäftsjahr, also treat it as the "
    "value for Jahresauswertung. For Ausführungszeit, capture both von and bis "
    "in one value. BE CAREFULE WITH HANDWRITTEN ADJUSTMENTS IN THIS FIELD. WATCH OUT FOR STRIKED THROUGH TEXT AND EXCLUDE IT. For cost fields, preserve net/gross wording and currency "
    "exactly as shown. For Zahlungsplan, extract the visible three-year payment "
    "plan; if only partial yearly payments are visible, return the visible "
    "years and amounts. Do not calculate or invent missing values. Add a "
    "warning only when a relevant cost/project value appears present but is "
    "unreadable or ambiguous. Sparte is the bold category of either Stom, Infortechnik, Wasser, Gas, and sometimes Fernwärme. You choose the one where one of the checkmarks is checked. Asset is the field inside of the Sparte-categories that has the checkmark. Its always first the checkbox followed by the label on the right."
)

_LAYOUT = (
    "Use spatial layout, not line-by-line reading, to pair labels and values: a "
    "value is usually to the right of its label in the same row, directly below "
    "it, or within the same table row/cell. Do not combine text across distant "
    "columns, unrelated rows, headers, footers, or sections."
)

_PROMPT = "\n\n".join([_BASE, _TARGET, _LAYOUT])


def build_prompt(text_layer: str | None = None) -> str:
    """Return the full prompt, appending the page-1 text layer when available."""
    if text_layer and text_layer.strip():
        return (
            _PROMPT
            + "\n\nExtracted text layer from this page (may be incomplete or "
            "noisy; the image is authoritative):\n"
            + text_layer.strip()
        )
    return _PROMPT
