import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import sharp from 'sharp'
import app from '../src/app.js'
import prisma from '../src/db.js'
import { hashPassword } from '../src/services/authService.js'

describe('Photo Upload & Security Tests', () => {
  let agent: ReturnType<typeof request.agent>
  let csrfToken: string
  let accusedId: number

  beforeEach(async () => {
    await prisma.accusedPhoto.deleteMany()
    await prisma.accused.deleteMany()
    await prisma.user.deleteMany()

    const hashed = await hashPassword('police123')
    await prisma.user.create({
      data: {
        username: 'officer_photos',
        fullName: 'Inspector Sahar',
        password: hashed,
        isStaff: true,
      },
    })

    const accused = await prisma.accused.create({
      data: {
        fullName: 'Photo Target Accused',
        mobileNumber: '9876543220',
        detailedAddress: 'Sahar Cargo Gate 1',
        village: 'Sahar',
        city: 'Mumbai',
        taluka: 'Andheri',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400099',
        latitude: 19.0988,
        longitude: 72.8711,
        locationStatus: 'verified',
        locationAccuracy: 'exact',
      },
    })
    accusedId = accused.id

    agent = request.agent(app)
    const csrfRes = await agent.get('/api/auth/csrf')
    csrfToken = csrfRes.body.csrfToken

    await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', csrfToken)
      .send({ username: 'officer_photos', password: 'police123' })
  })

  it('uploads valid image and creates database record', async () => {
    // Generate valid JPEG buffer using sharp
    const validImageBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer()

    const res = await agent
      .post(`/api/accused/${accusedId}/photos`)
      .set('X-CSRFToken', csrfToken)
      .attach('image', validImageBuffer, 'photo.jpg')
      .field('location_address', 'Sahar Cargo Gate 1')
      .field('latitude', '19.0988')
      .field('longitude', '72.8711')
      .field('caption', 'Valid spot check photo')

    expect(res.status).toBe(201)
    expect(res.body.image_url).toContain('/media/accused_photos/')
    expect(res.body.caption).toBe('Valid spot check photo')

    const inDb = await prisma.accusedPhoto.findFirst({ where: { accusedId } })
    expect(inDb).not.toBeNull()
  })

  it('rejects upload of non-image file content even with image extension', async () => {
    const fakeImageBuffer = Buffer.from('This is pure text, definitely not an image byte sequence.')

    const res = await agent
      .post(`/api/accused/${accusedId}/photos`)
      .set('X-CSRFToken', csrfToken)
      .attach('image', fakeImageBuffer, 'malicious.jpg')
      .field('location_address', 'Sahar Gate')
      .field('latitude', '19.0988')
      .field('longitude', '72.8711')

    expect(res.status).toBe(400)
    expect(res.body.detail).toContain('Upload a valid image')

    const count = await prisma.accusedPhoto.count({ where: { accusedId } })
    expect(count).toBe(0)
  })

  it('enforces typing DELETE to confirm photo deletion', async () => {
    const validImageBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer()

    const createRes = await agent
      .post(`/api/accused/${accusedId}/photos`)
      .set('X-CSRFToken', csrfToken)
      .attach('image', validImageBuffer, 'photo.png')
      .field('location_address', 'Address')
      .field('latitude', '19.0988')
      .field('longitude', '72.8711')
    const photoId = createRes.body.id

    // Bad confirm
    const badRes = await agent
      .delete(`/api/photos/${photoId}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'NO' })
    expect(badRes.status).toBe(400)
    expect(await prisma.accusedPhoto.findUnique({ where: { id: photoId } })).not.toBeNull()

    // Good confirm
    const goodRes = await agent
      .delete(`/api/photos/${photoId}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'DELETE' })
    expect(goodRes.status).toBe(204)
    expect(await prisma.accusedPhoto.findUnique({ where: { id: photoId } })).toBeNull()
  })

  it('rejects image files exceeding the 5 MB limit', async () => {
    // 5.5 MB payload
    const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0)

    const res = await agent
      .post(`/api/accused/${accusedId}/photos`)
      .set('X-CSRFToken', csrfToken)
      .attach('image', oversizedBuffer, 'oversized.jpg')
      .field('location_address', 'Address')

    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('blocks directory traversal attempts on /media route', async () => {
    const traversalRes = await agent.get('/media/../../package.json')
    expect(traversalRes.status).toBeGreaterThanOrEqual(400)
    expect(traversalRes.text).not.toContain('sahar-police-station')
  })
})
