import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import Client, TestCase
from django.urls import reverse

from accused.models import Accused, LocationCheck
from core.models import AuditLog, LoginAttempt
from places.models import FamousPlace


class APIAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = User.objects.create_user(username='api_officer', password='safe-password')
        self.csrf_token = self.client.get(reverse('api_csrf')).json()['csrfToken']

    def test_api_login_uses_csrf_and_existing_login_limit(self):
        failed = self.client.post(
            reverse('api_login'),
            data=json.dumps({'username': 'api_officer', 'password': 'wrong'}),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(failed.status_code, 401)
        self.assertEqual(LoginAttempt.objects.filter(successful=False).count(), 1)

        success = self.client.post(
            reverse('api_login'),
            data=json.dumps({'username': 'api_officer', 'password': 'safe-password'}),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(success.status_code, 200)
        self.assertEqual(success.json()['user']['username'], 'api_officer')

        current_user = self.client.get(reverse('api_current_user'))
        self.assertEqual(current_user.status_code, 200)
        self.assertEqual(current_user.json()['id'], self.user.pk)

        csrf_token = self.client.cookies['csrftoken'].value
        logout = self.client.post(reverse('api_logout'), HTTP_X_CSRFTOKEN=csrf_token)
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get(reverse('api_current_user')).status_code, 403)

    def test_protected_endpoints_reject_anonymous_users(self):
        for endpoint in (
            reverse('api_dashboard'),
            reverse('api_accused_collection'),
            reverse('api_accused_map'),
            reverse('api_accused_table'),
            reverse('api_place_collection'),
        ):
            with self.subTest(endpoint=endpoint):
                self.assertEqual(self.client.get(endpoint).status_code, 403)

    def test_api_login_enforces_five_failures_per_fifteen_minutes(self):
        for attempt in range(5):
            response = self.client.post(
                reverse('api_login'),
                data=json.dumps({'username': 'api_officer', 'password': 'wrong'}),
                content_type='application/json',
                HTTP_X_CSRFTOKEN=self.csrf_token,
            )
            self.assertEqual(response.status_code, 401, attempt)
        locked = self.client.post(
            reverse('api_login'),
            data=json.dumps({'username': 'api_officer', 'password': 'safe-password'}),
            content_type='application/json',
            HTTP_X_CSRFTOKEN=self.csrf_token,
        )
        self.assertEqual(locked.status_code, 429)


class APIRecordTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='api_records', password='safe-password')
        self.client.force_login(self.user)
        self.accused = Accused.objects.create(
            full_name='Mapped Person',
            mobile_number='9876543210',
            detailed_address='Flat 1, Test Road',
            village='Sahar Village',
            city='Mumbai',
            taluka='Andheri',
            district='Mumbai Suburban',
            state='Maharashtra',
            pincode='400099',
            latitude=19.0988,
            longitude=72.8711,
            location_status='manually_set',
            location_accuracy='exact',
        )

    def test_accused_map_table_and_server_side_filters(self):
        response = self.client.get(reverse('api_accused_table'), {
            'page': 1, 'page_size': 1, 'status': 'manually_set',
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['record_id'], self.accused.record_id)

        map_response = self.client.get(reverse('api_accused_map'))
        self.assertEqual(map_response.status_code, 200)
        self.assertEqual(map_response.json()['records'][0]['id'], self.accused.pk)

    def test_accused_location_actions_reuse_audit_and_location_history(self):
        location_response = self.client.post(
            reverse('api_set_accused_location', args=[self.accused.pk]),
            data=json.dumps({'latitude': 19.112456, 'longitude': 72.886321}),
            content_type='application/json',
        )
        self.assertEqual(location_response.status_code, 200)
        self.accused.refresh_from_db()
        self.assertEqual(self.accused.location_status, 'manually_set')
        self.assertEqual(self.accused.location_checks.order_by('-pk').first().action, 'manually_set')
        self.assertTrue(AuditLog.objects.filter(action='manual_set', object_id=self.accused.pk).exists())

        verify_response = self.client.post(
            reverse('api_verify_accused', args=[self.accused.pk]),
            data=json.dumps({'note': 'Confirmed'}),
            content_type='application/json',
        )
        self.assertEqual(verify_response.status_code, 200)
        self.accused.refresh_from_db()
        self.assertEqual(self.accused.location_status, 'verified')
        self.assertEqual(self.accused.location_checks.order_by('-pk').first().action, 'verified')
        self.assertEqual(LocationCheck.objects.filter(accused=self.accused).count(), 2)

    @patch('accused.views._geocode_accused')
    def test_create_accused_uses_existing_form_geocoding_and_audit(self, mock_geocode):
        from core.geocoding import GeocodeResult

        mock_geocode.return_value = GeocodeResult(
            success=True,
            latitude=19.0988,
            longitude=72.8711,
            accuracy='exact',
            query_used='Full address',
            display_name='Sahar, Mumbai',
            step_matched=1,
        )
        payload = {
            'full_name': 'New API Record',
            'mobile_number': '9876543210',
            'detailed_address': 'Flat 5, Test Road',
            'village': 'Sahar Village',
            'city': 'Mumbai',
            'taluka': 'Andheri',
            'district': 'Mumbai Suburban',
            'state': 'Maharashtra',
            'pincode': '400099',
        }
        response = self.client.post(
            reverse('api_accused_collection'),
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        created = Accused.objects.get(full_name='New API Record')
        self.assertEqual(response.json()['id'], created.pk)
        self.assertEqual(created.location_status, 'auto_geocoded')
        self.assertEqual(created.location_checks.count(), 1)
        self.assertTrue(AuditLog.objects.filter(model_name='Accused', object_id=created.pk).exists())

    def test_invalid_accused_form_returns_field_errors(self):
        response = self.client.post(
            reverse('api_accused_collection'),
            data=json.dumps({'full_name': 'Incomplete'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('mobile_number', response.json()['errors'])

    @patch('places.views.geocode_address', return_value=(18.5204, 73.8567))
    def test_famous_place_api_create_and_update(self, mock_geocode):
        payload = {
            'name': 'API Place',
            'description': 'A landmark',
            'city': 'Pune',
            'district': 'Pune',
            'address': 'Test Road, Pune',
        }
        response = self.client.post(
            reverse('api_place_collection'),
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200, response.content)
        place = FamousPlace.objects.get(name='API Place')
        self.assertEqual(response.json()['id'], place.pk)
        self.assertEqual(mock_geocode.call_count, 1)

        payload['name'] = 'Renamed Place'
        updated = self.client.patch(
            reverse('api_place_detail', args=[place.pk]),
            data=json.dumps(payload),
            content_type='application/json',
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        place.refresh_from_db()
        self.assertEqual(place.name, 'Renamed Place')
