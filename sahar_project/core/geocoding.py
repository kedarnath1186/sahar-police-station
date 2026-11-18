"""
Geocoding service using OpenStreetMap's Nominatim API.
Implements multi-tiered fallback querying, Maharashtra bounding-box filtering,
India geofence validation, rate limiting, and 30-day persistent caching.
"""

import logging
import time
from dataclasses import dataclass
from typing import Optional

import requests
from django.conf import settings
from django.utils import timezone

from core.constants import MAHARASHTRA_BBOX, INDIA_BBOX

logger = logging.getLogger(__name__)

NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

# Global in-memory rate limiting tracker (at least 1 second between external HTTP calls)
_last_request_time = 0.0


@dataclass
class GeocodeResult:
    success: bool
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy: str = 'unknown'  # 'exact', 'village', 'taluka', 'district', 'state', 'unknown'
    display_name: str = ''
    query_used: str = ''
    step_matched: int = 0
    raw_response: Optional[dict] = None


def get_user_agent() -> str:
    """Returns a descriptive User-Agent string adhering to Nominatim usage policy."""
    contact_email = getattr(settings, 'NOMINATIM_CONTACT_EMAIL', 'sahar.police.station@mahapolice.gov.in')
    return f"SaharPoliceStation/2.0 (Maharashtra Police Prototype; contact: {contact_email})"


def normalize_query(query: str) -> str:
    """Normalizes query text for cache keying and comparison."""
    return " ".join(query.strip().lower().split())


def is_in_maharashtra(lat: float, lon: float) -> bool:
    """Verifies whether coordinates reside inside Maharashtra's geographic bounding box."""
    return (
        MAHARASHTRA_BBOX['min_lat'] <= lat <= MAHARASHTRA_BBOX['max_lat'] and
        MAHARASHTRA_BBOX['min_lon'] <= lon <= MAHARASHTRA_BBOX['max_lon']
    )


def is_in_india(lat: float, lon: float) -> bool:
    """Verifies whether coordinates reside inside India's geographic bounding box."""
    return (
        INDIA_BBOX['min_lat'] <= lat <= INDIA_BBOX['max_lat'] and
        INDIA_BBOX['min_lon'] <= lon <= INDIA_BBOX['max_lon']
    )


def _call_nominatim_single(query: str) -> Optional[dict]:
    """
    Executes a single throttled HTTP GET request to Nominatim for a query string.
    Returns the first matching item that falls inside Maharashtra, or None.
    """
    global _last_request_time

    # Throttle: enforce minimum 1.0 second between consecutive calls
    elapsed = time.time() - _last_request_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    headers = {'User-Agent': get_user_agent()}
    params = {
        'q': query,
        'format': 'json',
        'countrycodes': 'in',
        'addressdetails': '1',
        'limit': 5,
    }

    try:
        logger.info('Calling Nominatim for query: %s', query)
        response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
        _last_request_time = time.time()

        response.raise_for_status()
        items = response.json()

        if not items or not isinstance(items, list):
            logger.info('Nominatim returned empty results for: %s', query)
            return None

        # Filter items preferring those inside Maharashtra
        for item in items:
            try:
                lat = float(item.get('lat', 0))
                lon = float(item.get('lon', 0))
                if is_in_maharashtra(lat, lon):
                    return item
            except (ValueError, TypeError):
                continue

        logger.warning('Results found for "%s" but none within Maharashtra bounds.', query)
        return None

    except requests.RequestException as e:
        logger.error('Nominatim network error for query "%s": %s', query, e)
        _last_request_time = time.time()
        return None
    except Exception as e:
        logger.error('Unexpected error during Nominatim call: %s', e)
        _last_request_time = time.time()
        return None


