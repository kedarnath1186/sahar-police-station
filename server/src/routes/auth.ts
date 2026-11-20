import { Router } from 'express'
import { authenticateOfficer } from '../services/authService.js'
import { SESSION_COOKIE_NAME } from '../config.js'

export const authRouter = Router()

// GET /api/auth/csrf
authRouter.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken })
})

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  const username = String(req.body?.username || '').trim()
  const password = String(req.body?.password || '')

  if (!username || !password) {
    return res.status(400).json({ detail: 'Username and password are required.' })
  }

  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip

  const { user, error, locked } = await authenticateOfficer(username, password, clientIp)

  if (!user) {
    const statusCode = locked ? 429 : 401
    return res.status(statusCode).json({ detail: error })
  }

  req.session.userId = user.id
  req.session.username = user.username
  req.session.fullName = user.fullName
  req.session.isStaff = user.isStaff

  res.json({
    user: {
      id: user.id,
      username: user.fullName || user.username,
      is_staff: user.isStaff,
    },
  })
})

// POST /api/auth/logout
authRouter.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      res.clearCookie(SESSION_COOKIE_NAME)
      if (err) {
        return res.status(500).json({ detail: 'Could not log out.' })
      }
      return res.status(204).send()
    })
  } else {
    res.clearCookie(SESSION_COOKIE_NAME)
    res.status(204).send()
  }
})

// GET /api/auth/me
authRouter.get('/me', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ detail: 'Authentication credentials were not provided.' })
  }
  res.json({
    id: req.session.userId,
    username: req.session.fullName || req.session.username,
    is_staff: Boolean(req.session.isStaff),
  })
})
