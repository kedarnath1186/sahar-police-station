import { Router } from 'express'
import multer from 'multer'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { geocodePlaceAddress } from '../services/geocoding.js'
import { validateAndSaveImage, deleteImageFile } from '../services/photoService.js'
import { logAction } from '../services/auditLog.js'

export const placesRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit enforced at streaming level
})

placesRouter.use(requireAuth)

export function serializePlace(place: any) {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    city: place.city,
    district: place.district,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
    photo_url: place.photo ? `/media/${place.photo}` : '',
  }
}

// GET /api/places
placesRouter.get('/', async (req, res) => {
  const places = await prisma.famousPlace.findMany({
    orderBy: { name: 'asc' },
  })
  res.json(places.map(serializePlace))
})

// POST /api/places
placesRouter.post('/', upload.single('photo'), async (req, res) => {
  const name = String(req.body.name || '').trim()
  const description = String(req.body.description || '').trim()
  const city = String(req.body.city || '').trim()
  const district = String(req.body.district || '').trim()
  const address = String(req.body.address || '').trim()

  if (!name || !description || !city || !district || !address) {
    return res.status(400).json({ detail: 'All place fields are required.' })
  }

  let photoPath: string | null = null
  if (req.file) {
    try {
      photoPath = await validateAndSaveImage(req.file.buffer, 'famous_places')
    } catch (err: any) {
      return res.status(400).json({ detail: err.message || 'Image upload failed.' })
    }
  }

  // Geocode address
  let latitude: number | null = null
  let longitude: number | null = null
  const geo = await geocodePlaceAddress([address, city, district, 'Maharashtra', 'India'])
  if (geo) {
    latitude = geo.lat
    longitude = geo.lon
  }

  const place = await prisma.famousPlace.create({
    data: {
      name,
      description,
      city,
      district,
      address,
      latitude,
      longitude,
      photo: photoPath,
    },
  })

  await logAction(req.session.userId || null, 'create', 'FamousPlace', place.id, `Created place ${place.name}`)

  res.status(201).json(serializePlace(place))
})

// GET /api/places/:id
placesRouter.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const place = await prisma.famousPlace.findUnique({ where: { id } })
  if (!place) return res.status(404).json({ detail: 'Not found.' })

  res.json(serializePlace(place))
})

// PUT /api/places/:id
placesRouter.put('/:id', upload.single('photo'), async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.famousPlace.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const name = req.body.name !== undefined ? String(req.body.name).trim() : existing.name
  const description = req.body.description !== undefined ? String(req.body.description).trim() : existing.description
  const city = req.body.city !== undefined ? String(req.body.city).trim() : existing.city
  const district = req.body.district !== undefined ? String(req.body.district).trim() : existing.district
  const address = req.body.address !== undefined ? String(req.body.address).trim() : existing.address

  let photoPath = existing.photo
  if (req.file) {
    try {
      photoPath = await validateAndSaveImage(req.file.buffer, 'famous_places')
      if (existing.photo) {
        await deleteImageFile(existing.photo)
      }
    } catch (err: any) {
      return res.status(400).json({ detail: err.message || 'Image upload failed.' })
    }
  }

  let latitude = existing.latitude
  let longitude = existing.longitude

  if (address !== existing.address || city !== existing.city || district !== existing.district) {
    const geo = await geocodePlaceAddress([address, city, district, 'Maharashtra', 'India'])
    if (geo) {
      latitude = geo.lat
      longitude = geo.lon
    }
  }

  const updated = await prisma.famousPlace.update({
    where: { id },
    data: {
      name,
      description,
      city,
      district,
      address,
      latitude,
      longitude,
      photo: photoPath,
    },
  })

  await logAction(req.session.userId || null, 'update', 'FamousPlace', id, `Updated place ${updated.name}`)

  res.json(serializePlace(updated))
})

// DELETE /api/places/:id
placesRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.famousPlace.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const confirmDelete = req.body?.confirm_delete || req.headers['x-confirm-delete'] || req.query.confirm_delete
  if (confirmDelete !== 'DELETE') {
    return res.status(400).json({ detail: 'Deletion aborted: must type DELETE to confirm.' })
  }

  if (existing.photo) {
    await deleteImageFile(existing.photo)
  }

  await prisma.famousPlace.delete({ where: { id } })
  await logAction(req.session.userId || null, 'delete', 'FamousPlace', id, `Deleted place #${id} ${existing.name}`)

  res.status(204).send()
})
