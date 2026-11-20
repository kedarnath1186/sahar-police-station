import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

declare module 'express-session' {
  interface SessionData {
    userId?: number
    username?: string
    fullName?: string
    isStaff?: boolean
    csrfToken?: string
  }
}

export function ensureCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex')
  }
  // Set csrftoken cookie so frontend JS can read and send in X-CSRFToken header
  res.cookie('csrftoken', req.session.csrfToken, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Must be readable by client JS to attach to X-CSRFToken
  })
  next()
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE']
  if (safeMethods.includes(req.method.toUpperCase())) {
    return next()
  }

  // Exempt health check if any
  if (req.path === '/healthz') {
    return next()
  }

  const clientToken = (req.headers['x-csrftoken'] || req.headers['x-xsrf-token'] || req.body?.csrfmiddlewaretoken) as string | undefined

  if (!clientToken || !req.session.csrfToken || clientToken !== req.session.csrfToken) {
    return res.status(403).json({
      detail: 'CSRF token missing or incorrect.',
    })
  }

  next()
}
