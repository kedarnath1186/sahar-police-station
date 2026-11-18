# Security, Architectural, and UI Audit: Sahar Police Station Prototype

**Date:** 18 November 2026  
**Auditor:** Police Systems Engineering Team  
**System Target:** Sahar Police Station (सहार पोलीस ठाणे) Django Prototype  

---

## 1. Views Authentication Audit (`@login_required` / `LoginRequiredMixin`)

### Findings:
- **`core/views.py`**:
  - `login_view`: Intentionally unauthenticated (entrypoint), but contained a debug query parameter bypass (`?auto_auth=officer`) which must be removed or strictly isolated for security.
  - `logout_view`: Uses `@require_POST`, but **lacks `@login_required`**. Unauthenticated sessions can trigger logout POST handlers.
  - `dashboard_view`: Properly protected with `@login_required`.
  - `serve_media_view`: Protected with `@login_required`.
- **`accused/views.py`**:
  - `add_accused`, `view_accused_list`, `view_accused_detail`, `edit_accused`, `delete_accused`, `table_view`, `map_view`, `add_photo`, `edit_photo`, `delete_photo`, and `accused_photos_api` are all protected with `@login_required`.
- **`places/views.py`**:
  - `add_place`, `view_places`, `edit_place`, `delete_place` are all protected with `@login_required`.

### Remediation:
- Add `@login_required` to `logout_view`.
- Implement inactivity session timeout (30 min) and login failure throttle (5 attempts / 15 min per username).
- Remove unauthenticated bypass hooks from `login_view`.

---

## 2. Geocoding Service Audit (`core/geocoding.py`)

### Findings:
- **Rate Limiting:** A basic in-memory time tracker (`_last_request_time`) enforces 1 request per second. However, it does not persist across worker threads/processes and lacks caching.
- **User-Agent:** User-Agent is hardcoded as `'SaharPoliceStation/1.0 (prototype)'`. It **does not include a contact email address from Django settings**, violating Nominatim's strict usage policy.
- **Query Strategy:** Nominatim query is a single naive concatenation of all address fields (`detailed_address, village, taluka, district, state, pincode`). It lacks a multi-tier fallback mechanism (e.g. failing down to village, taluka, district).
- **Bounding Box & Geofencing:** No verification that coordinates reside within Maharashtra (lat 15.6 to 22.1, lng 72.6 to 80.9) or India.
- **Missing Parameters:** Nominatim request does not specify `countrycodes=in`, `addressdetails=1`, or `limit=5`.
- **Cache Absence:** Identical addresses trigger redundant external HTTP requests, risking 429 rate limit bans.

### Remediation:
- Refactor `core/geocoding.py` with 4-step fallback hierarchy (Detailed -> Village -> Taluka -> District).
- Introduce a persistent `GeocodeCache` model with 30-day TTL.
- Validate coordinates against India and Maharashtra bounding boxes.
- Retrieve contact email from `settings.NOMINATIM_CONTACT_EMAIL` for the `User-Agent`.

---

## 3. Failed Geocoding Coordinate Handling

### Findings:
- **CRITICAL FLAW FOUND:** In both `accused/views.py:edit_accused` (lines 104–113) and `places/views.py:edit_place` (lines 89–98), when an address field is changed but Nominatim geocoding fails:
  ```python
  if address_changed:
      lat, lon = _geocode_accused(accused)
      if lat is not None:
          accused.latitude = lat
          accused.longitude = lon
      else:
          messages.warning(request, 'Could not re-geocode... Previous coordinates have been retained.')
  ```
  **Old coordinates are retained on the modified record.**
  This causes severe geographical misinformation: a suspect moved to a new district or village still appears on the map at their old address marker!

### Remediation:
- On edit where an address changes: If geocoding fails, explicitly set `latitude = None`, `longitude = None`, `location_status = 'not_geocoded'`, clear `verified_by` and `verified_at`, and notify the officer: *“Location could not be found; the map marker has been removed until the location is set manually.”*
- On new records where geocoding fails: Save with `location_status = 'not_geocoded'` and empty coordinates, warning: *“Location not found. Set it manually on the map.”*

---

## 4. Photo Upload & Pillow Verification Audit

