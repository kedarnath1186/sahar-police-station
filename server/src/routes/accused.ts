import { Router } from 'express'
import { z } from 'zod'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import {
  geocodeAccusedAddress,
  isInIndia,
} from '../services/geocoding.js'
import { logAction } from '../services/auditLog.js'
import {
  serializeAccused,
  serializeLocationCheck,
} from '../services/accusedService.js'

export const accusedRouter = Router()

// All accused endpoints require authentication
accusedRouter.use(requireAuth)

const accusedSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required.').max(150),
  mobile_number: z.string().regex(/^\d{10}$/, 'Mobile number must be exactly 10 digits.'),
  detailed_address: z.string().trim().min(1, 'Detailed address is required.'),
  village: z.string().trim().min(1, 'Village is required.').max(100),
  city: z.string().trim().min(1, 'City is required.').max(100),
  taluka: z.string().trim().min(1, 'Taluka is required.').max(100),
  district: z.string().trim().min(1, 'District is required.'),
  state: z.string().trim().min(1, 'State is required.').default('Maharashtra'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits.'),
})

async function getValidOfficerId(userId?: number): Promise<number | null> {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId } })
  return user ? user.id : null
}

// GET /api/accused/table
accusedRouter.get('/table', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.page_size || 20), 10) || 20))

  const district = typeof req.query.district === 'string' ? req.query.district.trim() : undefined
  const locationStatus = typeof req.query.status === 'string' ? req.query.status.trim() : undefined
  const hasPhotos = req.query.has_photos
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined

  const where: any = {}
  if (district) where.district = district
  if (locationStatus) where.locationStatus = locationStatus
  if (hasPhotos === 'yes') {
    where.photos = { some: {} }
  } else if (hasPhotos === 'no') {
    where.photos = { none: {} }
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { mobileNumber: { contains: search } },
      { detailedAddress: { contains: search } },
      { district: { contains: search } },
    ]
  }

  let orderBy: any = { createdAt: 'desc' }
  const ordering = req.query.ordering as string | undefined
  if (ordering) {
    const orderMap: Record<string, any> = {
      full_name: { fullName: 'asc' },
      '-full_name': { fullName: 'desc' },
      created_at: { createdAt: 'asc' },
      '-created_at': { createdAt: 'desc' },
      district: { district: 'asc' },
      '-district': { district: 'desc' },
    }
    if (orderMap[ordering]) {
      orderBy = orderMap[ordering]
    }
  }

  const [total, items] = await Promise.all([
    prisma.accused.count({ where }),
    prisma.accused.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { photos: true } },
        verifiedBy: true,
      },
    }),
  ])

  res.json({
    results: items.map(serializeAccused),
    count: total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize) || 1,
  })
})

// GET /api/accused/map
accusedRouter.get('/map', async (req, res) => {
  const [mapped, needsReview, notGeocoded] = await Promise.all([
    prisma.accused.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        _count: { select: { photos: true } },
        verifiedBy: true,
      },
    }),
    prisma.accused.findMany({
      where: {
        locationStatus: { in: ['needs_review', 'auto_geocoded'] },
      },
      include: {
        _count: { select: { photos: true } },
        verifiedBy: true,
      },
    }),
    prisma.accused.findMany({
      where: {
        locationStatus: 'not_geocoded',
      },
      include: {
        _count: { select: { photos: true } },
        verifiedBy: true,
      },
    }),
  ])

  res.json({
    records: mapped.map((item) => ({
      ...serializeAccused(item),
      name: item.fullName,
      lat: item.latitude,
      lon: item.longitude,
      address: `${item.detailedAddress}, ${item.village}, ${item.city}`,
      display_name: item.geocodedDisplayName || `${item.village}, ${item.city}, ${item.district}`,
    })),
    needs_review: needsReview.map(serializeAccused),
    not_geocoded: notGeocoded.map(serializeAccused),
  })
})

// GET /api/accused (list)
accusedRouter.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || 1), 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.page_size || 20), 10) || 20))

  const district = typeof req.query.district === 'string' ? req.query.district.trim() : undefined
  const locationStatus = typeof req.query.location_status === 'string' ? req.query.location_status.trim() : undefined
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined

  const where: any = {}
  if (district) where.district = district
  if (locationStatus) where.locationStatus = locationStatus

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { mobileNumber: { contains: search } },
      { detailedAddress: { contains: search } },
      { district: { contains: search } },
    ]
  }

  const [total, items] = await Promise.all([
    prisma.accused.count({ where }),
    prisma.accused.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { photos: true } },
        verifiedBy: true,
      },
    }),
  ])

  res.json({
    results: items.map(serializeAccused),
    count: total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize) || 1,
  })
})