def query_nominatim_with_cache(query: str, default_accuracy: str) -> GeocodeResult:
    """
    Checks the persistent GeocodeCache before calling Nominatim.
    Caches successful matches and negative misses for 30 days.
    """
    from core.models import GeocodeCache
    import json

    norm_query = normalize_query(query)
    if not norm_query:
        return GeocodeResult(success=False, query_used=query)

    # 1. Check cache
    cached = GeocodeCache.objects.filter(normalized_query=norm_query).first()
    if cached and not cached.is_expired(days=30):
        if cached.success:
            return GeocodeResult(
                success=True,
                latitude=cached.latitude,
                longitude=cached.longitude,
                accuracy=cached.accuracy,
                display_name=cached.display_name,
                query_used=query,
            )
        else:
            # Cached negative miss
            return GeocodeResult(success=False, query_used=query)

    # 2. Call external API
    item = _call_nominatim_single(query)

    if item:
        lat = float(item['lat'])
        lon = float(item['lon'])
        display_name = item.get('display_name', '')
        place_type = item.get('type', '')
        place_class = item.get('class', '')

        # Accuracy refinement for detailed step
        accuracy = default_accuracy
        if default_accuracy == 'exact':
            # Check if Nominatim returned a building, house, amenity, highway/road
            exact_types = {
                'building', 'house', 'residential', 'road', 'highway',
                'amenity', 'commercial', 'apartments', 'police', 'shop'
            }
            if place_type in exact_types or place_class in {'building', 'highway', 'amenity'}:
                accuracy = 'exact'
            else:
                accuracy = 'village'

        # Validate bounding box for India
        if not is_in_india(lat, lon):
            logger.error('Coordinates (%f, %f) outside India bounding box for: %s', lat, lon, query)
            GeocodeCache.objects.update_or_create(
                normalized_query=norm_query,
                defaults={'success': False, 'created_at': timezone.now()}
            )
            return GeocodeResult(success=False, query_used=query)

        # Cache successful match
        GeocodeCache.objects.update_or_create(
            normalized_query=norm_query,
            defaults={
                'success': True,
                'latitude': lat,
                'longitude': lon,
                'accuracy': accuracy,
                'display_name': display_name,
                'raw_json': json.dumps(item),
                'created_at': timezone.now(),
            }
        )

        return GeocodeResult(
            success=True,
            latitude=lat,
            longitude=lon,
            accuracy=accuracy,
            display_name=display_name,
            query_used=query,
            raw_response=item,
        )
    else:
        # Cache failed lookup
        GeocodeCache.objects.update_or_create(
            normalized_query=norm_query,
            defaults={
                'success': False,
                'latitude': None,
                'longitude': None,
                'accuracy': 'unknown',
                'display_name': '',
                'created_at': timezone.now(),
            }
        )
        return GeocodeResult(success=False, query_used=query)


def geocode_accused_address(
    detailed_address: str,
    village: str,
    taluka: str,
    district: str,
    state: str = 'Maharashtra',
    pincode: str = '',
) -> GeocodeResult:
    """
    Executes the 4-tier fallback geocoding hierarchy for an accused address:
      Step 1: Detailed address, village, taluka, district, state, pincode, India (accuracy: exact or village)
      Step 2: Village, taluka, district, state, India (accuracy: village)
      Step 3: Taluka, district, state, India (accuracy: taluka)
      Step 4: District, state, India (accuracy: district)

    Stops at the first successful match. If all fail, returns a failed GeocodeResult.
    """
    steps = [
        # Step 1: Detailed full address
        (
            [detailed_address, village, taluka, district, state, pincode, 'India'],
            'exact',
            1
        ),
        # Step 2: Village level
        (
            [village, taluka, district, state, 'India'],
            'village',
            2
        ),
        # Step 3: Taluka level
        (
            [taluka, district, state, 'India'],
            'taluka',
            3
        ),
        # Step 4: District level
        (
            [district, state, 'India'],
            'district',
            4
        ),
    ]

    for parts, default_acc, step_num in steps:
        query_parts = [p.strip() for p in parts if p and p.strip()]
        if not query_parts or len(query_parts) <= 2:  # e.g. only 'Maharashtra, India'
            continue

        query = ", ".join(query_parts)
        result = query_nominatim_with_cache(query, default_accuracy=default_acc)
        if result.success:
            result.step_matched = step_num
            logger.info('Geocoded successfully at step %d (%s): (%f, %f)',
                        step_num, result.accuracy, result.latitude, result.longitude)
            return result

    logger.warning('All 4 geocoding fallback steps failed for address: %s, %s, %s, %s',
                   detailed_address, village, taluka, district)
    return GeocodeResult(
        success=False,
        accuracy='unknown',
        query_used=", ".join(filter(None, [detailed_address, village, taluka, district, state, pincode, 'India']))
    )


def geocode_address(address_parts: list[str]) -> Optional[tuple[float, float]]:
    """
    Legacy helper for backward compatibility (used by FamousPlace views).
    Returns (lat, lon) or None.
    """
    query = ", ".join(p.strip() for p in address_parts if p and p.strip())
    if not query:
        return None
    res = query_nominatim_with_cache(query, default_accuracy='exact')
    if res.success and res.latitude and res.longitude:
        return (res.latitude, res.longitude)
    return None
