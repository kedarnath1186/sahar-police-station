import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../src/app.js'
import prisma from '../src/db.js'
import { hashPassword } from '../src/services/authService.js'

describe('Accused CRUD and Verification Tests', () => {
  let agent: ReturnType<typeof request.agent>
  let csrfToken: string
  let officerId: number

  beforeEach(async () => {
    await prisma.locationCheck.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.accusedPhoto.deleteMany()
    await prisma.accused.deleteMany()
    await prisma.loginAttempt.deleteMany()
    await prisma.user.deleteMany()
    vi.restoreAllMocks()

    const hashed = await hashPassword('police123')
    const officer = await prisma.user.create({
      data: {
        username: 'officer_accused',
        fullName: 'Inspector Sahar',
        password: hashed,
        isStaff: true,
      },
    })
    officerId = officer.id

    agent = request.agent(app)
    const csrfRes = await agent.get('/api/auth/csrf')
    csrfToken = csrfRes.body.csrfToken

    await agent
      .post('/api/auth/login')
      .set('X-CSRFToken', csrfToken)
      .send({ username: 'officer_accused', password: 'police123' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates accused with auto-geocoded coordinates on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '19.0988',
          lon: '72.8711',
          display_name: 'Sahar Village, Andheri, Mumbai, India',
          type: 'residential',
          class: 'building',
        },
      ],
    }))

    const payload = {
      full_name: 'Test Accused Person',
      mobile_number: '9876543210',
      detailed_address: 'Flat 101, Test Residency',
      village: 'Sahar Village',
      city: 'Mumbai',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400099',
    }

    const res = await agent
      .post('/api/accused')
      .set('X-CSRFToken', csrfToken)
      .send(payload)

    expect(res.status).toBe(201)
    expect(res.body.record_id).toMatch(/^SPS-ACC-\d{4}-\d{4}$/)
    expect(res.body.formatted_mobile).toBe('+91 98765 43210')
    expect(res.body.location_status).toBe('auto_geocoded')
    expect(res.body.location_accuracy).toBe('exact')
    expect(res.body.latitude).toBeCloseTo(19.0988, 4)

    const inDb = await prisma.accused.findUnique({ where: { id: res.body.id } })
    expect(inDb).not.toBeNull()
    expect(inDb?.fullName).toBe('Test Accused Person')

    const check = await prisma.locationCheck.findFirst({ where: { accusedId: res.body.id } })
    expect(check).not.toBeNull()
    expect(check?.action).toBe('auto_geocoded')
  })

  it('creates accused with not_geocoded status when geocoding fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))

    const payload = {
      full_name: 'Unlocatable Accused',
      mobile_number: '9876543211',
      detailed_address: 'Deep Jungle No Roads',
      village: 'Unknown Forest',
      city: 'Gadchiroli',
      taluka: 'Bhamragad',
      district: 'Gadchiroli',
      state: 'Maharashtra',
      pincode: '442710',
    }

    const res = await agent
      .post('/api/accused')
      .set('X-CSRFToken', csrfToken)
      .send(payload)

    expect(res.status).toBe(201)
    expect(res.body.location_status).toBe('not_geocoded')
    expect(res.body.latitude).toBeNull()
    expect(res.body.longitude).toBeNull()
  })

  it('editing address re-geocodes and sets needs_review, clearing verification', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Accused To Edit',
        mobileNumber: '9876543212',
        detailedAddress: 'Old Address 1',
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
        verifiedById: officerId,
        verifiedAt: new Date(),
      },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '19.1124',
          lon: '72.8863',
          display_name: 'Marol, Mumbai, India',
          type: 'village',
          class: 'place',
        },
      ],
    }))

    const updatePayload = {
      full_name: 'Accused To Edit',
      mobile_number: '9876543212',
      detailed_address: 'New Address in Marol',
      village: 'Marol',
      city: 'Mumbai',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400059',
    }

    const res = await agent
      .put(`/api/accused/${accused.id}`)
      .set('X-CSRFToken', csrfToken)
      .send(updatePayload)

    expect(res.status).toBe(200)
    expect(res.body.location_status).toBe('needs_review')
    expect(res.body.verified_by).toBeNull()
    expect(res.body.verified_at).toBeNull()
    expect(res.body.latitude).toBeCloseTo(19.1124, 4)

    const checks = await prisma.locationCheck.findMany({ where: { accusedId: accused.id } })
    expect(checks.some((c) => c.action === 're_geocoded')).toBe(true)
  })

  it('editing address with geocode failure clears coordinates and sets not_geocoded', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Accused Losing Coords',
        mobileNumber: '9876543213',
        detailedAddress: 'Known Place',
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
        verifiedById: officerId,
        verifiedAt: new Date(),
      },
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))

    const updatePayload = {
      full_name: 'Accused Losing Coords',
      mobile_number: '9876543213',
      detailed_address: 'Nowhere Unknown Island',
      village: 'Lost',
      city: 'Mumbai',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400099',
    }

    const res = await agent
      .put(`/api/accused/${accused.id}`)
      .set('X-CSRFToken', csrfToken)
      .send(updatePayload)

    expect(res.status).toBe(200)
    expect(res.body.location_status).toBe('not_geocoded')
    expect(res.body.latitude).toBeNull()
    expect(res.body.longitude).toBeNull()
    expect(res.body.verified_by).toBeNull()

    const checks = await prisma.locationCheck.findMany({ where: { accusedId: accused.id } })
    expect(checks.some((c) => c.action === 'cleared')).toBe(true)
  })

  it('editing non-address fields leaves coordinates and verification intact without re-geocoding', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Stable Accused',
        mobileNumber: '9876543214',
        detailedAddress: 'Same Address 123',
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
        verifiedById: officerId,
        verifiedAt: new Date(),
      },
    })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const updatePayload = {
      full_name: 'Stable Accused Renamed',
      mobile_number: '9876543299',
      detailed_address: 'Same Address 123',
      village: 'Sahar',
      city: 'Mumbai',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400099',
    }

    const res = await agent
      .put(`/api/accused/${accused.id}`)
      .set('X-CSRFToken', csrfToken)
      .send(updatePayload)

    expect(res.status).toBe(200)
    expect(res.body.full_name).toBe('Stable Accused Renamed')
    expect(res.body.latitude).toBeCloseTo(19.0988, 4)
    expect(res.body.location_status).toBe('verified')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('allows manual location setting with India validation', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Manual Location Accused',
        mobileNumber: '9876543215',
        detailedAddress: 'Address',
        village: 'Sahar',
        city: 'Mumbai',
        taluka: 'Andheri',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400099',
        locationStatus: 'not_geocoded',
      },
    })

    const badRes = await agent
      .post(`/api/accused/${accused.id}/location`)
      .set('X-CSRFToken', csrfToken)
      .send({ latitude: 51.5074, longitude: -0.1278, note: 'London' })
    expect(badRes.status).toBe(400)
    expect(badRes.body.detail).toContain('within India')

    const goodRes = await agent
      .post(`/api/accused/${accused.id}/location`)
      .set('X-CSRFToken', csrfToken)
      .send({ latitude: 19.112456, longitude: 72.886321, note: 'Pinned by field officer' })

    expect(goodRes.status).toBe(200)
    expect(goodRes.body.location_status).toBe('manually_set')
    expect(goodRes.body.latitude).toBeCloseTo(19.112456, 5)

    const check = await prisma.locationCheck.findFirst({
      where: { accusedId: accused.id, action: 'manually_set' },
    })
    expect(check).not.toBeNull()
    expect(check?.officerId).toBe(officerId)
  })

  it('allows marking location as verified as a separate action', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Unverified Accused',
        mobileNumber: '9876543216',
        detailedAddress: 'Address',
        village: 'Sahar',
        city: 'Mumbai',
        taluka: 'Andheri',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400099',
        latitude: 19.0988,
        longitude: 72.8711,
        locationStatus: 'manually_set',
        locationAccuracy: 'exact',
      },
    })

    const res = await agent
      .post(`/api/accused/${accused.id}/verify`)
      .set('X-CSRFToken', csrfToken)
      .send({ note: 'Officer certified against Aadhaar' })

    expect(res.status).toBe(200)
    expect(res.body.location_status).toBe('verified')
    expect(res.body.verified_by).toBe('Inspector Sahar')
    expect(res.body.verified_at).not.toBeNull()

    const check = await prisma.locationCheck.findFirst({
      where: { accusedId: accused.id, action: 'verified' },
    })
    expect(check).not.toBeNull()
    expect(check?.officerId).toBe(officerId)
  })

  it('enforces typing DELETE to confirm accused deletion', async () => {
    const accused = await prisma.accused.create({
      data: {
        fullName: 'Accused To Delete',
        mobileNumber: '9876543217',
        detailedAddress: 'Address',
        village: 'Sahar',
        city: 'Mumbai',
        taluka: 'Andheri',
        district: 'Mumbai Suburban',
        state: 'Maharashtra',
        pincode: '400099',
      },
    })

    const badRes = await agent
      .delete(`/api/accused/${accused.id}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'NO' })
    expect(badRes.status).toBe(400)
    expect(badRes.body.detail).toContain('must type DELETE to confirm')
    expect(await prisma.accused.findUnique({ where: { id: accused.id } })).not.toBeNull()

    const goodRes = await agent
      .delete(`/api/accused/${accused.id}`)
      .set('X-CSRFToken', csrfToken)
      .send({ confirm_delete: 'DELETE' })
    expect(goodRes.status).toBe(204)
    expect(await prisma.accused.findUnique({ where: { id: accused.id } })).toBeNull()
  })
})
