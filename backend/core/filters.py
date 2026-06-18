"""
Django REST Framework – FilterSet für Investitionsantrag.
"""

import django_filters

from .models import Application


class ApplicationFilter(django_filters.FilterSet):
    """Filterset für Application-Modell."""

    year = django_filters.NumberFilter(field_name="fiscal_year", lookup_expr="exact")
    division_id = django_filters.NumberFilter(field_name="division__id", lookup_expr="exact")
    asset_id = django_filters.NumberFilter(field_name="asset__id", lookup_expr="exact")
    trade_id = django_filters.NumberFilter(field_name="trade__pk", lookup_expr="exact")
    street_id = django_filters.NumberFilter(field_name="street__id", lookup_expr="exact")

    class Meta:
        model = Application
        fields = [
            "fiscal_year",
            "division",
            "asset",
            "trade",
            "street",
        ]
