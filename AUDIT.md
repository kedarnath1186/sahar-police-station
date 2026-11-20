# Security, Architectural, and UI Audit: Sahar Police Station Prototype

**Date:** 18 November 2026  
**Auditor:** Police Systems Engineering Team  
**System Target:** Sahar Police Station (सहार पोलीस ठाणे) Prototype  

---

## 1. Views Authentication Audit (`requireAuth`)

### Findings:
- `login`: Intentionally unauthenticated (entrypoint), with strict lockout and rate limits.
- `logout`: Protected with authentication.
- `dashboard`: Protected with authentication.
- `media`: Protected with authentication and path-traversal prevention.
- `accused`: CRUD, map, table, verification endpoints protected with authentication.
- `places`: CRUD endpoints protected with authentication.

### Remediation:
- Enforce authentication on all protected routes with `requireAuth`.
- Implement inactivity session timeout (30 min) and login failure throttle (5 attempts / 15 min per username).
- Protect mutating operations with CSRF tokens.

---

## 2. Geocoding Service Audit

### Findings:
- **Rate Limiting:** In-memory time tracker enforces 1 request per second between consecutive external calls.
- **User-Agent:** User-Agent includes contact email from environment (`NOMINATIM_CONTACT_EMAIL`), adhering to Nominatim usage policy.
- **Query Strategy:** 4-tier fallback mechanism (Detailed -> Village -> Taluka -> District).
- **Bounding Box & Geofencing:** Coordinates validated within Maharashtra (lat 15.6 to 22.1, lng 72.6 to 80.9) and India.
- **Parameters:** Nominatim requests specify `countrycodes=in`, `addressdetails=1`, and `limit=5`.
- **Cache:** Persistent `GeocodeCache` keyed by normalized query with 30-day validity.

### Remediation:
- 4-step fallback hierarchy (Detailed -> Village -> Taluka -> District).
- Persistent cache table storing success and failure results.
- Boundary validation against India and Maharashtra bounding boxes.

---

## 3. Failed Geocoding Coordinate Handling

### Findings:
- When an address field is changed and geocoding fails, coordinates are cleared (`latitude = null`, `longitude = null`), status is set to `not_geocoded`, and verification is cleared.
- When an address field is changed and geocoding succeeds, coordinates are updated, status is set to `needs_review`, and verification is cleared.
- Non-address edits leave coordinates and status unchanged without issuing geocoding queries.

---

## 4. Photo Uploads and Content Inspection

### Findings:
- Uploads accept JPEG, PNG, and WebP up to 5 MB.
- Content is validated via `file-type` buffer inspection and verified by decoding with `sharp`. Extensions alone are never trusted.
- Deleting a photo record deletes the underlying file from disk.

---

## 5. Responsive Layout & Mobile Usability

### Findings:
- Responsive down to 360 px width.
- Sidebar collapses into a mobile hamburger menu with touch targets ≥ 44 px.
- Data tables wrap into cards on mobile displays.
