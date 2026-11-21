import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import { maskMobile } from '../src/logger.js'

describe('Logger & Request ID Tracing', () => {
  it('masks 10-digit mobile numbers with middle digits concealed', () => {
    expect(maskMobile('9820112233')).toBe('982****233')
    expect(maskMobile('9123456789')).toBe('912****789')
    expect(maskMobile('')).toBe('')
    expect(maskMobile(null as any)).toBe('')
  })

  it('assigns X-Request-Id header to HTTP responses', async () => {
    const res = await request(app).get('/healthz')
    expect(res.headers['x-request-id']).toBeDefined()
    expect(typeof res.headers['x-request-id']).toBe('string')
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0)
  })

  it('preserves client-provided X-Request-Id header', async () => {
    const customId = 'client-trace-12345'
    const res = await request(app)
      .get('/healthz')
      .set('X-Request-Id', customId)
    expect(res.headers['x-request-id']).toBe(customId)
  })
})
