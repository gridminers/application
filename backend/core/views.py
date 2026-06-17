
from django.db.models import Sum
from rest_framework import viewsets, mixins
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Street, Division, Trade, Asset, PlannedCost, RealCost
from .serializers import (
    StreetSerializer, DivisionSerializer, TradeSerializer, AssetSerializer,
    PlannedCostSerializer, RealCostSerializer,
)
from .filters import PlannedCostFilter, RealCostFilter


# ---------------------------------------------------------------------------
# Basis-View für Kosten (Planned & Real)
# ---------------------------------------------------------------------------
class BaseCostView(APIView):
    """
    Generische View, die Kosten gefiltert nach optionalen
    Parametern (street_id, division_id, asset_id, trade_id, year)
    zurückgibt – inklusive Einzeldatensätze und Gesamtsumme.
    """
    model = None
    serializer_class = None

    def get_filtered_queryset(self, **kwargs):
        qs = self.model.objects.all()

        if kwargs.get("street_id") is not None:
            qs = qs.filter(street_id=kwargs["street_id"])
        if kwargs.get("division_id") is not None:
            qs = qs.filter(division_id=kwargs["division_id"])
        if kwargs.get("asset_id") is not None:
            qs = qs.filter(asset_id=kwargs["asset_id"])
        if kwargs.get("trade_id") is not None:
            qs = qs.filter(trade_id=kwargs["trade_id"])
        if kwargs.get("year") is not None:
            qs = qs.filter(year=kwargs["year"])

        return qs

    def get(self, request, *args, **kwargs):
        qs = self.get_filtered_queryset(**kwargs)

        total = qs.aggregate(total=Sum("amount"))["total"] or 0
        serializer = self.serializer_class(qs, many=True)

        return Response({
            "filters": {k: v for k, v in kwargs.items() if v is not None},
            "total": total,
            "count": qs.count(),
            "results": serializer.data,
        })


# ---------------------------------------------------------------------------
# Planned Costs
# ---------------------------------------------------------------------------
class PlannedCostView(BaseCostView):
    model = PlannedCost
    serializer_class = PlannedCostSerializer


# ---------------------------------------------------------------------------
# Real Costs
# ---------------------------------------------------------------------------
class RealCostView(BaseCostView):
    model = RealCost
    serializer_class = RealCostSerializer


# ---------------------------------------------------------------------------
# Stammdaten-ViewSets (Streets, Divisions, Assets, Trades)
# ---------------------------------------------------------------------------
class StreetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Street.objects.all()
    serializer_class = StreetSerializer


class DivisionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer


class AssetViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer


class TradeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Trade.objects.all()
    serializer_class = TradeSerializer
