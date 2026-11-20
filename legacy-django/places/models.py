from django.db import models

from core.constants import MAHARASHTRA_DISTRICTS_CHOICES


class FamousPlace(models.Model):
    """Model representing a famous place or landmark."""

    name = models.CharField(max_length=200)
    description = models.TextField()
    city = models.CharField(max_length=100)
    district = models.CharField(
        max_length=100,
        choices=MAHARASHTRA_DISTRICTS_CHOICES,
    )
    address = models.CharField(max_length=500)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo = models.ImageField(upload_to='famous_places/', null=True, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Famous Place'
        verbose_name_plural = 'Famous Places'

    def __str__(self):
        return self.name
