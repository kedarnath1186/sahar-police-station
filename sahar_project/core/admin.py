from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'model_name', 'object_id', 'user', 'timestamp')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('model_name', 'description')
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'description', 'timestamp')
    ordering = ('-timestamp',)
