"""
Deklarative Zuordnung Export-Label -> Modellfeld.

Die meisten Felder sind stabile 1:1-Mappings. Wenige brauchen Sonderlogik
(Zeitraum, Fremdschlüssel, Zahlungsplan, Zuschläge mit Satz im Label); deren
Labels werden hier als Konstanten geführt und im Importer behandelt.
"""

from __future__ import annotations

from dataclasses import dataclass

# Skalare 1:1-Zuordnungen: Label -> Modellfeld.
SCALAR_FIELD_MAP: dict[str, str] = {
    "Projekttitel": "project_title",
    "Geschäftsjahr": "fiscal_year",
    "Antragsgrund": "reason",
    "PSP-Element": "psp_element",
    "Leitungsmeter": "pipe_length_m",
    "Materialkosten (netto)": "planned_material_costs",
    "Fremdleistungen": "planned_external_services",
    "Eigenleistungen": "planned_internal_services",
    "Ingenieurleistungen Dritte": "planned_engineering_services",
    "Gesamtkosten ohne Zuschläge": "planned_subtotal",
    "Zwischensumme Zuschläge": "planned_total_surcharges",
    "Gesamtkosten": "planned_total_costs",
    # Sobald 'Euro pro Meter Trassenlänge' im PDF auftaucht, hier ergänzen:
    # "Euro pro Meter Trassenlänge": "cost_per_meter",
}


@dataclass(frozen=True)
class SurchargeRule:
    """Zuschlagsfeld, dessen Prozentsatz im Label steht ('… (17%)')."""

    label_prefix: str
    amount_field: str
    rate_field: str


SURCHARGE_RULES: tuple[SurchargeRule, ...] = (
    SurchargeRule(
        label_prefix="Materialkostenzuschläge",
        amount_field="planned_material_surcharge",
        rate_field="material_surcharge_rate",
    ),
    SurchargeRule(
        label_prefix="Investitionszuschläge",
        amount_field="planned_investment_surcharge",
        rate_field="investment_surcharge_rate",
    ),
)

# Labels mit Sonderbehandlung.
LABEL_EXECUTION_TIME = "Ausführungszeit (von - bis)"
LABEL_DIVISION = "Sparte"
LABEL_ASSET = "Asset"
LABEL_PAYMENT_SCHEDULE = "Zahlungsplan"
