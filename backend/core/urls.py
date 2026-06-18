"""
URL-Konfiguration für die Investitionsantrag-API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationImportView,
    ApplicationViewSet,
    AssetViewSet,
    DivisionViewSet,
    PlannedCostView,
    RealCostView,
    StreetViewSet,
    TradeViewSet,
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
        PlannedCostView.as_view(),
        name="planned-costs-list",
    ),
    path(
        "planned_costs/year/<int:year>/",
        PlannedCostView.as_view(),
        name="planned-costs-year",
    ),
    path(
        "planned_costs/street/<int:street_id>/",
        PlannedCostView.as_view(),
        name="planned-costs-street",
    ),
    path(
        "planned_costs/street/<int:street_id>/<int:year>/",
        PlannedCostView.as_view(),
        name="planned-costs-street-year",
    ),
    path(
        "planned_costs/division/<int:division_id>/",
        PlannedCostView.as_view(),
        name="planned-costs-division",
    ),
    path(
        "planned_costs/division/<int:division_id>/<int:year>/",
        PlannedCostView.as_view(),
        name="planned-costs-division-year",
    ),
    path(
        "planned_costs/asset/<int:asset_id>/",
        PlannedCostView.as_view(),
        name="planned-costs-asset",
    ),
    path(
        "planned_costs/asset/<int:asset_id>/<int:year>/",
        PlannedCostView.as_view(),
        name="planned-costs-asset-year",
    ),
    path(
        "planned_costs/trade/<int:trade_pk>/",
        PlannedCostView.as_view(),
        name="planned-costs-trade",
    ),
    path(
        "planned_costs/trade/<int:trade_pk>/<int:year>/",
        PlannedCostView.as_view(),
        name="planned-costs-trade-year",
    ),

    # ── Real Costs ───────────────────────────────────────────────────────────
    path(
        "real_costs/",
        RealCostView.as_view(),
        name="real-costs-list",
    ),
    path(
        "real_costs/year/<int:year>/",
        RealCostView.as_view(),
        name="real-costs-year",
    ),
    path(
        "real_costs/street/<int:street_id>/",
        RealCostView.as_view(),
        name="real-costs-street",
    ),
    path(
        "real_costs/street/<int:street_id>/<int:year>/",
        RealCostView.as_view(),
        name="real-costs-street-year",
    ),
    path(
        "real_costs/division/<int:division_id>/",
        RealCostView.as_view(),
        name="real-costs-division",
    ),
    path(
        "real_costs/division/<int:division_id>/<int:year>/",
        RealCostView.as_view(),
        name="real-costs-division-year",
    ),
    path(
        "real_costs/asset/<int:asset_id>/",
        RealCostView.as_view(),
        name="real-costs-asset",
    ),
    path(
        "real_costs/asset/<int:asset_id>/<int:year>/",
        RealCostView.as_view(),
        name="real-costs-asset-year",
    ),
    path(
        "real_costs/trade/<int:trade_pk>/",
        RealCostView.as_view(),
        name="real-costs-trade",
    ),
    path(
        "real_costs/trade/<int:trade_pk>/<int:year>/",
        RealCostView.as_view(),
        name="real-costs-trade-year",
    ),
    path(
        "applications/import/",
        ApplicationImportView.as_view(),
        name="application-import",
    ),
    path("", include(router.urls)),
]
