import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Security Headers & Content Security Policy', () => {
  it('enforces strict Content-Security-Policy with required whitelists', async () => {
    const res = await request(app).get('/healthz')
    expect(res.status).toBe(200)

    const csp = res.headers['content-security-policy']
    expect(csp).toBeDefined()
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain("script-src 'unsafe-inline'")
    expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
    expect(csp).toContain('https://fonts.gstatic.com')
    expect(csp).toContain('https://tile.openstreetmap.org')
    expect(csp).not.toContain('nominatim')
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('sets frame-ancestors to none in CSP to prevent clickjacking', async () => {
    const res = await request(app).get('/healthz')
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'")
  })

  it('does not leak error stack trace in production mode', async () => {
    const prevEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid_json: true')

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.body.stack).toBeUndefined()
    } finally {
      process.env.NODE_ENV = prevEnv
    }
  })
})
