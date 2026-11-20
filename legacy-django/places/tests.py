"""
Tests for the places app with mocked geocoding.
"""

from unittest.mock import patch
from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.urls import reverse

from places.models import FamousPlace


def create_test_place(**kwargs):
    """Create a test FamousPlace instance with default values."""
    defaults = {
        'name': 'Test Place',
        'description': 'A test famous place.',
        'city': 'Mumbai',
        'district': 'Mumbai City',
        'address': '123, Test Road, Mumbai',
        'latitude': 18.9220,
        'longitude': 72.8347,
    }
    defaults.update(kwargs)
    return FamousPlace.objects.create(**defaults)


class FamousPlaceModelTests(TestCase):
    """Tests for the FamousPlace model."""

    def test_create_place(self):
        """Test creating a valid famous place."""
        place = create_test_place()
        self.assertEqual(place.name, 'Test Place')
        self.assertEqual(str(place), 'Test Place')

    def test_ordering(self):
        """Test that places are ordered by name."""
        p2 = create_test_place(name='Zebra Place')
        p1 = create_test_place(name='Alpha Place')
        places = list(FamousPlace.objects.all())
        self.assertEqual(places[0], p1)
        self.assertEqual(places[1], p2)


class PlacesViewTests(TestCase):
    """Tests for places views."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', password='testpass123'
        )
        self.client = Client()

    def test_places_list_requires_login(self):
        """Test that places list requires authentication."""
        response = self.client.get(reverse('places_list'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_places_list_authenticated(self):
        """Test that authenticated users can view places list."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('places_list'))
        self.assertEqual(response.status_code, 200)

    def test_place_add_requires_login(self):
        """Test that adding a place requires authentication."""
        response = self.client.get(reverse('place_add'))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_place_add_authenticated(self):
        """Test that authenticated users can access the add form."""
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(reverse('place_add'))
        self.assertEqual(response.status_code, 200)

    def test_place_edit_requires_login(self):
        """Test that editing a place requires authentication."""
        place = create_test_place()
        response = self.client.get(reverse('place_edit', args=[place.pk]))
        self.assertEqual(response.status_code, 302)
        self.assertIn('/login/', response.url)

    def test_place_delete_requires_post(self):
        """Test that deleting a place requires POST method."""
        self.client.login(username='testuser', password='testpass123')
        place = create_test_place()
        response = self.client.get(reverse('place_delete', args=[place.pk]))
        self.assertEqual(response.status_code, 405)  # Method Not Allowed

    @patch('places.views.geocode_address')
    def test_place_create_and_delete(self, mock_geocode):
        """Test creating and deleting a place with 'DELETE' typing confirmation."""
        mock_geocode.return_value = (18.5204, 73.8567)
        self.client.login(username='testuser', password='testpass123')
        response = self.client.post(reverse('place_add'), {
            'name': 'New Test Place',
            'description': 'Description here.',
            'city': 'Pune',
            'district': 'Pune',
            'address': '456, Test Lane, Pune',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(FamousPlace.objects.count(), 1)

        place = FamousPlace.objects.first()
        # Aborted delete without confirmation
        self.client.post(reverse('place_delete', args=[place.pk]), {'confirm_delete': 'NO'})
        self.assertEqual(FamousPlace.objects.count(), 1)

        # Confirmed delete with 'DELETE'
        response = self.client.post(reverse('place_delete', args=[place.pk]), {'confirm_delete': 'DELETE'})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(FamousPlace.objects.count(), 0)
