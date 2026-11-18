from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class AuditLog(models.Model):
    """Tracks all create, update, and delete actions across the application."""

    ACTION_CHOICES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('verify', 'Verify Location'),
        ('manual_set', 'Manual Location Set'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField()
    description = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'

    def __str__(self):
        return f"{self.action} {self.model_name} #{self.object_id}"


class GeocodeCache(models.Model):
    """
    Persistent cache for Nominatim geocoding requests.
    Caches both successful and failed queries for 30 days.
    """
    normalized_query = models.CharField(max_length=500, unique=True, db_index=True)
    success = models.BooleanField(default=False)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    accuracy = models.CharField(max_length=20, default='unknown')
    display_name = models.TextField(blank=True, default='')
    raw_json = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Geocode Cache'
        verbose_name_plural = 'Geocode Cache Entries'

    def __str__(self):
        status = "HIT" if self.success else "MISS"
        return f"[{status}] {self.normalized_query[:40]} -> ({self.latitude}, {self.longitude})"

    def is_expired(self, days=30):
        return timezone.now() > self.created_at + timedelta(days=days)


class LoginAttempt(models.Model):
    """
    Tracks failed login attempts to enforce a maximum of 5 failures per 15 minutes.
    """
    username = models.CharField(max_length=150, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    successful = models.BooleanField(default=False)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Login Attempt'
        verbose_name_plural = 'Login Attempts'

    def __str__(self):
        return f"{self.username} at {self.timestamp} ({'OK' if self.successful else 'FAILED'})"


def log_action(user, action, model_name, object_id, description=''):
    """
    Helper function to create an audit log entry.
    """
    return AuditLog.objects.create(
        user=user,
        action=action,
        model_name=model_name,
        object_id=object_id,
        description=description,
    )
