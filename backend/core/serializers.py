"""
Django REST Framework – Serializers für Investitionsantrag.
Streng basierend auf models(1).py (hand-edited, autoritativ).
"""

from rest_framework import serializers

from .models import Application, Asset, Division, Street, Trade


class StreetSerializer(serializers.ModelSerializer):
    """Serializer für Straße (Look-up)."""

    class Meta:
        model = Street
        fields = ["id", "name"]


class TradeSerializer(serializers.ModelSerializer):
    """Serializer für Gewerk (Look-up)."""

    class Meta:
        model = Trade
        fields = ["pk", "asset"]


class DivisionSerializer(serializers.ModelSerializer):
    """Serializer für Sparte (Look-up)."""

    class Meta:
        model = Division
        fields = ["id", "name", "abbreviation"]


class AssetSerializer(serializers.ModelSerializer):
    """Serializer für Asset (Look-up)."""

    class Meta:
        model = Asset
        fields = ["id", "name", "description"]


class ApplicationSerializer(serializers.ModelSerializer):
    """Vollständiger Serializer für Investitionsantrag."""

    division = DivisionSerializer(read_only=True)
    asset = AssetSerializer(read_only=True)
    trade = TradeSerializer(read_only=True)
    street = StreetSerializer(read_only=True)

    class Meta:
        model = Application
        fields = [
            # IDs / Relations
            "id",
            "division",
            "asset",
            "trade",
            "street",
            # Stammdaten
            "project_title",
            "fiscal_year",
            "psp_element",
            "reason",
            "execution_start",
            "execution_end",
            # Mengengerüst
            "pipe_length_m",
            "cost_per_meter",
            # Zuschlagsätze
            "material_surcharge_rate",
            "investment_surcharge_rate",
            # Geplante Kosten
            "planned_material_costs",
            "planned_external_services",
            "planned_internal_services",
            "planned_engineering_services",
            "planned_subtotal",
            "planned_material_surcharge",
            "planned_investment_surcharge",
            "planned_total_surcharges",
            "planned_total_costs",
            # Reale Kosten
            "real_material_costs",
            "real_external_services",
            "real_internal_services",
            "real_engineering_services",
            "real_material_surcharge",
            "real_investment_surcharge",
            "real_total_costs",
            # Sonstiges
            "payment_schedule",
            "created_at",
            "updated_at",
        ]


class CostAggregationSerializer(serializers.Serializer):
    """Serializer für aggregierte Kostensummen."""

    count = serializers.IntegerField()
    total_costs = serializers.DecimalField(max_digits=14, decimal_places=2)
