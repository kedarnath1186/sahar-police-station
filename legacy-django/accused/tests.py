"""
Comprehensive unit tests for the accused app and geocoding verification architecture.
All Nominatim calls are mocked to ensure offline reliability and rapid execution.
"""

import io
import os
import tempfile
from unittest.mock import patch, MagicMock

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, Client, override_settings
from django.urls import reverse
from django.utils import timezone

from PIL import Image

from accused.forms import AccusedForm
from accused.models import Accused, AccusedPhoto, LocationCheck
from core.models import AuditLog, GeocodeCache, LoginAttempt
from core.geocoding import (
    geocode_accused_address,
    is_in_maharashtra,
    is_in_india,
    normalize_query,
    GeocodeResult,
)

TEST_MEDIA_ROOT = tempfile.mkdtemp()


def create_test_image(format='JPEG', extension='jpg', size=(100, 100), color='red'):
    """Create a verified test image file."""
    img = Image.new('RGB', size, color=color)
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    buffer.seek(0)
    return SimpleUploadedFile(
        name=f'test_image.{extension}',
        content=buffer.read(),
        content_type=f'image/{format.lower()}',
    )


def create_test_accused(**kwargs):
    """Create a test Accused instance with sensible defaults."""
    defaults = {
        'full_name': 'Test Accused Person',
        'mobile_number': '9876543210',
        'detailed_address': 'Flat 101, Test Residency',
        'village': 'Sahar Village',
        'city': 'Mumbai',
        'taluka': 'Andheri',
        'district': 'Mumbai Suburban',
        'state': 'Maharashtra',
        'pincode': '400099',
        'latitude': 19.0988,
        'longitude': 72.8711,
        'location_status': 'verified',
        'location_accuracy': 'exact',
    }
    defaults.update(kwargs)
    return Accused.objects.create(**defaults)


class AccusedModelTests(TestCase):
    """Tests for the Accused model validation and properties."""

    def test_create_accused_and_properties(self):
        accused = create_test_accused()
        self.assertEqual(accused.full_name, 'Test Accused Person')
        self.assertIn('SPS-ACC-', accused.record_id)
        self.assertEqual(accused.formatted_mobile, '+91 98765 43210')
        self.assertTrue(accused.is_verified)

    def test_mobile_number_must_be_10_digits(self):
        accused = Accused(
            full_name='Invalid Mobile',
            mobile_number='12345',  # Only 5 digits
            detailed_address='Address',
            village='Village',
            city='City',
            taluka='Taluka',
            district='Mumbai City',
            state='Maharashtra',
            pincode='400001',
        )
        with self.assertRaises(ValidationError):
            accused.full_clean()

    def test_pincode_must_be_6_digits(self):
        accused = Accused(
            full_name='Invalid Pincode',
            mobile_number='9876543210',
            detailed_address='Address',
            village='Village',
            city='City',
            taluka='Taluka',
            district='Mumbai City',
            state='Maharashtra',
            pincode='400',  # Only 3 digits
        )
        with self.assertRaises(ValidationError):
            accused.full_clean()


class GeocodingServiceUnitTests(TestCase):
    """Tests for core/geocoding.py logic, fallback hierarchy, bounding box, and caching."""

    def test_bounding_box_checks(self):
        # Mumbai is in Maharashtra and India
        self.assertTrue(is_in_maharashtra(19.0760, 72.8777))
        self.assertTrue(is_in_india(19.0760, 72.8777))

        # Delhi is in India, but NOT in Maharashtra
        self.assertFalse(is_in_maharashtra(28.6139, 77.2090))
        self.assertTrue(is_in_india(28.6139, 77.2090))

        # London is outside India
        self.assertFalse(is_in_india(51.5074, -0.1278))
        self.assertFalse(is_in_maharashtra(51.5074, -0.1278))

    @patch('core.geocoding._call_nominatim_single')
    def test_fallback_order_step1_exact(self, mock_nominatim):
        # Mock step 1 match
        mock_nominatim.return_value = {
            'lat': '19.0988',
            'lon': '72.8711',
            'display_name': 'Sahar Village, Andheri, Mumbai, India',
            'type': 'residential',
            'class': 'building',
        }

        res = geocode_accused_address(
            detailed_address='Flat 101, Sai Apts',
            village='Sahar Village',
            taluka='Andheri',
            district='Mumbai Suburban',
            state='Maharashtra',
            pincode='400099',
        )

        self.assertTrue(res.success)
        self.assertEqual(res.accuracy, 'exact')
        self.assertEqual(res.step_matched, 1)
        self.assertAlmostEqual(res.latitude, 19.0988, places=4)

    @patch('core.geocoding._call_nominatim_single')
    def test_fallback_order_step2_village(self, mock_nominatim):
        # Step 1 fails, step 2 (village level) succeeds
        def side_effect(query):
            if 'Flat 101' in query:
                return None  # Step 1 fails
            if 'Wakad' in query:
                return {
                    'lat': '18.5986',
                    'lon': '73.7684',
                    'display_name': 'Wakad, Pune, Maharashtra, India',
                    'type': 'administrative',
                    'class': 'boundary',
                }
            return None

        mock_nominatim.side_effect = side_effect

        res = geocode_accused_address(
            detailed_address='Flat 101, Obscure Street',
            village='Wakad',
            taluka='Mulshi',
            district='Pune',
            state='Maharashtra',
            pincode='411057',
        )

        self.assertTrue(res.success)
        self.assertEqual(res.accuracy, 'village')
        self.assertEqual(res.step_matched, 2)

    @patch('core.geocoding._call_nominatim_single')
    def test_geocode_cache_persists_and_prevents_duplicate_calls(self, mock_nominatim):
        mock_nominatim.return_value = {
            'lat': '19.1865',
            'lon': '72.9754',
            'display_name': 'Naupada, Thane, Maharashtra, India',
            'type': 'building',
            'class': 'building',
        }

        query = 'Naupada, Thane, Maharashtra, India'
        from core.geocoding import query_nominatim_with_cache

        # First call hits mock
        res1 = query_nominatim_with_cache(query, default_accuracy='exact')
        self.assertTrue(res1.success)
        self.assertEqual(mock_nominatim.call_count, 1)

        # Check entry in DB cache
        cache_entry = GeocodeCache.objects.filter(normalized_query=normalize_query(query)).first()
        self.assertIsNotNone(cache_entry)
        self.assertTrue(cache_entry.success)

        # Second call with same normalized query MUST hit cache, NOT mock
        res2 = query_nominatim_with_cache('  NAUPADA,   Thane, Maharashtra, INDIA  ', default_accuracy='exact')
        self.assertTrue(res2.success)
        self.assertEqual(mock_nominatim.call_count, 1)  # Call count remains 1!


