import { Router } from 'express'
import multer from 'multer'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { validateAndSaveImage, deleteImageFile } from '../services/photoService.js'
import { logAction } from '../services/auditLog.js'

export const photosRouter = Router()
export const accusedPhotosRouter = Router({ mergeParams: true })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB memory ceiling, validated to 5MB in service
})

photosRouter.use(requireAuth)
accusedPhotosRouter.use(requireAuth)

export function serializePhoto(photo: any) {
  return {
    id: photo.id,
    accused_id: photo.accusedId,
    image_url: `/media/${photo.image}`,
    location_address: photo.locationAddress,
    latitude: photo.latitude,
    longitude: photo.longitude,
    caption: photo.caption || '',
    uploaded_at: new Date(photo.uploadedAt).toISOString(),
  }
}

// GET /api/accused/:id/photos
accusedPhotosRouter.get('/', async (req, res) => {
  const accusedId = parseInt(req.params.id, 10)
  if (isNaN(accusedId)) return res.status(404).json({ detail: 'Not found.' })

  const photos = await prisma.accusedPhoto.findMany({
    where: { accusedId },
    orderBy: { uploadedAt: 'desc' },
  })

  res.json(photos.map(serializePhoto))
})

// POST /api/accused/:id/photos
accusedPhotosRouter.post('/', upload.single('image'), async (req, res) => {
  const accusedId = parseInt(req.params.id, 10)
  if (isNaN(accusedId)) return res.status(404).json({ detail: 'Not found.' })

  const accused = await prisma.accused.findUnique({ where: { id: accusedId } })
  if (!accused) return res.status(404).json({ detail: 'Not found.' })

  if (!req.file) {
    return res.status(400).json({ detail: 'Choose an image to upload.' })
  }

  const locationAddress = String(req.body.location_address || '').trim()
  if (!locationAddress) {
    return res.status(400).json({ detail: 'Enter where the photo was taken.' })
  }

  const latitude = parseFloat(req.body.latitude)
  const longitude = parseFloat(req.body.longitude)
  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ detail: 'Valid coordinates are required.' })
  }

  const caption = String(req.body.caption || '').trim()

  try {
    const savedPath = await validateAndSaveImage(req.file.buffer, 'accused_photos')

    const photo = await prisma.accusedPhoto.create({
      data: {
        accusedId,
        image: savedPath,
        locationAddress,
        latitude,
        longitude,
        caption,
      },
    })

    await logAction(
      req.session.userId || null,
      'create',
      'AccusedPhoto',
      photo.id,
      `Uploaded photo for accused #${accusedId}`
    )

    res.status(201).json(serializePhoto(photo))
  } catch (err: any) {
    return res.status(400).json({ detail: err.message || 'Image upload failed.' })
  }
})

// PUT /api/photos/:id
photosRouter.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accusedPhoto.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const locationAddress = req.body.location_address !== undefined
    ? String(req.body.location_address).trim()
    : existing.locationAddress

  const latitude = req.body.latitude !== undefined ? parseFloat(req.body.latitude) : existing.latitude
  const longitude = req.body.longitude !== undefined ? parseFloat(req.body.longitude) : existing.longitude
  const caption = req.body.caption !== undefined ? String(req.body.caption).trim() : existing.caption

  const updated = await prisma.accusedPhoto.update({
    where: { id },
    data: {
      locationAddress,
      latitude,
      longitude,
      caption,
    },
  })

  await logAction(req.session.userId || null, 'update', 'AccusedPhoto', id, 'Updated photo metadata')

  res.json(serializePhoto(updated))
})

// DELETE /api/photos/:id
photosRouter.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(404).json({ detail: 'Not found.' })

  const existing = await prisma.accusedPhoto.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ detail: 'Not found.' })

  const confirmDelete = req.body?.confirm_delete || req.headers['x-confirm-delete'] || req.query.confirm_delete
  if (confirmDelete !== 'DELETE') {
    return res.status(400).json({ detail: 'Deletion aborted: must type DELETE to confirm.' })
  }

  await deleteImageFile(existing.image)
  await prisma.accusedPhoto.delete({ where: { id } })
  await logAction(req.session.userId || null, 'delete', 'AccusedPhoto', id, `Deleted photo #${id}`)

  res.status(204).send()
})
