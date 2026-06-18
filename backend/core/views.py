"""
Django REST Framework – Views für Investitionsantrag.
Streng basierend auf models(1).py (hand-edited, autoritativ).

Endpunkte:
  /api/planned_costs/  [+ /year/<y>/, /street/<id>/, /division/<id>/, /asset/<id>/, /trade/<id>/]
  /api/real_costs/     [dto.]
  /api/streets/        [+ /<id>/]
  /api/divisions/      [+ /<id>/]
  /api/assets/         [+ /<id>/]
  /api/trades/         [+ /<id>/]
"""

from decimal import Decimal

from django.db.models import Sum
from rest_framework import generics, viewsets
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import ApplicationFilter
from .importer import ApplicationImporter, DuplicateDocumentError
from .models import Application, Asset, Division, Street, Trade
from .parsers import FieldParseError
from .serializers import (
    ApplicationSerializer,
    AssetSerializer,
    DivisionSerializer,
    StreetSerializer,
    TradeSerializer,
)
from .serializers import ExportSerializer


# ── Lookup ViewSets ────────────────────────────────────────────────────────────

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


# ── Basis-Mixin für Kosten-Aggregation ─────────────────────────────────────────

class CostAggregationMixin:
    """
    Mischt Kosten-Felder nach fiscal_year, division, asset, trade, street.
    Subklassen definieren das Zielfeld (planned vs. real) und den Serializer-
    Feld-Namen.
    """

    cost_field = None  # z.B. "planned_total_costs"
    label = None

    def get_base_qs(self, request):
        qs = Application.objects.all()
        f = ApplicationFilter(request.GET, queryset=qs)
        return f.qs

    def aggregate(self, request, qs, *group_by):
        total = (
                qs.aggregate(total=Sum(self.cost_field))["total"] or Decimal("0")
        )
        return {
            "count": qs.count(),
            "total_costs": total,
        }

    def get_year_qs(self, request, year):
        return self.get_base_qs(request).filter(fiscal_year=year)

    def get_street_qs(self, request, street_id):
        return self.get_base_qs(request).filter(street__id=street_id)

    def get_division_qs(self, request, division_id):
        return self.get_base_qs(request).filter(division__id=division_id)

    def get_asset_qs(self, request, asset_id):
        return self.get_base_qs(request).filter(asset__id=asset_id)

    def get_trade_qs(self, request, trade_pk):
        return self.get_base_qs(request).filter(trade__pk=trade_pk)


# ── Planned Costs ─────────────────────────────────────────────────────────────

