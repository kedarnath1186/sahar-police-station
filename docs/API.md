# Sahar Police Station API Documentation

This document describes all REST API endpoints provided by the Sahar Police Station application.

## Base URL
All API endpoints are mounted under `/api/`, except for `/healthz` and authenticated `/media/` serving.

---

### System & Health

#### `GET /healthz`
Public healthcheck endpoint.
- **Auth Required**: No
- **CSRF Required**: No
- **Response**: `200 OK`
  ```json
  { "status": "ok" }
  ```

---

### Authentication (`/api/auth`)

#### `GET /api/auth/csrf/`
Retrieves or initializes the CSRF token and sets the `csrftoken` cookie.
- **Auth Required**: No
- **Response**: `200 OK`
  ```json
  { "csrfToken": "<token-string>" }
  ```

#### `POST /api/auth/login/`
Authenticates an officer by username and password.
- **Auth Required**: No
- **CSRF Required**: Yes (`X-CSRFToken` header)
- **Request Body**:
  ```json
  { "username": "officer", "password": "password" }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    { "user": { "id": 1, "username": "Rajesh Shinde", "is_staff": true } }
    ```
  - `400 Bad Request`: Username and password missing.
  - `401 Unauthorized`: Invalid credentials, returns attempts remaining.
  - `429 Too Many Requests`: Account locked after 5 failed attempts in 15 minutes.

#### `POST /api/auth/logout/`
Terminates officer session and clears session cookies.
- **Auth Required**: Yes
- **CSRF Required**: Yes
- **Response**: `204 No Content`

#### `GET /api/auth/me/`
Returns current authenticated user information.
- **Auth Required**: Yes
- **Responses**:
  - `200 OK`:
    ```json
    { "id": 1, "username": "Rajesh Shinde", "is_staff": true }
    ```
  - `401 Unauthorized`: Not logged in.

---

### Choices & Metadata (`/api/choices`)

#### `GET /api/choices/`
Provides form dropdown choices and Leaflet map accuracy radii.
- **Auth Required**: No
- **Response**: `200 OK`
  ```json
  {
    "districts": [{ "value": "Mumbai Suburban", "label": "Mumbai Suburban" }],
    "states": [{ "value": "Maharashtra", "label": "Maharashtra" }],
    "statuses": [{ "value": "verified", "label": "Verified" }],
    "accuracies": [{ "value": "exact", "label": "Exact (Building / Street)" }],
    "accuracy_radii": { "exact": 100, "village": 2000, "taluka": 10000, "district": 30000, "state": 100000, "unknown": 500 }
  }
  ```

---

### Dashboard (`/api/dashboard`)

#### `GET /api/dashboard/`
Returns metrics, status breakdowns, and recent 5 accused records.
- **Auth Required**: Yes
- **Response**: `200 OK`
  ```json
  {
    "accused_count": 20,
    "photo_count": 10,
    "places_count": 5,
    "status_counts": {
      "verified": 5,
      "manually_set": 4,
      "needs_review": 4,
      "auto_geocoded": 4,
      "not_geocoded": 3
    },
    "recent_accused": [ ... ]
  }
  ```

---

### Accused Records (`/api/accused`)

#### `GET /api/accused/`
List accused records with pagination and filters.
- **Query Params**: `page`, `page_size`, `search`, `district`, `location_status`
- **Response**: `200 OK`
  ```json
  {
    "results": [ ... ],
    "count": 20,
    "page": 1,
    "page_size": 12,
    "total_pages": 2
  }
  ```

#### `GET /api/accused/table/`
DataTables endpoint with server-side sorting and photo filtering.
- **Query Params**: `ordering`, `has_photos` (`yes`|`no`), `district`, `status`, `search`, `page`, `page_size`

#### `GET /api/accused/map/`
Map data payload returning records with coordinates and review lists.
- **Response**: `200 OK`
  ```json
  {
    "records": [ ... ],
    "needs_review": [ ... ],
    "not_geocoded": [ ... ]
  }
  ```

#### `POST /api/accused/`
Register new accused dossier and trigger 4-tier geocoding.
- **Body**: `full_name`, `mobile_number`, `detailed_address`, `village`, `city`, `taluka`, `district`, `state`, `pincode`
- **Response**: `201 Created`

#### `GET /api/accused/:id/`
Get complete accused dossier with associated photos and verification history.
- **Response**: `200 OK` (or `404 Not Found`)

#### `PUT /api/accused/:id/`
Update accused dossier. Re-geocodes only if address fields change.
- **Response**: `200 OK`

#### `DELETE /api/accused/:id/`
Delete accused record.
- **Body or Header**: Must include `confirm_delete: "DELETE"`.
- **Response**: `204 No Content` (or `400 Bad Request` if confirmation missing)

#### `POST /api/accused/:id/location/`
Set coordinates manually on map.
- **Body**: `{ "latitude": 19.112, "longitude": 72.886, "note": "optional note" }`
- **Response**: `200 OK`

#### `POST /api/accused/:id/verify/`
Mark existing coordinates as verified by officer.
- **Body**: `{ "note": "optional note" }`
- **Response**: `200 OK`

---

### Field Photographs (`/api/photos` & `/api/accused/:id/photos`)

#### `GET /api/accused/:id/photos/`
List photos for an accused record.

#### `POST /api/accused/:id/photos/`
Upload new photograph.
- **Content-Type**: `multipart/form-data`
- **Fields**: `image` (binary, JPEG/PNG/WebP up to 5MB), `location_address`, `latitude`, `longitude`, `caption`
- **Validation**: Content checked via `file-type` and decoded with `sharp`.
- **Response**: `201 Created`

#### `PUT /api/photos/:id/`
Update photo metadata (caption, address, coordinates).

#### `DELETE /api/photos/:id/`
Delete photo and remove file from disk.
- **Confirmation**: Must provide `confirm_delete: "DELETE"`.
- **Response**: `204 No Content`

---

### Famous Places (`/api/places`)

#### `GET /api/places/`
List famous places with landmarks and photo URLs.

#### `POST /api/places/`
Create famous place (auto-geocoded). Supports optional photo upload.

#### `PUT /api/places/:id/`
Update place details and landmark photo.

#### `DELETE /api/places/:id/`
Delete landmark. Requires `confirm_delete: "DELETE"`.

---

### Authenticated Media Serving (`/media/*`)

#### `GET /media/:path`
Serves uploaded images.
- **Auth Required**: Yes (returns `401 Unauthorized` to unauthenticated visitors).
- Path traversal protection enforced.