// POST /api/accused (create)
accusedRouter.post('/', async (req, res) => {
  const parseResult = accusedSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors: Record<string, { message: string }[]> = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string
      if (!errors[field]) errors[field] = []
      errors[field].push({ message: issue.message })
    }
    return res.status(400).json({ errors })
  }

  const data = parseResult.data

  // Geocode address
  const geo = await geocodeAccusedAddress({
    detailedAddress: data.detailed_address,
    village: data.village,
    taluka: data.taluka,
    district: data.district,
    state: data.state,
    pincode: data.pincode,
  })

  let locationStatus = 'not_geocoded'
  let locationAccuracy = 'unknown'
  let latitude: number | null = null
  let longitude: number | null = null
  let geocodedQuery = geo.queryUsed || ''
  let geocodedDisplayName = geo.displayName || ''
  let geocodedAt: Date | null = null

  if (geo.success && geo.latitude != null && geo.longitude != null) {
    latitude = geo.latitude
    longitude = geo.longitude
    locationAccuracy = geo.accuracy
    geocodedAt = new Date()
    locationStatus = geo.accuracy === 'exact' ? 'auto_geocoded' : 'needs_review'
  }

  const accused = await prisma.accused.create({
    data: {
      fullName: data.full_name,
      mobileNumber: data.mobile_number,
      detailedAddress: data.detailed_address,
      village: data.village,
      city: data.city,
      taluka: data.taluka,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      latitude,
      longitude,
      locationStatus,
      locationAccuracy,
      geocodedQuery,
      geocodedDisplayName,
      geocodedAt,
    },
    include: {
      _count: { select: { photos: true } },
      verifiedBy: true,
    },
  })

  if (geo.success) {
    const officerId = await getValidOfficerId(req.session.userId)
    await prisma.locationCheck.create({
      data: {
        accusedId: accused.id,
        officerId,
        action: 'auto_geocoded',
        latitude,
        longitude,
        locationStatus,
        locationAccuracy,
        note: `Auto-geocoded via fallback step ${geo.stepMatched || 1}`,
      },
    })
  }

  await logAction(await getValidOfficerId(req.session.userId), 'create', 'Accused', accused.id, `Created ${accused.fullName}`)

  res.status(201).json(serializeAccused(accused))
})

// GET /api/accused/:id
accusedRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const accused = await prisma.accused.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { uploadedAt: 'desc' } },
      locationChecks: {
        orderBy: { timestamp: 'desc' },
        include: { officer: true },
      },
      verifiedBy: true,
    },
  })

  if (!accused) return res.status(404).json({ detail: 'Not found.' })

  res.json({
    ...serializeAccused(accused),
    photos: accused.photos.map((photo) => ({
      id: photo.id,
      accused_id: photo.accusedId,
      image_url: `/media/${photo.image}`,
      location_address: photo.locationAddress,
      latitude: photo.latitude,
      longitude: photo.longitude,
      caption: photo.caption,
      uploaded_at: photo.uploadedAt.toISOString(),
    })),
    location_checks: accused.locationChecks.map(serializeLocationCheck),
  })
})

