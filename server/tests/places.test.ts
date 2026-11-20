import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/db.js'
import { hashPassword } from '../src/services/authService.js'
import * as geocodingService from '../src/services/geocoding.js'

describe('Famous Places API Tests', () => {
  let agent: ReturnType<typeof request.agent>
  let csrfToken: string

  beforeEach(async () => {
    await prisma.famousPlace.deleteMany()
    await prisma.user.deleteMany()
    vi.restoreAllMocks()

    const hashed = await hashPassword('police123')
    await prisma.user.create({
      data: {
        username: 'officer_places',
        fullName: 'Inspector Sahar',
        password: hashed,
        isStaff: true,
      },
    })

    agent = request.agent(app)
    const csrfRes = await agent.get('/api/auth/csrf')
    csrfToken = csrfRes.body.csrfToken

    await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', csrfToken)
      .send({ username: 'officer_places', password: 'police123' })
  })

  it('creates and lists famous places with geocoding', async () => {
    vi.spyOn(geocodingService, 'geocodePlaceAddress').mockResolvedValueOnce({
      lat: 18.5196,
      lon: 73.8553,
    })

    const createRes = await agent
      .post('/api/places')
      .set('X-CSRFToken', csrfToken)
      .send({
        name: 'Shaniwar Wada',
        description: 'Historic fortification',
        city: 'Pune',
        district: 'Pune',
        address: 'Shaniwar Peth',
      })

    expect(createRes.status).toBe(201)
    expect(createRes.body.name).toBe('Shaniwar Wada')
    expect(createRes.body.latitude).toBeCloseTo(18.5196, 4)

    const listRes = await agent.get('/api/places')
    expect(listRes.status).toBe(200)
    expect(listRes.body.length).toBe(1)
    expect(listRes.body[0].name).toBe('Shaniwar Wada')
  })

  it('requires typing DELETE to delete famous place', async () => {
    const place = await prisma.famousPlace.create({
      data: {
        name: 'Gateway of India',
        description: 'Monument',
        city: 'Mumbai',
        district: 'Mumbai City',
        address: 'Apollo Bandar',
      },
    })

    const badRes = await agent
      .delete(`/api/places/${place.id}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'NO' })
    expect(badRes.status).toBe(400)
    expect(await prisma.famousPlace.findUnique({ where: { id: place.id } })).not.toBeNull()

    const goodRes = await agent
      .delete(`/api/places/${place.id}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'DELETE' })
    expect(goodRes.status).toBe(204)
    expect(await prisma.famousPlace.findUnique({ where: { id: place.id } })).toBeNull()
  })
})
