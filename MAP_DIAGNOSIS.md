# Leaflet Map Diagnostic & Root Cause Report

## 1. Problem Diagnosis
Inspection of `frontend/src/pages/AccusedMapPage.tsx` and `frontend/src/index.css` revealed several root causes for visual and behavioral map issues:

### A. Missing Global Stylesheet Import
- **Issue:** `leaflet/dist/leaflet.css` was imported locally inside `AccusedMapPage.tsx` and `PlacesPage.tsx` instead of once globally in `frontend/src/main.tsx`.
- **Consequence:** In a code-split React SPA, navigating between views causes styles to be applied asynchronously. Without global presence, marker positioning, tile layer z-indices, controls, and popup panes intermittently display unstyled or displaced.
- **Remediation:** Import `leaflet/dist/leaflet.css` once at the application entry point (`frontend/src/main.tsx`).

### B. Lack of `map.invalidateSize()` on Mount and Resize
- **Issue:** The React Leaflet `<MapContainer>` renders inside a CSS grid layout (`.map-layout`). When the container or viewport dimensions adjust after initial DOM mount or during responsive reflows, Leaflet is unaware of the size change.
- **Consequence:** Leaflet computes tile coordinates against outdated or zero dimensions, causing partial renders ("grey tiles") until manually panned or zoomed.
- **Remediation:** Implement a `<MapResizer />` component calling `map.invalidateSize()` immediately on mount, on layout stabilization timeout, and on window `resize` events.

### C. Map Container Dimensions
- **Issue:** The container used ambiguous `min(68vh, 680px)` and `min-height: 430px`, which on mobile caused overflow and on desktop left unused viewport space.
- **Remediation:** Explicitly set desktop map container height to `calc(100vh - 180px)` (min-height 480px) and mobile height to `60vh` (min-height 320px).

### D. Leaflet Default Marker Bundling Bug & Lack of Status Coloring
- **Issue:** Standard Leaflet markers rely on `marker-icon.png` loaded via dynamic CSS relative paths. Vite's asset bundling breaks these relative URLs, resulting in missing or 404 image icons. Furthermore, all markers rendered as generic blue pins rather than reflecting verification statuses.
- **Remediation:** Implement `L.divIcon` pins with inline SVG and distinct status colors:
  - Verified: Green (`#2E7D32`)
  - Manually Set: Navy (`#0B2A5B`)
  - Needs Review: Amber (`#B26A00`)
  - Auto Geocoded: Dark Slate (`#071C3F`)
  - Not Geocoded: Grey (`#6B7280`)
  Explicit `iconSize` (`[28, 36]`), `iconAnchor` (`[14, 36]`), and `popupAnchor` (`[0, -34]`) ensure pinpoint geographic accuracy.

### E. Incomplete Popup Actions
- **Issue:** Popups lacked address details, accuracy indicators, and direct "Add photo" actions.
- **Remediation:** Popups now include full name, record ID, district, address, geocoded display name, verification status, accuracy badge, "Add Photo" button, and "Open Record" button.
