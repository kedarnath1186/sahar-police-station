# Sahar Police Station — Criminal Records & Location Surveillance System

> **PROTOTYPE NOTICE:** This web application is a demonstration and testing prototype developed for Sahar Police Station (सहार पोलीस ठाणे), Zone VIII, Mumbai Police. It operates strictly with synthetic dummy data. A persistent notice "Prototype: dummy data only." is displayed on all views.

---

## 🚔 Overview & Architecture

The **Sahar Police Station** web application provides an official, high-trust police interface for managing accused suspect records, tracking their residences and surveillance coordinates on interactive OpenStreetMap tiles, archiving geotagged field photographs, and cataloging city landmarks and famous places.

### Tech Stack
- **Backend:** Python 3.11+ & Django 5.x / 6.x
- **Database:** SQLite (default for development); plug-and-play PostgreSQL configuration via `DATABASE_URL`
- **Frontend:** Bootstrap 5, Bootstrap Icons, Google Fonts (*Noto Sans* & *Noto Sans Devanagari*)
- **Mapping:** Leaflet.js with OpenStreetMap (no paid API key required)
- **Data Tables:** jQuery DataTables for interactive client-side search, sorting, and pagination
- **Imaging & Verification:** Pillow (PIL) for byte-level format and integrity checks
- **Geocoding:** OpenStreetMap Nominatim API with rate limiting (1 request/second) and custom User-Agent headers

---

## 🎨 Design Direction & Government Aesthetics

- **Color Palette:**
  - Primary Navy: `#0B2A5B`
  - Dark Navy (Sidebar & Navigation): `#071C3F`
  - Accent Gold: `#E0A526`
  - Background: `#F4F6FA`
  - Surface Cards: `#FFFFFF` (8px radius, subtle elevation)
  - Text: `#1F2937`
  - Status Indicators: Success (`#2E7D32`), Warning (`#B26A00`), Danger (`#C62828`)
- **Official Identity:** Official Maharashtra Police emblem in top navigation (48px) and login page (120px).
- **Typography:** Bilingual clarity with *Noto Sans* and *Noto Sans Devanagari* for official Marathi labels (`सहार पोलीस ठाणे`).
- **Responsive Layout:** Fixed desktop sidebar that cleanly collapses into a mobile slide-out drawer with backdrop down to 360px screen widths.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure Python 3.11 or newer is installed on your system.

### 2. Install Dependencies
Navigate to the project root and install requirements:
```bash
cd sahar_project
pip install -r requirements.txt
```

### 3. Environment Configuration
Create your `.env` file from the provided `.env.example`:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Variables available in `.env`:
```ini
SECRET_KEY=your-secure-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 4. Apply Database Migrations
```bash
python manage.py migrate
```

### 5. Create a Police Officer Account
Run the custom interactive officer creation command:
```bash
python manage.py create_officer
```
You will be prompted for:
- Username
- Officer First Name & Last Name
- Secure Password

*Non-interactive flag execution is also supported:*
```bash
python manage.py create_officer --username officer --password police123 --first-name Rajesh --last-name Shinde
```

### 6. Populate Demonstration Data
Seed 20 realistic accused profiles, 10 geotagged photographs, and 5 famous Maharashtra landmarks:
```bash
python manage.py seed_dummy_data
```

### 7. Launch the Development Server
```bash
python manage.py runserver
```
Visit **[http://127.0.0.1:8000/](http://127.0.0.1:8000/)** in your browser.

---

## 🧪 Running the Test Suite

The test suite validates model constraints, authentication gating, CSRF enforcement, upload restrictions, and audit logging:
```bash
python manage.py test
```

### Test Coverage Highlights:
- **Model Validation:** 10-digit mobile number validator, 6-digit postal pincode validator.
- **Authentication Walls:** Every view (except `/login/`) strictly requires authentication.
- **CSRF Enforcement:** All forms and logout actions require active CSRF tokens.
- **Upload Security:** Verifies file extension, 5 MB size ceiling, and Pillow byte inspection (rejects spoofed executables or corrupted image headers).
- **Audit Trails:** Verifies that `AuditLog` rows are generated on every object creation and deletion.

---

## 🔒 Security & Best Practices

1. **Strict POST Logout:** Logout cannot be triggered via accidental GET pre-fetching; it is protected with POST and CSRF.
2. **Authenticated Media Serving:** Uploaded suspect photos and landmark images are gated by `@login_required` view handlers.
3. **Audit Log:** Complete tracking of user, model, object ID, timestamp, and action description.
4. **Two-Factor Authentication Hook:** Marked with explicit `# TODO: Add two-factor authentication here` comment in `core/views.py:login_view` for seamless future integration.
5. **Nominatim Compliance:** Strict 1-second request delay limiter and custom identifying User-Agent string adhering to OpenStreetMap's usage policy.
