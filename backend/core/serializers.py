from rest_framework import serializers
from .models import Street, Division, Trade, Asset, PlannedCost, RealCost


class StreetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Street
        fields = ["id", "name"]


class DivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ["id", "name"]


class TradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trade
        fields = ["id", "name"]


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ["id", "name", "street", "division"]


class PlannedCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlannedCost
        fields = [
            "id", "year", "amount",
            "street", "division", "asset", "trade",
        ]


class RealCostSerializer(serializers.ModelSerializer):
    class Meta:
        model = RealCost
        fields = [
            "id", "year", "amount",
            "street", "division", "asset", "trade",
        ]


# Aggregations-Serializer für Summen-Endpunkte
class CostSummarySerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False)
    total = serializers.DecimalField(max_digits=18, decimal_places=2)
    count = serializers.IntegerField()
