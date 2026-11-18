from django.contrib import admin
from .models import Accused, AccusedPhoto


class AccusedPhotoInline(admin.TabularInline):
    model = AccusedPhoto
    extra = 0
    readonly_fields = ('uploaded_at',)


@admin.register(Accused)
class AccusedAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'mobile_number', 'city', 'district', 'state', 'created_at')
    list_filter = ('district', 'state', 'created_at')
    search_fields = ('full_name', 'mobile_number', 'city', 'village')
    inlines = [AccusedPhotoInline]
    ordering = ('-created_at',)


@admin.register(AccusedPhoto)
class AccusedPhotoAdmin(admin.ModelAdmin):
    list_display = ('accused', 'location_address', 'caption', 'uploaded_at')
    list_filter = ('uploaded_at',)
    search_fields = ('accused__full_name', 'location_address', 'caption')
    ordering = ('-uploaded_at',)
