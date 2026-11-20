import { Router } from 'express'
import prisma from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { serializeAccused } from '../services/accusedService.js'

export const dashboardRouter = Router()

dashboardRouter.use(requireAuth)

dashboardRouter.get('/', async (req, res) => {
  const [accusedCount, photoCount, placesCount, statusCountsGroup, recentAccused] =
    await Promise.all([
      prisma.accused.count(),
      prisma.accusedPhoto.count(),
      prisma.famousPlace.count(),
      prisma.accused.groupBy({
        by: ['locationStatus'],
        _count: { _all: true },
      }),
      prisma.accused.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { photos: true } },
          verifiedBy: true,
        },
      }),
    ])

  const status_counts: Record<string, number> = {
    verified: 0,
    manually_set: 0,
    needs_review: 0,
    auto_geocoded: 0,
    not_geocoded: 0,
  }

  for (const group of statusCountsGroup) {
    status_counts[group.locationStatus] = group._count._all
  }

  res.json({
    accused_count: accusedCount,
    photo_count: photoCount,
    places_count: placesCount,
    status_counts,
    recent_accused: recentAccused.map(serializeAccused),
  })
})