// PUT /api/accused/:id
accusedRouter.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accused.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const parseResult = accusedSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors: Record<string, { message: string }[]> = {}
    for (const issue of parseResult.error.issues) {
      const field = issue.path[0] as string
      if (!errors[field]) errors[field] = []
      errors[field].push({ message: issue.message })
    }
    return res.status(400).json({ errors })
  }

  const data = parseResult.data

  const addressChanged =
    data.detailed_address !== existing.detailedAddress ||
    data.village !== existing.village ||
    data.city !== existing.city ||
    data.taluka !== existing.taluka ||
    data.district !== existing.district ||
    data.state !== existing.state ||
    data.pincode !== existing.pincode

  let latitude = existing.latitude
  let longitude = existing.longitude
  let locationStatus = existing.locationStatus
  let locationAccuracy = existing.locationAccuracy
  let geocodedQuery = existing.geocodedQuery
  let geocodedDisplayName = existing.geocodedDisplayName
  let geocodedAt = existing.geocodedAt
  let verifiedById = existing.verifiedById
  let verifiedAt = existing.verifiedAt

  const officerId = await getValidOfficerId(req.session.userId)

  if (addressChanged) {
    const geo = await geocodeAccusedAddress({
      detailedAddress: data.detailed_address,
      village: data.village,
      taluka: data.taluka,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
    })

    if (geo.success && geo.latitude != null && geo.longitude != null) {
      latitude = geo.latitude
      longitude = geo.longitude
      locationStatus = 'needs_review'
      locationAccuracy = geo.accuracy
      geocodedQuery = geo.queryUsed || ''
      geocodedDisplayName = geo.displayName || ''
      geocodedAt = new Date()
      verifiedById = null
      verifiedAt = null

      await prisma.locationCheck.create({
        data: {
          accusedId: existing.id,
          officerId,
          action: 're_geocoded',
          latitude,
          longitude,
          locationStatus,
          locationAccuracy,
          note: `Re-geocoded on address edit (step ${geo.stepMatched || 1})`,
        },
      })
    } else {
      latitude = null
      longitude = null
      locationStatus = 'not_geocoded'
      verifiedById = null
      verifiedAt = null

      await prisma.locationCheck.create({
        data: {
          accusedId: existing.id,
          officerId,
          action: 'cleared',
          latitude: null,
          longitude: null,
          locationStatus: 'not_geocoded',
          locationAccuracy: 'unknown',
          note: 'Location could not be found; the map marker has been removed until the location is set manually.',
        },
      })
    }
  }

  const updated = await prisma.accused.update({
    where: { id },
    data: {
      fullName: data.full_name,
      mobileNumber: data.mobile_number,
      detailedAddress: data.detailed_address,
      village: data.village,
      city: data.city,
      taluka: data.taluka,
      district: data.district,
      state: data.state,
      pincode: data.pincode,
      latitude,
      longitude,
      locationStatus,
      locationAccuracy,
      geocodedQuery,
      geocodedDisplayName,
      geocodedAt,
      verifiedById,
      verifiedAt,
    },
    include: {
      _count: { select: { photos: true } },
      verifiedBy: true,
    },
  })

  await logAction(officerId, 'update', 'Accused', updated.id, `Updated ${updated.fullName}`)

  res.json(serializeAccused(updated))
})

// DELETE /api/accused/:id
accusedRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accused.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const confirmDelete = req.body?.confirm_delete || req.headers['x-confirm-delete'] || req.query.confirm_delete
  if (confirmDelete !== 'DELETE') {
    return res.status(400).json({ detail: 'Deletion aborted: must type DELETE to confirm.' })
  }

  await prisma.accused.delete({ where: { id } })
  await logAction(await getValidOfficerId(req.session.userId), 'delete', 'Accused', id, `Deleted accused #${id} ${existing.fullName}`)

  res.status(204).send()
})

// POST /api/accused/:id/location (manual location setting)
accusedRouter.post('/:id/location', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accused.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const lat = parseFloat(req.body.latitude)
  const lon = parseFloat(req.body.longitude)
  const note = String(req.body.note || '').trim()

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ detail: 'Invalid coordinates provided.' })
  }

  if (!isInIndia(lat, lon)) {
    return res.status(400).json({ detail: 'Coordinates must reside within India.' })
  }

  const updated = await prisma.accused.update({
    where: { id },
    data: {
      latitude: lat,
      longitude: lon,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
    },
    include: {
      _count: { select: { photos: true } },
      verifiedBy: true,
    },
  })

  const officerId = await getValidOfficerId(req.session.userId)
  await prisma.locationCheck.create({
    data: {
      accusedId: id,
      officerId,
      action: 'manually_set',
      latitude: lat,
      longitude: lon,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      note: note || 'Pinned manually by officer',
    },
  })

  await logAction(officerId, 'manual_set', 'Accused', id, `Manually set coordinates to (${lat}, ${lon})`)

  res.json(serializeAccused(updated))
})

// POST /api/accused/:id/verify (verify location)
accusedRouter.post('/:id/verify', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accused.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  if (existing.latitude == null || existing.longitude == null) {
    return res.status(400).json({ detail: 'Cannot verify record without established coordinates.' })
  }

  const note = String(req.body.note || '').trim()
  const officerId = await getValidOfficerId(req.session.userId)

  const updated = await prisma.accused.update({
    where: { id },
    data: {
      locationStatus: 'verified',
      verifiedById: officerId,
      verifiedAt: new Date(),
    },
    include: {
      _count: { select: { photos: true } },
      verifiedBy: true,
    },
  })

  await prisma.locationCheck.create({
    data: {
      accusedId: id,
      officerId,
      action: 'verified',
      latitude: existing.latitude,
      longitude: existing.longitude,
      locationStatus: 'verified',
      locationAccuracy: existing.locationAccuracy,
      note: note || 'Verified by officer',
    },
  })

  await logAction(officerId, 'verify', 'Accused', id, 'Verified location coordinates')

  res.json(serializeAccused(updated))
})
