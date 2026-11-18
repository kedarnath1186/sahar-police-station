from django.db import models
from django.core.validators import RegexValidator
from django.contrib.auth.models import User

from core.constants import (
    INDIAN_STATES_CHOICES,
    MAHARASHTRA_DISTRICTS_CHOICES,
    LOCATION_STATUS_CHOICES,
    LOCATION_ACCURACY_CHOICES,
)


class Accused(models.Model):
    """Model representing an accused person."""

    full_name = models.CharField(max_length=150)
    mobile_number = models.CharField(
        max_length=10,
        validators=[
            RegexValidator(r'^\d{10}$', 'Must be exactly 10 digits'),
        ],
    )
    detailed_address = models.TextField()
    village = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    taluka = models.CharField(max_length=100)
    district = models.CharField(
        max_length=100,
        choices=MAHARASHTRA_DISTRICTS_CHOICES,
    )
    state = models.CharField(
        max_length=100,
        choices=INDIAN_STATES_CHOICES,
        default='Maharashtra',
    )
    pincode = models.CharField(
        max_length=6,
        validators=[
            RegexValidator(r'^\d{6}$', 'Must be exactly 6 digits'),
        ],
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # Location verification and geocoding metadata
    location_status = models.CharField(
        max_length=30,
        choices=LOCATION_STATUS_CHOICES,
        default='not_geocoded',
        db_index=True,
    )
    location_accuracy = models.CharField(
        max_length=20,
        choices=LOCATION_ACCURACY_CHOICES,
        default='unknown',
    )
    geocoded_query = models.TextField(blank=True, default='')
    geocoded_display_name = models.TextField(blank=True, default='')
    geocoded_at = models.DateTimeField(null=True, blank=True)

    verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='verified_accused',
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Accused'
        verbose_name_plural = 'Accused'

    def __str__(self):
        return f"{self.record_id} - {self.full_name}"

    @property
    def record_id(self):
        """Auto-generated official record identifier (e.g. SPS-ACC-2026-0001)."""
        year = self.created_at.year if self.created_at else 2026
        pk = self.pk if self.pk else 0
        return f"SPS-ACC-{year}-{pk:04d}"

    @property
    def formatted_mobile(self):
        """Formats 10-digit mobile number as +91 XXXXX XXXXX."""
        if self.mobile_number and len(self.mobile_number) == 10:
            return f"+91 {self.mobile_number[:5]} {self.mobile_number[5:]}"
        return self.mobile_number or ""

    @property
    def is_verified(self):
        return self.location_status == 'verified'


class AccusedPhoto(models.Model):
    """Model representing a photo associated with an accused person."""

    accused = models.ForeignKey(
        Accused,
        on_delete=models.CASCADE,
        related_name='photos',
    )
    image = models.ImageField(upload_to='accused_photos/')
    location_address = models.CharField(max_length=500)
    latitude = models.FloatField()
    longitude = models.FloatField()
    caption = models.CharField(max_length=255, blank=True, default='')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Accused Photo'
        verbose_name_plural = 'Accused Photos'

    def __str__(self):
        return f"Photo of {self.accused.full_name}"


class LocationCheck(models.Model):
    """
    Audit and verification trail for accused geographical locations.
    Records who verified or set coordinates, when, and with what accuracy.
    """
    accused = models.ForeignKey(
        Accused,
        on_delete=models.CASCADE,
        related_name='location_checks',
    )
    officer = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='location_checks',
    )
    action = models.CharField(
        max_length=30,
        choices=[
            ('auto_geocoded', 'Auto Geocoded'),
            ('manually_set', 'Manually Set'),
            ('verified', 'Verified'),
            ('cleared', 'Cleared on Address Change'),
            ('re_geocoded', 'Re-Geocoded on Edit'),
        ],
    )
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_status = models.CharField(max_length=30, choices=LOCATION_STATUS_CHOICES)
    location_accuracy = models.CharField(max_length=20, choices=LOCATION_ACCURACY_CHOICES)
    note = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Location Check'
        verbose_name_plural = 'Location Checks'

    def __str__(self):
        return f"{self.action} on {self.accused.record_id} by {self.officer or 'System'} at {self.timestamp}"
