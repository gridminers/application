import django_filters
from .models import PlannedCost, RealCost


class PlannedCostFilter(django_filters.FilterSet):
    class Meta:
        model = PlannedCost
        fields = {
            "year": ["exact", "gte", "lte"],
            "street": ["exact"],
            "division": ["exact"],
            "asset": ["exact"],
            "trade": ["exact"],
        }


class RealCostFilter(django_filters.FilterSet):
    class Meta:
        model = RealCost
        fields = {
            "year": ["exact", "gte", "lte"],
            "street": ["exact"],
            "division": ["exact"],
            "asset": ["exact"],
            "trade": ["exact"],
        }
