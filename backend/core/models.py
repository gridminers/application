"""
Django ORM – Modelle für den Investitionsantrag.

Feldzuordnung (Deutsch → Englisch):
    Projekttitel                → project_title
    Geschäftsjahr               → fiscal_year
    Ausführungszeit von         → execution_start
    Ausführungszeit bis         → execution_end
    Antragsgrund                → reason
    Sparte                      → division                  (ForeignKey)
    Asset                       → asset                     (ForeignKey)
    PSP-Element                 → psp_element
    Leitungsmeter               → pipe_length_m
    Euro pro Meter Trassenlänge → cost_per_meter
    Materialkosten (netto)      → material_costs
    Fremdleistungen             → external_services
    Eigenleistungen             → internal_services
    Ingenieurleistungen Dritte  → engineering_services
    Gesamtkosten ohne Zuschläge → subtotal                  (gespeichert, automatisch befüllt)
    Materialkostenzuschläge     → material_surcharge        (gespeichert, automatisch befüllt)
    Zuschlagssatz Material      → material_surcharge_rate   (konfigurierbarer Prozentsatz)
    Investitionszuschläge       → investment_surcharge      (gespeichert, automatisch befüllt)
    Zuschlagssatz Investition   → investment_surcharge_rate (konfigurierbarer Prozentsatz)
    Zwischensumme Zuschläge     → total_surcharges          (gespeichert, automatisch befüllt)
    Gesamtkosten                → total_costs               (gespeichert, automatisch befüllt)
    Zahlungsplan                → payment_schedule          (JSONField, Liste von Monatsraten)
    Straße                      → street
"""

from __future__ import annotations

from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Division(models.Model):
    """Sparte – organisatorische Einheit, der das Projekt zugeordnet ist."""

    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Bezeichnung",
    )
    abbreviation = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Kürzel",
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Sparte"
        verbose_name_plural = "Sparten"

    def __str__(self) -> str:
        return self.name


class Asset(models.Model):
    """Asset – technisches Betriebsmittel oder Infrastrukturobjekt des Projekts."""

    name = models.CharField(
        max_length=200,
        unique=True,
        verbose_name="Bezeichnung",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Beschreibung",
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Asset"
        verbose_name_plural = "Assets"

    def __str__(self) -> str:
        return self.name


class Trade(models.Model):
    """Gewerk"""
    asset = models.OneToOneField(
        Asset,
        on_delete=models.CASCADE,
        primary_key=True,
        parent_link=True,
        related_name="trade",
    )

    class Meta:
        verbose_name = "Gewerk"
        verbose_name_plural = "Gewerke"

    def __str__(self) -> str:
        return str(self.asset)


class Street(models.Model):
    """Straße"""
    name = models.CharField(
        max_length=300,
        verbose_name="Straße",
    )

    class Meta:
        verbose_name = "Straße"
        verbose_name_plural = "Straßen"

    def __str__(self) -> str:
        return self.name


class Application(models.Model):
    """
    Antrag auf Mittelfreigabe
    """

    # -- Allgemeine Informationen --------------------------------------------
    sha256 = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="SHA256-Prüfsumme",
    )
    project_title = models.CharField(
        max_length=255,
        verbose_name="Projekttitel",
    )
    fiscal_year = models.PositiveSmallIntegerField(
        verbose_name="Geschäftsjahr",
        help_text="Wird auch als Referenzjahr für die Jahresauswertung verwendet.",
    )
    execution_start = models.DateField(
        verbose_name="Ausführungszeit von",
    )
    execution_end = models.DateField(
        verbose_name="Ausführungszeit bis",
    )
    reason = models.TextField(
        verbose_name="Antragsgrund",
    )

    # -- Klassifizierung -----------------------------------------------------

    division = models.ForeignKey(
        Division,
        on_delete=models.PROTECT,
        related_name="applications",
        verbose_name="Sparte",
    )
    asset = models.ForeignKey(
        Asset,
        on_delete=models.PROTECT,
        related_name="applications",
        verbose_name="Asset",
    )
    trade = models.ForeignKey(
        Trade,
        on_delete=models.PROTECT,
        related_name="applications",
        verbose_name="Gewerk",
        null=True,
        blank=True,
    )
    psp_element = models.CharField(
        max_length=50,
        verbose_name="PSP-Element",
    )
    street = models.ForeignKey(
        Street,
        on_delete=models.PROTECT,
        verbose_name="Straße",
        null=True,
        blank=True,
    )

    # -- Technische Kennzahlen -----------------------------------------------

    pipe_length_m = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Leitungs-/Trassenlänge der Maßnahme (m)",
    )
    cost_per_meter = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Euro pro Meter Trassenlänge (€/m)",
        null=True,
        blank=True,
    )

    # -- Konfigurierbare Zuschlagssätze -------------------------------------
    material_surcharge_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        verbose_name="Zuschlagssatz Materialkosten",
    )
    investment_surcharge_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        verbose_name="Zuschlagssatz Investition",
    )

    # -- Geplante Kosten (netto) --------------------------------------------
    planned_material_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Materialkosten netto (geplant)",
    )
    planned_external_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Fremdleistungen (geplant)",
    )
    planned_internal_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Eigenleistungen (geplant)",
    )
    planned_engineering_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Ingenieurleistungen Dritte (geplant)",
    )
    planned_subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Zwischenkosten 1.-4. (geplant)",
    )
    planned_material_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Materialkostenzuschläge (geplant)",
    )
    planned_investment_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Investitionszuschläge (geplant)",
    )
    planned_total_surcharges = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Zwischensumme Zuschläge 5.-8. (geplant)",
    )
    planned_total_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Gesamtkosten (geplant)",
    )

    # -- Reale Kosten (netto) --------------------------------------------
    real_material_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Materialkosten netto (real)",
        null=True,
    )
    real_external_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Fremdleistungen (real)",
        null=True,
    )
    real_internal_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Eigenleistungen (real)",
        null=True,
    )
    real_engineering_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Ingenieurleistungen Dritte (real)",
        null=True,
    )
    real_material_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Materialkostenzuschläge (real)",
        null=True,
    )
    real_investment_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Investitionszuschläge (real)",
        null=True,
    )
    real_total_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        verbose_name="Gesamtkosten (real)",
        null=True,
    )

    # -- Zahlungsplan --------------------------------------------------------
    payment_schedule = models.JSONField(
        default=list,
        verbose_name="Zahlungsplan",
        help_text=(
            "Liste monatlicher Zahlungsraten über 3 Jahre."
        ),
    )

    # -- Metadaten -----------------------------------------------------------
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Erstellt am",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Zuletzt geändert am",
    )

    class Meta:
        ordering = ["-fiscal_year", "project_title"]
        verbose_name = "Antrag auf Mittelfreigabe"
        verbose_name_plural = "Anträge auf Mittelfreigabe"

    def __str__(self) -> str:
        return f"{self.project_title} ({self.fiscal_year})"
