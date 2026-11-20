# Location Verification & Geocoding Rules

This document specifies the location and geocoding business rules for the Sahar Police Station application.

## 1. 4-Tier Fallback Hierarchy
When geocoding an accused person's address, queries are attempted in the following fallback sequence, stopping at the first successful match:

1. **Step 1: Detailed Address**
   `[detailed_address, village, taluka, district, state, pincode, India]`
   - Accuracy: `exact` (if Nominatim returns building, residential, road, highway, amenity, commercial, apartments, police, shop) or `village`.
2. **Step 2: Village Level**
   `[village, taluka, district, state, India]`
   - Accuracy: `village`
3. **Step 3: Taluka Level**
   `[taluka, district, state, India]`
   - Accuracy: `taluka`
4. **Step 4: District Level**
   `[district, state, India]`
   - Accuracy: `district`

## 2. Geofencing Boundaries
Coordinates are accepted only if they fall inside:
- **Maharashtra Geographic Bounding Box**:
  - Latitude: 15.6° to 22.1° N
  - Longitude: 72.6° to 80.9° E
- **India Geographic Bounding Box**:
  - Latitude: 6.5° to 37.5° N
  - Longitude: 68.0° to 97.5° E

## 3. Rate Limiting & Nominatim Policy
- Minimum 1.0 second between consecutive requests to Nominatim (`https://nominatim.openstreetmap.org/search`).
- HTTP User-Agent includes contact email (`NOMINATIM_CONTACT_EMAIL`).
- 10-second timeout per call.
- Parameters: `countrycodes=in`, `addressdetails=1`, `limit=5`.

## 4. 30-Day Cache Policy
- Queries are normalized (lowercase, whitespace collapsed) and keyed in `GeocodeCache`.
- Caches both successful matches (`success: true`) and misses (`success: false`).
- Cache entries expire after 30 days.

## 5. Failure & Editing Rules
- **New record, geocode fails**: Saved with `location_status = 'not_geocoded'`, null coordinates, and user notification.
- **Address edited, geocode succeeds**: Coordinates updated, `location_status = 'needs_review'`, previous officer verification cleared (`verified_by = null`, `verified_at = null`).
- **Address edited, geocode fails**: Coordinates cleared (`latitude = null`, `longitude = null`), `location_status = 'not_geocoded'`, previous officer verification cleared.
- **Non-address fields edited**: Coordinates, verification, and status remain UNCHANGED. No geocoding query is sent.
- **Accuracy threshold**: Any auto-geocode with accuracy less than `exact` is marked `needs_review`.

## 6. Manual Location & Verification
- **Manual Location Set**: Officer pins coordinates manually. Coordinates must reside within India. Status set to `manually_set`, accuracy `exact`.
- **Verify Location**: Officer marks record verified. Requires established coordinates. Sets status `verified`, officer ID, and timestamp.
- Each action generates an immutable `LocationCheck` audit record.
