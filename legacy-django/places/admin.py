from django.contrib import admin
from .models import FamousPlace


@admin.register(FamousPlace)
class FamousPlaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'district', 'latitude', 'longitude')
    list_filter = ('district',)
    search_fields = ('name', 'city', 'address')
    ordering = ('name',)