class AccusedFailureRulesTests(TestCase):
    """Tests for Part 2 failure rules in Accused views."""

    def setUp(self):
        self.client = Client()
        self.officer = User.objects.create_user(
            username='officer_test',
            password='testpassword123',
            first_name='Anand',
            last_name='Patil',
        )
        self.client.login(username='officer_test', password='testpassword123')

    @patch('accused.views._geocode_accused')
    def test_add_accused_failure_rule(self, mock_geocode):
        # All 4 tiers fail
        mock_geocode.return_value = GeocodeResult(success=False, query_used='Unknown Forest')

        data = {
            'full_name': 'Untraceable Person',
            'mobile_number': '9890123456',
            'detailed_address': 'Deep Jungle Cabin',
            'village': 'Remote Forest',
            'city': 'Gadchiroli',
            'taluka': 'Bhamragad',
            'district': 'Gadchiroli',
            'state': 'Maharashtra',
            'pincode': '442710',
        }

        form = AccusedForm(data)
        self.assertTrue(form.is_valid(), form.errors)

        response = self.client.post(reverse('accused_add'), data, follow=True)
        self.assertEqual(response.status_code, 200)

        accused = Accused.objects.get(full_name='Untraceable Person')
        self.assertIsNone(accused.latitude)
        self.assertIsNone(accused.longitude)
        self.assertEqual(accused.location_status, 'not_geocoded')
        self.assertEqual(accused.location_accuracy, 'unknown')

        # Check warning flash message
        messages_list = list(response.context['messages'])
        self.assertTrue(any('Location not found. Set it manually on the map.' in str(m) for m in messages_list))

    @patch('accused.views._geocode_accused')
    def test_edit_accused_address_change_failure_clears_coordinates(self, mock_geocode):
        # Existing verified accused
        accused = create_test_accused(
            full_name='Moving Accused',
            latitude=19.0988,
            longitude=72.8711,
            location_status='verified',
            verified_by=self.officer,
            verified_at=timezone.now(),
        )

        # Address changes and re-geocode fails
        mock_geocode.return_value = GeocodeResult(success=False, query_used='Invalid New Address')

        data = {
            'full_name': 'Moving Accused',
            'mobile_number': accused.mobile_number,
            'detailed_address': 'Unmapped New Hideout',  # CHANGED
            'village': accused.village,
            'city': accused.city,
            'taluka': accused.taluka,
            'district': accused.district,
            'state': accused.state,
            'pincode': accused.pincode,
        }

        form = AccusedForm(data, instance=accused)
        self.assertTrue(form.is_valid(), form.errors)

        response = self.client.post(reverse('accused_edit', kwargs={'pk': accused.pk}), data, follow=True)
        self.assertEqual(response.status_code, 200)

        accused.refresh_from_db()
        # Coordinates must be CLEARED
        self.assertIsNone(accused.latitude)
        self.assertIsNone(accused.longitude)
        self.assertEqual(accused.location_status, 'not_geocoded')
        self.assertIsNone(accused.verified_by)
        self.assertIsNone(accused.verified_at)

        # Audit LocationCheck must record 'cleared'
        last_check = accused.location_checks.first()
        self.assertEqual(last_check.action, 'cleared')

        # Verify warning message
        messages_list = list(response.context['messages'])
        self.assertTrue(any('Location could not be found; the map marker has been removed' in str(m) for m in messages_list))

    @patch('accused.views._geocode_accused')
    def test_edit_accused_address_not_changed_retains_coordinates(self, mock_geocode):
        accused = create_test_accused(
            full_name='Stable Accused',
            latitude=19.0988,
            longitude=72.8711,
            location_status='verified',
        )

        # Edit only personal name, address untouched
        data = {
            'full_name': 'Stable Accused Renamed',
            'mobile_number': accused.mobile_number,
            'detailed_address': accused.detailed_address,
            'village': accused.village,
            'city': accused.city,
            'taluka': accused.taluka,
            'district': accused.district,
            'state': accused.state,
            'pincode': accused.pincode,
        }

        form = AccusedForm(data, instance=accused)
        self.assertTrue(form.is_valid(), form.errors)

        response = self.client.post(reverse('accused_edit', kwargs={'pk': accused.pk}), data, follow=True)
        self.assertEqual(response.status_code, 200)

        accused.refresh_from_db()
        self.assertEqual(accused.full_name, 'Stable Accused Renamed')
        self.assertEqual(accused.latitude, 19.0988)
        self.assertEqual(accused.longitude, 72.8711)
        self.assertEqual(accused.location_status, 'verified')
        mock_geocode.assert_not_called()

    def test_manual_location_setting(self):
        accused = create_test_accused(location_status='not_geocoded', latitude=None, longitude=None)

        post_data = {
            'latitude': '19.112456',
            'longitude': '72.886321',
            'note': 'Pinned by field officer',
        }
        response = self.client.post(
            reverse('accused_set_location', kwargs={'pk': accused.pk}),
            post_data,
            follow=True
        )
        self.assertEqual(response.status_code, 200)

        accused.refresh_from_db()
        self.assertEqual(accused.location_status, 'manually_set')
        self.assertAlmostEqual(accused.latitude, 19.112456, places=6)
        self.assertAlmostEqual(accused.longitude, 72.886321, places=6)

        last_check = accused.location_checks.first()
        self.assertEqual(last_check.action, 'manually_set')
        self.assertEqual(last_check.officer, self.officer)

    def test_mark_as_verified_separate_action(self):
        accused = create_test_accused(
            location_status='manually_set',
            latitude=19.0988,
            longitude=72.8711,
            verified_by=None,
        )

        response = self.client.post(
            reverse('accused_verify_location', kwargs={'pk': accused.pk}),
            {'note': 'Officer certified against Aadhaar'},
            follow=True
        )
        self.assertEqual(response.status_code, 200)

        accused.refresh_from_db()
        self.assertEqual(accused.location_status, 'verified')
        self.assertEqual(accused.verified_by, self.officer)
        self.assertIsNotNone(accused.verified_at)

        last_check = accused.location_checks.first()
        self.assertEqual(last_check.action, 'verified')

    def test_delete_confirmation_requires_typing_delete(self):
        accused = create_test_accused()

        # Attempt deletion with wrong text -> should reject
        resp_fail = self.client.post(
            reverse('accused_delete', kwargs={'pk': accused.pk}),
            {'confirm_delete': 'NO'},
            follow=True
        )
        self.assertTrue(Accused.objects.filter(pk=accused.pk).exists())
        self.assertTrue(any('Deletion aborted' in str(m) for m in resp_fail.context['messages']))

        # Attempt deletion with exact 'DELETE' -> should delete
        resp_success = self.client.post(
            reverse('accused_delete', kwargs={'pk': accused.pk}),
            {'confirm_delete': 'DELETE'},
            follow=True
        )
        self.assertFalse(Accused.objects.filter(pk=accused.pk).exists())


