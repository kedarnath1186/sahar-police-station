import express from 'express'
import session from 'express-session'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import fs from 'node:fs'
import {
  SECRET_KEY,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  STATIC_DIR,
  FRONTEND_DIST_DIR,
} from './config.js'
import { PrismaSessionStore } from './sessionStore.js'
import { ensureCsrfToken, verifyCsrfToken } from './middleware/csrf.js'

export const app = express()

// Trust reverse proxies
app.set('trust proxy', 1)

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Leaflet tiles and CDN fonts
    crossOriginEmbedderPolicy: false,
  })
)

// Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Normalize trailing slashes for API routes so both /api/foo and /api/foo/ match
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path.length > 4 && req.path.endsWith('/')) {
    const cleanPath = req.path.slice(0, -1)
    req.url = cleanPath + (req.url.slice(req.path.length))
  }
  next()
})

// Session configuration
app.use(
  session({
    name: SESSION_COOKIE_NAME,
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE_MS,
    },
  })
)

// Ensure CSRF token is generated and attached
app.use(ensureCsrfToken)

// Rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)

// GET /healthz returns {"status": "ok"} without login and without CSRF verification
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// CSRF verification on state-modifying requests
app.use(verifyCsrfToken)

// Static directories
if (fs.existsSync(STATIC_DIR)) {
  app.use('/static', express.static(STATIC_DIR))
}
// Also serve legacy logo if static is inside legacy-django
const legacyStatic = path.resolve(STATIC_DIR, '../legacy-django/static')
if (fs.existsSync(legacyStatic)) {
  app.use('/static', express.static(legacyStatic))
}
const frontendPublic = path.resolve(STATIC_DIR, '../frontend/public/static')
if (fs.existsSync(frontendPublic)) {
  app.use('/static', express.static(frontendPublic))
}

export default app
