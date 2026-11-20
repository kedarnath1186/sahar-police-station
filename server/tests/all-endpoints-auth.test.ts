import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'

describe('Protected Endpoints Authentication Tests', () => {
  const protectedGetEndpoints = [
    '/api/auth/me',
    '/api/dashboard',
    '/api/accused',
    '/api/accused/table',
    '/api/accused/map',
    '/api/accused/1',
    '/api/accused/1/photos',
    '/api/places',
    '/api/places/1',
    '/media/accused_photos/test.jpg',
  ]

  for (const endpoint of protectedGetEndpoints) {
    it(`GET ${endpoint} returns 401 when unauthenticated`, async () => {
      const res = await request(app).get(endpoint)
      expect(res.status).toBe(401)
      expect(res.body.detail).toContain('Authentication credentials were not provided')
    })
  }

  const protectedMutatingEndpoints = [
    { method: 'post', url: '/api/accused' },
    { method: 'put', url: '/api/accused/1' },
    { method: 'delete', url: '/api/accused/1' },
    { method: 'post', url: '/api/accused/1/location' },
    { method: 'post', url: '/api/accused/1/verify' },
    { method: 'post', url: '/api/accused/1/photos' },
    { method: 'put', url: '/api/photos/1' },
    { method: 'delete', url: '/api/photos/1' },
    { method: 'post', url: '/api/places' },
    { method: 'put', url: '/api/places/1' },
    { method: 'delete', url: '/api/places/1' },
  ]

  for (const item of protectedMutatingEndpoints) {
    it(`${item.method.toUpperCase()} ${item.url} returns 401 (or 403 CSRF) when unauthenticated`, async () => {
      const agent = request.agent(app)
      const csrfRes = await agent.get('/api/auth/csrf')
      const token = csrfRes.body.csrfToken

      const res = await (agent as any)[item.method](item.url).set('X-CSRFToken', token).send({})
      expect([401, 403]).toContain(res.status)
    })
  }
})
