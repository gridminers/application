from django.apps import AppConfig
from django.contrib import admin

from core.models import Application, Street, Division, Asset, Trade

admin.site.register(Application)
admin.site.register(Street)
admin.site.register(Division)
admin.site.register(Asset)
admin.site.register(Trade)
