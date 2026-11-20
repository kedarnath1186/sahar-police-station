import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/db.js'
import { hashPassword } from '../src/services/authService.js'

describe('Auth & Session API', () => {
  beforeEach(async () => {
    await prisma.loginAttempt.deleteMany()
    await prisma.user.deleteMany()

    // Create a test officer
    const hashed = await hashPassword('police123')
    await prisma.user.create({
      data: {
        username: 'officer',
        fullName: 'Inspector Sahar',
        password: hashed,
        isStaff: true,
      },
    })
  })

  it('GET /api/auth/csrf returns a valid csrf token', async () => {
    const res = await request(app).get('/api/auth/csrf')
    expect(res.status).toBe(200)
    expect(res.body.csrfToken).toBeDefined()
    expect(typeof res.body.csrfToken).toBe('string')
  })

  it('POST /api/auth/login rejects requests without CSRF token with 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'officer', password: 'police123' })
    expect(res.status).toBe(403)
    expect(res.body.detail).toContain('CSRF token missing or incorrect')
  })

  it('POST /api/auth/login succeeds with valid credentials and sets session', async () => {
    const agent = request.agent(app)
    const csrfRes = await agent.get('/api/auth/csrf')
    const token = csrfRes.body.csrfToken

    const loginRes = await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', token)
      .send({ username: 'officer', password: 'police123' })

    expect(loginRes.status).toBe(200)
    expect(loginRes.body.user.username).toBe('Inspector Sahar')
    expect(loginRes.body.user.is_staff).toBe(true)

    // Check GET /api/auth/me
    const meRes = await agent.get('/api/auth/me')
    expect(meRes.status).toBe(200)
    expect(meRes.body.username).toBe('Inspector Sahar')

    // Check POST /api/auth/logout
    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('X-CSRFToken', token)
    expect(logoutRes.status).toBe(204)

    // After logout, me should be 401
    const meAfterLogout = await agent.get('/api/auth/me')
    expect(meAfterLogout.status).toBe(401)
  })

  it('Enforces login lockout after 5 failed attempts in 15 minutes', async () => {
    const agent = request.agent(app)
    const csrfRes = await agent.get('/api/auth/csrf')
    const token = csrfRes.body.csrfToken

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = await agent
        .post('/api/auth/login')
        .set('X-CSRFToken', token)
        .send({ username: 'officer', password: 'wrongpassword' })
      expect(res.status).toBe(401)
      expect(res.body.detail).toContain('attempt(s) remaining')
    }

    // 5th failed attempt triggers lockout
    const fifthRes = await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', token)
      .send({ username: 'officer', password: 'wrongpassword' })
    expect(fifthRes.status).toBe(429)
    expect(fifthRes.body.detail).toContain('Security lockout')

    // 6th attempt is blocked immediately
    const sixthRes = await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', token)
      .send({ username: 'officer', password: 'police123' }) // Even with correct password
    expect(sixthRes.status).toBe(429)
    expect(sixthRes.body.detail).toContain('Security lockout')
  })
})
