"""
Django REST Framework – Views für Investitionsantrag.

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


# ── Kosten-Aggregation ─────────────────────────────────────────────────────────

# URL-Kwarg -> (ORM-Lookup, Response-Schlüssel). Eine einzige ``get``-Methode
# wertet aus, welche dieser Scopes die URL liefert, und filtert/annotiert
# entsprechend – damit deckt eine View alle Kombinationen ab
# (list / year / street / division / asset / trade, jeweils optional mit Jahr).
SCOPE_FILTERS: dict[str, tuple[str, str]] = {
    "year": ("fiscal_year", "fiscal_year"),
    "street_id": ("street__id", "street_id"),
    "division_id": ("division__id", "division_id"),
    "asset_id": ("asset__id", "asset_id"),
    "trade_pk": ("trade__pk", "trade_pk"),
}


class CostAggregationView(generics.GenericAPIView):
    """Aggregiert ein Kosten-Feld über die per URL gelieferten Scopes.

    Subklassen setzen nur ``cost_field`` (geplant vs. real). Die Antwort enthält
    ``count`` und ``total_costs`` sowie je gefiltertem Scope dessen Schlüssel
    (``fiscal_year``/``street_id``/``division_id``/``asset_id``/``trade_pk``).
    """

    cost_field: str = None

    def get_base_qs(self, request):
        return ApplicationFilter(request.GET, queryset=Application.objects.all()).qs

    def aggregate(self, qs) -> dict:
        total = qs.aggregate(total=Sum(self.cost_field))["total"] or Decimal("0")
        return {"count": qs.count(), "total_costs": total}

    def get(self, request, **kwargs):
        qs = self.get_base_qs(request)
        scope: dict[str, object] = {}
        for kwarg, value in kwargs.items():
            lookup, out_key = SCOPE_FILTERS[kwarg]
            qs = qs.filter(**{lookup: value})
            scope[out_key] = value
        return Response({**self.aggregate(qs), **scope})


class PlannedCostView(CostAggregationView):
    """GET /api/planned_costs/[year|street|division|asset|trade/...]"""

    cost_field = "planned_total_costs"


class RealCostView(CostAggregationView):
    """GET /api/real_costs/[year|street|division|asset|trade/...]"""

    cost_field = "real_total_costs"


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
