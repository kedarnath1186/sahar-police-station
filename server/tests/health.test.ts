import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/db.js'

describe('GET /healthz', () => {
  it('returns {"status": "ok"} when database is connected', async () => {
    const res = await request(app).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('returns 503 {"status": "error", "detail": "Database unavailable"} when database fails', async () => {
    const spy = vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('DB connection failure'))
    const res = await request(app).get('/healthz')
    expect(res.status).toBe(503)
    expect(res.body).toEqual({ status: 'error', detail: 'Database unavailable' })
    spy.mockRestore()
  })
})