@override_settings(MEDIA_ROOT=TEST_MEDIA_ROOT)
class PhotoUploadSecurityTests(TestCase):
    """Tests for photo uploads and Pillow validation."""

    def setUp(self):
        self.client = Client()
        self.officer = User.objects.create_user(
            username='officer_img',
            password='testpassword123',
        )
        self.client.login(username='officer_img', password='testpassword123')
        self.accused = create_test_accused()

    def test_upload_valid_photo(self):
        valid_img = create_test_image(format='JPEG', extension='jpg')
        data = {
            'image': valid_img,
            'location_address': 'Sahar Cargo Gate 1',
            'latitude': 19.0988,
            'longitude': 72.8711,
            'caption': 'Valid spot check photo',
        }
        resp = self.client.post(
            reverse('photo_add', kwargs={'accused_id': self.accused.pk}),
            data,
            follow=True
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(self.accused.photos.count(), 1)

    def test_upload_rejects_non_image_content(self):
        # Fake jpg containing text bytes
        fake_img = SimpleUploadedFile(
            name='fake.jpg',
            content=b'Not an image byte content. Corrupt payload.',
            content_type='image/jpeg'
        )
        data = {
            'image': fake_img,
            'location_address': 'Sahar Gate',
            'latitude': 19.0988,
            'longitude': 72.8711,
        }
        resp = self.client.post(
            reverse('photo_add', kwargs={'accused_id': self.accused.pk}),
            data
        )
        self.assertEqual(self.accused.photos.count(), 0)
        self.assertFormError(resp.context['form'], 'image', 'Upload a valid image. The file you uploaded was either not an image or a corrupted image.')
