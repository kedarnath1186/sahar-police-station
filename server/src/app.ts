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
import { authRouter } from './routes/auth.js'
import { choicesRouter } from './routes/choices.js'
import { dashboardRouter } from './routes/dashboard.js'
import { accusedRouter } from './routes/accused.js'
import { photosRouter, accusedPhotosRouter } from './routes/photos.js'
import { placesRouter } from './routes/places.js'
import { mediaRouter } from './routes/media.js'

export const app = express()

// Trust reverse proxies
app.set('trust proxy', 1)

// Helmet for security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://tile.openstreetmap.org',
          'https://*.tile.openstreetmap.org',
          'https://*.tile.openstreetmap.de',
        ],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
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
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)

// GET /healthz returns {"status": "ok"} without login and without CSRF verification
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Authenticated media file serving
app.use('/media', mediaRouter)

// CSRF verification on state-modifying requests
app.use(verifyCsrfToken)

// Mount API routes
app.use('/api/auth', authRouter)
app.use('/api/choices', choicesRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/accused/:id/photos', accusedPhotosRouter)
app.use('/api/accused', accusedRouter)
app.use('/api/photos', photosRouter)
app.use('/api/places', placesRouter)

// Static directories
if (fs.existsSync(STATIC_DIR)) {
  app.use('/static', express.static(STATIC_DIR))
}
const frontendPublic = path.resolve(STATIC_DIR, '../frontend/public/static')
if (fs.existsSync(frontendPublic)) {
  app.use('/static', express.static(frontendPublic))
}

// Serve frontend build if dist exists
if (fs.existsSync(FRONTEND_DIST_DIR)) {
  app.use(
    express.static(FRONTEND_DIST_DIR, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
          res.setHeader('Pragma', 'no-cache')
          res.setHeader('Expires', '0')
        }
      },
    })
  )
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media') || req.path.startsWith('/static')) {
      return next()
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.sendFile(path.resolve(FRONTEND_DIST_DIR, 'index.html'))
  })
}

export default app
