# Sahar Police Station — Criminal Records & Location Surveillance System

## Overview & Architecture

The **Sahar Police Station** (सहार पोलीस ठाणे) web application provides an official, high-trust interface for managing accused suspect records, tracking residences and verification coordinates on interactive maps, archiving geotagged field photographs, and cataloging landmarks.

### Tech Stack
- **Backend:** Node.js 20 LTS, TypeScript, Express, Prisma ORM
- **Database:** SQLite for development (`file:./dev.db`); PostgreSQL for production, selected by `DATABASE_URL`
- **Auth & Security:** `express-session` with persistent store, HTTP-only secure cookies, `argon2` password hashing, CSRF protection via `X-CSRFToken` header, `helmet`, `express-rate-limit`
- **Uploads & Imaging:** `multer`, file content validation via `file-type`, decode confirmation via `sharp`
- **Logging:** `pino`
- **Frontend:** React, Vite, TypeScript, React Router, TanStack Query, React Hook Form with Zod, Leaflet with React Leaflet, TanStack Table, `react-i18next` (English, Marathi, Hindi)
- **Testing:** Vitest, Supertest

---

## Design & Aesthetics

- **Color Palette:**
  - Primary Navy: `#0B2A5B`
  - Dark Navy (Sidebar & Navigation): `#071C3F`
  - Accent Gold: `#E0A526`
  - Background: `#F4F6FA`
  - Surface Cards: `#FFFFFF`
  - Text: `#1F2937`
  - Status Indicators: Success (`#2E7D32`), Warning (`#B26A00`), Danger (`#C62828`)
- **Official Identity:** Maharashtra Police emblem in navigation and login page.
- **Typography:** Bilingual clarity with *Noto Sans* and *Noto Sans Devanagari*.
- **Responsive Layout:** Fixed desktop sidebar that cleanly collapses into a mobile hamburger menu down to 360px screen widths.

---

## Quick Start Guide

### 1. Prerequisites
- Node.js 20 LTS or newer
- npm 10+

### 2. Install Dependencies
```bash
npm install
npm install --prefix frontend
```

### 3. Setup Database & Prisma
```bash
npm run prisma:generate
npm run prisma:push
```

### 4. Create Officer Account
```bash
npm run create-officer
```

### 5. Seed Demonstration Data (Optional)
```bash
npm run seed
```

### 6. Run Tests
```bash
npm test
```

### 7. Build Project
```bash
npm run build
```

### 8. Start Server
```bash
npm start
```
Application will be accessible at `http://localhost:8000`.

---

## Docker Deployment

To launch the entire application with PostgreSQL in production:
```bash
docker compose up -d --build
```
Healthcheck endpoint is accessible at `/healthz`.