### Findings:
- Both `accused/forms.py:AccusedPhotoForm` and `places/forms.py:FamousPlaceForm` inspect file size (`<= 5 MB`), check extensions (`.jpg, .jpeg, .png, .webp`), and invoke `PIL.Image.open(file).verify()`.
- However:
  - Destructive delete actions did not mandate typing `"DELETE"` in the confirmation dialog.
  - Image preview on mobile screens below 360 px lacked fluid width constraints.

### Remediation:
- Enforce strict typing of `"DELETE"` in confirmation modals for both accused records and photo deletions.
- Keep Pillow verification active on all forms.

---

## 5. Responsive Layout Audit (Widths Below 360 px)

### Findings:
- **Sidebar & Hamburger:** The sidebar overlay properly hides at `< 768px`, but the topbar header elements (breadcrumbs + badge + logout button) crowd together at 360px and wrap into three awkward rows.
- **DataTables Overflow:** The table view contains 11 columns. Without table horizontal wrapper padding and compact typography, cells truncate or cause horizontal viewport scrolling.
- **Detail Page Buttons:** Top action buttons (`Add Photo`, `Edit Dossier`, `Delete`) stack with irregular spacing on narrow screens.
- **Sticky Actions Bar:** Form submit action buttons (`Save`, `Cancel`, helper text) overflow on 320–360px devices because of large margins (`-24px`).

### Remediation:
- Adjust `@media (max-width: 360px)` in `app.css` to streamline sticky form actions, flex-wrap header elements cleanly, and ensure responsive scrolling on DataTables.

---

## 6. Bilingual Localization (English & Marathi) Audit

### Findings:
- **Header Insignia:** The top brand contains `"Sahar Police Station"` and `"सहार पोलीस ठाणे"`, but **lacks the official state force name in English and Marathi:** `"Maharashtra Police"` and `"महाराष्ट्र पोलीस"`.
- **Station Address:** Station address is either hardcoded or missing from navigation and headers instead of dynamically loaded from `settings.POLICE_STATION_ADDRESS`.
- **Status Badges & Legends:** Key police terminology (e.g. Verified / पडताळणी झालेले, Needs Review / पुनरावलोकन आवश्यक) lacked bilingual representation in table headers and legends.

### Remediation:
- Add `POLICE_STATION_NAME_EN`, `POLICE_STATION_NAME_MR`, `POLICE_FORCE_NAME_EN`, `POLICE_FORCE_NAME_MR`, and `POLICE_STATION_ADDRESS` to `settings.py`.
- Update `base.html` and `login.html` to render both languages prominently in the header.
- Add bilingual titles and badges throughout the system.

---

## 7. Action Plan & Implementation Order

1. **Part 1 Fixes:** Save audit report in `AUDIT.md` and address immediate security issues.
2. **Part 2 Implementation:**
   - Accused model extensions (`location_status`, `location_accuracy`, `geocoded_query`, etc.).
   - Create `GeocodeCache` and `LocationCheck` models, create & apply migrations.
   - Refactor `core/geocoding.py` with 4-step fallback, India/Maharashtra bounding boxes, settings email User-Agent, and caching.
   - Implement manual location setting (Leaflet draggable marker, India search, confirm location, mark verified).
   - Update Map View with status colors, accuracy circles, filters, and review panels.
   - Update Dashboard with status metrics.
3. **Part 3 Implementation:**
   - Realistic Police UI (station address from settings, bilingual header, persistent PROTOTYPE band).
   - Record ID auto-generator (e.g. `SPS-ACC-2026-0001`).
   - IST date formatting (`DD/MM/YYYY hh:mm A`) and mobile number format (`+91 XXXXX XXXXX`).
   - Tabbed record dossier (Personal, Location, Photos, History).
   - Clean printable view (`Print record`).
   - Toast notification system and "DELETE" confirmation modal.
   - 30-min session timeout warning & 5-attempt login throttle.
   - Custom 403, 404, 500 error templates.
4. **Part 4 Implementation:**
   - Seed data update with diverse statuses and verified Maharashtra coordinates.
   - Comprehensive unit and integration test suite with mocked Nominatim calls.
   - Generate Department Guidelines document (`LOCATION_RULES.md`).
   - Capture required screenshots in `docs/screenshots/`.
