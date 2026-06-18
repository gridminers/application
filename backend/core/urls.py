"""
URL-Konfiguration für die Investitionsantrag-API.
Streng basierend auf models(1).py (hand-edited, autoritativ).
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationViewSet,
    AssetViewSet,
    DivisionViewSet,
    PlannedCostAssetView,
    PlannedCostAssetYearView,
    PlannedCostDivisionView,
    PlannedCostDivisionYearView,
    PlannedCostListView,
    PlannedCostStreetView,
    PlannedCostStreetYearView,
    PlannedCostTradeView,
    PlannedCostTradeYearView,
    PlannedCostYearView,
    RealCostAssetView,
    RealCostAssetYearView,
    RealCostDivisionView,
    RealCostDivisionYearView,
    RealCostListView,
    RealCostStreetView,
    RealCostStreetYearView,
    RealCostTradeView,
    RealCostTradeYearView,
    RealCostYearView,
    StreetViewSet,
    TradeViewSet, ApplicationImportView,
)

app_name = "core"

router = DefaultRouter()
router.register(r"streets", StreetViewSet, basename="street")
router.register(r"divisions", DivisionViewSet, basename="division")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"trades", TradeViewSet, basename="trade")
router.register(r"applications", ApplicationViewSet, basename="application")

urlpatterns = [
    # ── Planned Costs ────────────────────────────────────────────────────────
    path(
        "planned_costs/",
        PlannedCostListView.as_view(),
        name="planned-costs-list",
    ),
    path(
        "planned_costs/year/<int:year>/",
        PlannedCostYearView.as_view(),
        name="planned-costs-year",
    ),
    path(
        "planned_costs/street/<int:street_id>/",
        PlannedCostStreetView.as_view(),
        name="planned-costs-street",
    ),
    path(
        "planned_costs/street/<int:street_id>/<int:year>/",
        PlannedCostStreetYearView.as_view(),
        name="planned-costs-street-year",
    ),
    path(
        "planned_costs/division/<int:division_id>/",
        PlannedCostDivisionView.as_view(),
        name="planned-costs-division",
    ),
    path(
        "planned_costs/division/<int:division_id>/<int:year>/",
        PlannedCostDivisionYearView.as_view(),
        name="planned-costs-division-year",
    ),
    path(
        "planned_costs/asset/<int:asset_id>/",
        PlannedCostAssetView.as_view(),
        name="planned-costs-asset",
    ),
    path(
        "planned_costs/asset/<int:asset_id>/<int:year>/",
        PlannedCostAssetYearView.as_view(),
        name="planned-costs-asset-year",
    ),
    path(
        "planned_costs/trade/<int:trade_pk>/",
        PlannedCostTradeView.as_view(),
        name="planned-costs-trade",
    ),
    path(
        "planned_costs/trade/<int:trade_pk>/<int:year>/",
        PlannedCostTradeYearView.as_view(),
        name="planned-costs-trade-year",
    ),

    # ── Real Costs ───────────────────────────────────────────────────────────
    path(
        "real_costs/",
        RealCostListView.as_view(),
        name="real-costs-list",
    ),
    path(
        "real_costs/year/<int:year>/",
        RealCostYearView.as_view(),
        name="real-costs-year",
    ),
    path(
        "real_costs/street/<int:street_id>/",
        RealCostStreetView.as_view(),
        name="real-costs-street",
    ),
    path(
        "real_costs/street/<int:street_id>/<int:year>/",
        RealCostStreetYearView.as_view(),
        name="real-costs-street-year",
    ),
    path(
        "real_costs/division/<int:division_id>/",
        RealCostDivisionView.as_view(),
        name="real-costs-division",
    ),
    path(
        "real_costs/division/<int:division_id>/<int:year>/",
        RealCostDivisionYearView.as_view(),
        name="real-costs-division-year",
    ),
    path(
        "real_costs/asset/<int:asset_id>/",
        RealCostAssetView.as_view(),
        name="real-costs-asset",
    ),
    path(
        "real_costs/asset/<int:asset_id>/<int:year>/",
        RealCostAssetYearView.as_view(),
        name="real-costs-asset-year",
    ),
    path(
        "real_costs/trade/<int:trade_pk>/",
        RealCostTradeView.as_view(),
        name="real-costs-trade",
    ),
    path(
        "real_costs/trade/<int:trade_pk>/<int:year>/",
        RealCostTradeYearView.as_view(),
        name="real-costs-trade-year",
    ),
    path(
        "applications/import/",
        ApplicationImportView.as_view(),
        name="application-import",
    ),
    path("", include(router.urls)),
]