class PlannedCostBase(CostAggregationMixin):
    cost_field = "planned_total_costs"
    label = "planned"

    def get(self, request):
        data = self.aggregate(request, self.get_base_qs(request))
        return Response(data)

    def get_year(self, request, year):
        qs = self.get_year_qs(request, year)
        data = self.aggregate(request, qs)
        data["fiscal_year"] = year
        return Response(data)

    def get_street(self, request, street_id):
        qs = self.get_street_qs(request, street_id)
        data = self.aggregate(request, qs)
        data["street_id"] = street_id
        return Response(data)

    def get_street_year(self, request, street_id, year):
        qs = self.get_street_qs(request, street_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["street_id"] = street_id
        data["fiscal_year"] = year
        return Response(data)

    def get_division(self, request, division_id):
        qs = self.get_division_qs(request, division_id)
        data = self.aggregate(request, qs)
        data["division_id"] = division_id
        return Response(data)

    def get_division_year(self, request, division_id, year):
        qs = self.get_division_qs(request, division_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["division_id"] = division_id
        data["fiscal_year"] = year
        return Response(data)

    def get_asset(self, request, asset_id):
        qs = self.get_asset_qs(request, asset_id)
        data = self.aggregate(request, qs)
        data["asset_id"] = asset_id
        return Response(data)

    def get_asset_year(self, request, asset_id, year):
        qs = self.get_asset_qs(request, asset_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["asset_id"] = asset_id
        data["fiscal_year"] = year
        return Response(data)

    def get_trade(self, request, trade_pk):
        qs = self.get_trade_qs(request, trade_pk)
        data = self.aggregate(request, qs)
        data["trade_pk"] = trade_pk
        return Response(data)

    def get_trade_year(self, request, trade_pk, year):
        qs = self.get_trade_qs(request, trade_pk).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["trade_pk"] = trade_pk
        data["fiscal_year"] = year
        return Response(data)


class PlannedCostListView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/"""

    def get(self, request):
        return super().get(request)


class PlannedCostYearView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/year/<int:year>/"""

    def get(self, request, year):
        return super().get_year(request, year)


class PlannedCostStreetView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/street/<int:street_id>/"""

    def get(self, request, street_id):
        return super().get_street(request, street_id)


class PlannedCostStreetYearView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/street/<int:street_id>/<int:year>/"""

    def get(self, request, street_id, year):
        return super().get_street_year(request, street_id, year)


class PlannedCostDivisionView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/division/<int:division_id>/"""

    def get(self, request, division_id):
        return super().get_division(request, division_id)


class PlannedCostDivisionYearView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/division/<int:division_id>/<int:year>/"""

    def get(self, request, division_id, year):
        return super().get_division_year(request, division_id, year)


class PlannedCostAssetView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/asset/<int:asset_id>/"""

    def get(self, request, asset_id):
        return super().get_asset(request, asset_id)


class PlannedCostAssetYearView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/asset/<int:asset_id>/<int:year>/"""

    def get(self, request, asset_id, year):
        return super().get_asset_year(request, asset_id, year)


class PlannedCostTradeView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/trade/<int:trade_pk>/"""

    def get(self, request, trade_pk):
        return super().get_trade(request, trade_pk)


class PlannedCostTradeYearView(PlannedCostBase, generics.GenericAPIView):
    """GET /api/planned_costs/trade/<int:trade_pk>/<int:year>/"""

    def get(self, request, trade_pk, year):
        return super().get_trade_year(request, trade_pk, year)


# ── Real Costs ─────────────────────────────────────────────────────────────────

class RealCostBase(CostAggregationMixin):
    cost_field = "real_total_costs"
    label = "real"

    def get(self, request):
        data = self.aggregate(request, self.get_base_qs(request))
        return Response(data)

    def get_year(self, request, year):
        qs = self.get_year_qs(request, year)
        data = self.aggregate(request, qs)
        data["fiscal_year"] = year
        return Response(data)

    def get_street(self, request, street_id):
        qs = self.get_street_qs(request, street_id)
        data = self.aggregate(request, qs)
        data["street_id"] = street_id
        return Response(data)

    def get_street_year(self, request, street_id, year):
        qs = self.get_street_qs(request, street_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["street_id"] = street_id
        data["fiscal_year"] = year
        return Response(data)

    def get_division(self, request, division_id):
        qs = self.get_division_qs(request, division_id)
        data = self.aggregate(request, qs)
        data["division_id"] = division_id
        return Response(data)

    def get_division_year(self, request, division_id, year):
        qs = self.get_division_qs(request, division_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["division_id"] = division_id
        data["fiscal_year"] = year
        return Response(data)

    def get_asset(self, request, asset_id):
        qs = self.get_asset_qs(request, asset_id)
        data = self.aggregate(request, qs)
        data["asset_id"] = asset_id
        return Response(data)

    def get_asset_year(self, request, asset_id, year):
        qs = self.get_asset_qs(request, asset_id).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["asset_id"] = asset_id
        data["fiscal_year"] = year
        return Response(data)

    def get_trade(self, request, trade_pk):
        qs = self.get_trade_qs(request, trade_pk)
        data = self.aggregate(request, qs)
        data["trade_pk"] = trade_pk
        return Response(data)

    def get_trade_year(self, request, trade_pk, year):
        qs = self.get_trade_qs(request, trade_pk).filter(fiscal_year=year)
        data = self.aggregate(request, qs)
        data["trade_pk"] = trade_pk
        data["fiscal_year"] = year
        return Response(data)


class RealCostListView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/"""

    def get(self, request):
        return super().get(request)


class RealCostYearView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/year/<int:year>/"""

    def get(self, request, year):
        return super().get_year(request, year)


class RealCostStreetView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/street/<int:street_id>/"""

    def get(self, request, street_id):
        return super().get_street(request, street_id)


class RealCostStreetYearView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/street/<int:street_id>/<int:year>/"""

    def get(self, request, street_id, year):
        return super().get_street_year(request, street_id, year)


class RealCostDivisionView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/division/<int:division_id>/"""

    def get(self, request, division_id):
        return super().get_division(request, division_id)


class RealCostDivisionYearView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/division/<int:division_id>/<int:year>/"""

    def get(self, request, division_id, year):
        return super().get_division_year(request, division_id, year)


class RealCostAssetView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/asset/<int:asset_id>/"""

    def get(self, request, asset_id):
        return super().get_asset(request, asset_id)


class RealCostAssetYearView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/asset/<int:asset_id>/<int:year>/"""

    def get(self, request, asset_id, year):
        return super().get_asset_year(request, asset_id, year)


class RealCostTradeView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/trade/<int:trade_pk>/"""

    def get(self, request, trade_pk):
        return super().get_trade(request, trade_pk)


class RealCostTradeYearView(RealCostBase, generics.GenericAPIView):
    """GET /api/real_costs/trade/<int:trade_pk>/<int:year>/"""

    def get(self, request, trade_pk, year):
        return super().get_trade_year(request, trade_pk, year)


# ── Application ViewSet (für Detail-Ansicht) ───────────────────────────────────

class ApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Application.objects.select_related(
        "division", "asset", "trade", "street"
    ).all()
    serializer_class = ApplicationSerializer
    filterset_class = ApplicationFilter


class ApplicationImportView(APIView):
    """Nimmt einen Parser-Export entgegen und legt eine ``Application`` an."""

    importer_class = ApplicationImporter

    def post(self, request: Request) -> Response:
        serializer = ExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        importer = self.importer_class()
        try:
            importer.import_export(serializer.validated_data)
        except DuplicateDocumentError:
            return Response(status=status.HTTP_409_CONFLICT)
        except (FieldParseError, KeyError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(status=status.HTTP_204_NO_CONTENT)
