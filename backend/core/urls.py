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
    TradeViewSet,
)

router = DefaultRouter()
router.register(r"streets", StreetViewSet, basename="street")
router.register(r"divisions", DivisionViewSet, basename="division")
router.register(r"assets", AssetViewSet, basename="asset")
router.register(r"trades", TradeViewSet, basename="trade")
router.register(r"applications", ApplicationViewSet, basename="application")

urlpatterns = [
    # Router-URLs
    path("api/", include(router.urls)),

    # ── Planned Costs ────────────────────────────────────────────────────────
    path(
        "api/planned_costs/",
        PlannedCostListView.as_view(),
        name="planned-costs-list",
    ),
    path(
        "api/planned_costs/year/<int:year>/",
        PlannedCostYearView.as_view(),
        name="planned-costs-year",
    ),
    path(
        "api/planned_costs/street/<int:street_id>/",
        PlannedCostStreetView.as_view(),
        name="planned-costs-street",
    ),
    path(
        "api/planned_costs/street/<int:street_id>/<int:year>/",
        PlannedCostStreetYearView.as_view(),
        name="planned-costs-street-year",
    ),
    path(
        "api/planned_costs/division/<int:division_id>/",
        PlannedCostDivisionView.as_view(),
        name="planned-costs-division",
    ),
    path(
        "api/planned_costs/division/<int:division_id>/<int:year>/",
        PlannedCostDivisionYearView.as_view(),
        name="planned-costs-division-year",
    ),
    path(
        "api/planned_costs/asset/<int:asset_id>/",
        PlannedCostAssetView.as_view(),
        name="planned-costs-asset",
    ),
    path(
        "api/planned_costs/asset/<int:asset_id>/<int:year>/",
        PlannedCostAssetYearView.as_view(),
        name="planned-costs-asset-year",
    ),
    path(
        "api/planned_costs/trade/<int:trade_pk>/",
        PlannedCostTradeView.as_view(),
        name="planned-costs-trade",
    ),
    path(
        "api/planned_costs/trade/<int:trade_pk>/<int:year>/",
        PlannedCostTradeYearView.as_view(),
        name="planned-costs-trade-year",
    ),

    # ── Real Costs ───────────────────────────────────────────────────────────
    path(
        "api/real_costs/",
        RealCostListView.as_view(),
        name="real-costs-list",
    ),
    path(
        "api/real_costs/year/<int:year>/",
        RealCostYearView.as_view(),
        name="real-costs-year",
    ),
    path(
        "api/real_costs/street/<int:street_id>/",
        RealCostStreetView.as_view(),
        name="real-costs-street",
    ),
    path(
        "api/real_costs/street/<int:street_id>/<int:year>/",
        RealCostStreetYearView.as_view(),
        name="real-costs-street-year",
    ),
    path(
        "api/real_costs/division/<int:division_id>/",
        RealCostDivisionView.as_view(),
        name="real-costs-division",
    ),
    path(
        "api/real_costs/division/<int:division_id>/<int:year>/",
        RealCostDivisionYearView.as_view(),
        name="real-costs-division-year",
    ),
    path(
        "api/real_costs/asset/<int:asset_id>/",
        RealCostAssetView.as_view(),
        name="real-costs-asset",
    ),
    path(
        "api/real_costs/asset/<int:asset_id>/<int:year>/",
        RealCostAssetYearView.as_view(),
        name="real-costs-asset-year",
    ),
    path(
        "api/real_costs/trade/<int:trade_pk>/",
        RealCostTradeView.as_view(),
        name="real-costs-trade",
    ),
    path(
        "api/real_costs/trade/<int:trade_pk>/<int:year>/",
        RealCostTradeYearView.as_view(),
        name="real-costs-trade-year",
    ),
]
