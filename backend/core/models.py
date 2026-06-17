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


class Street(models.Model):
    """Straße"""
    name = models.CharField(
        max_length=300,
        verbose_name="Straße",
    )

    class Meta:
        verbose_name = "Straße"


class Application(models.Model):
    """
    Antrag auf Mittelfreigabe
    """

    # -- Allgemeine Informationen --------------------------------------------
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
    )
    psp_element = models.CharField(
        max_length=50,
        verbose_name="PSP-Element",
    )
    street = models.ForeignKey(
        Street,
        on_delete=models.PROTECT,
        verbose_name="Straße",
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
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Euro pro Meter Trassenlänge (€/m)",
    )

    # -- Kostenpositionen (netto) --------------------------------------------
    material_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Materialkosten netto (€)",
    )
    external_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Fremdleistungen (€)",
    )
    internal_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Eigenleistungen (€)",
    )
    engineering_services = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Ingenieurleistungen Dritte (€)",
    )

    # -- Konfigurierbare Zuschlagssätze -------------------------------------
    material_surcharge_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal("0.17"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Zuschlagssatz Materialkosten",
        help_text="Prozentualer Aufschlag auf die Materialkosten netto (Standard: 0,17 = 17 %).",
    )
    investment_surcharge_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal("0.23"),
        validators=[MinValueValidator(Decimal("0"))],
        verbose_name="Zuschlagssatz Investition",
        help_text=(
            "Prozentualer Aufschlag auf die Gesamtkosten ohne Zuschläge "
            "(Standard: 0,23 = 23 %)."
        ),
    )

    # -- Abgeleitete Kostenfelder (automatisch befüllt) ---------------------
    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        editable=False,
        verbose_name="Zwischenkosten (€)",
        help_text=(
            "Summe aus Materialkosten, Fremd-, Eigen- und Ingenieurleistungen. "
            "Wird automatisch berechnet."
        ),
    )
    material_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        editable=False,
        verbose_name="Materialkostenzuschläge (€)",
        help_text=(
            "Zuschlagssatz Material × Materialkosten netto. "
            "Wird automatisch berechnet."
        ),
    )
    investment_surcharge = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        editable=False,
        verbose_name="Investitionszuschläge (€)",
        help_text=(
            "Zuschlagssatz Investition × Gesamtkosten ohne Zuschläge. "
            "Wird automatisch berechnet."
        ),
    )
    total_surcharges = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        editable=False,
        verbose_name="Zwischensumme Zuschläge (€)",
        help_text=(
            "Summe aus Materialkostenzuschlägen und Investitionszuschlägen. "
            "Wird automatisch berechnet."
        ),
    )
    total_costs = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
        editable=False,
        verbose_name="Gesamtkosten (€)",
        help_text=(
            "Gesamtkosten ohne Zuschläge zuzüglich aller Zuschläge. "
            "Wird automatisch berechnet."
        ),
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
        verbose_name = "Antrag"
        verbose_name_plural = "Anträge"

    def __str__(self) -> str:
        return f"{self.project_title} ({self.fiscal_year})"

    # -- Berechnungsmethoden für abgeleitete Kostenfelder -------------------
    def compute_subtotal(self) -> Decimal:
        """
        Berechnet die Gesamtkosten ohne Zuschläge.

        Formel: Materialkosten + Fremdleistungen + Eigenleistungen
                + Ingenieurleistungen Dritte
        """
        return (
                self.material_costs
                + self.external_services
                + self.internal_services
                + self.engineering_services
        )

    def compute_material_surcharge(self) -> Decimal:
        """
        Berechnet die Materialkostenzuschläge.

        Formel: Materialkosten netto × Zuschlagssatz Material
        """
        return (self.material_costs * self.material_surcharge_rate).quantize(
            Decimal("0.01")
        )

    def compute_investment_surcharge(self) -> Decimal:
        """
        Berechnet die Investitionszuschläge.

        Formel: Gesamtkosten ohne Zuschläge × Zuschlagssatz Investition
        """
        return (self.compute_subtotal() * self.investment_surcharge_rate).quantize(
            Decimal("0.01")
        )

    def compute_total_surcharges(self) -> Decimal:
        """
        Berechnet die Zwischensumme aller Zuschläge.

        Formel: Materialkostenzuschläge + Investitionszuschläge
        """
        return self.compute_material_surcharge() + self.compute_investment_surcharge()

    def compute_total_costs(self) -> Decimal:
        """
        Berechnet die Gesamtkosten.

        Formel: Gesamtkosten ohne Zuschläge + Zwischensumme Zuschläge
        """
        return self.compute_subtotal() + self.compute_total_surcharges()
