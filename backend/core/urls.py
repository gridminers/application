from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PlannedCostView, RealCostView,
    StreetViewSet, DivisionViewSet, AssetViewSet, TradeViewSet,
)

router = DefaultRouter()
router.register(r"streets", StreetViewSet, basename="streets")
router.register(r"divisions", DivisionViewSet, basename="divisions")
router.register(r"assets", AssetViewSet, basename="assets")
router.register(r"trades", TradeViewSet, basename="trades")


# Hilfsfunktion zur Erzeugung der Kosten-Pfade
def cost_urls(prefix, view):
    return [
        # /api/<prefix>/                       -> Alle Jahre gesamt
        path(f"{prefix}/", view.as_view(), name=f"{prefix}-all"),
        # /api/<prefix>/year/<year>/           -> Spezielles Jahr gesamt
        path(f"{prefix}/year/<int:year>/", view.as_view(), name=f"{prefix}-year"),

        # Street
        path(f"{prefix}/street/<int:street_id>/", view.as_view(),
             name=f"{prefix}-street"),
        path(f"{prefix}/street/<int:street_id>/<int:year>/", view.as_view(),
             name=f"{prefix}-street-year"),

        # Division (Sparte)
        path(f"{prefix}/division/<int:division_id>/", view.as_view(),
             name=f"{prefix}-division"),
        path(f"{prefix}/division/<int:division_id>/<int:year>/", view.as_view(),
             name=f"{prefix}-division-year"),

        # Asset
        path(f"{prefix}/asset/<int:asset_id>/", view.as_view(),
             name=f"{prefix}-asset"),
        path(f"{prefix}/asset/<int:asset_id>/<int:year>/", view.as_view(),
             name=f"{prefix}-asset-year"),

        # Trade (Gewerk)
        path(f"{prefix}/trade/<int:trade_id>/", view.as_view(),
             name=f"{prefix}-trade"),
        path(f"{prefix}/trade/<int:trade_id>/<int:year>/", view.as_view(),
             name=f"{prefix}-trade-year"),
    ]


urlpatterns = [
    path("api/", include(router.urls)),
    *[path("api/", include((cost_urls("planned_costs", PlannedCostView), "planned")))],
    *[path("api/", include((cost_urls("real_costs", RealCostView), "real")))],
]
