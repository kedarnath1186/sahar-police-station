import prisma from '../db.js'
import {
  MAHARASHTRA_BBOX,
  INDIA_BBOX,
  NOMINATIM_CONTACT_EMAIL,
} from '../config.js'
import { logger } from '../logger.js'

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

let lastRequestTime = 0

export type GeocodeResult = {
  success: boolean
  latitude?: number | null
  longitude?: number | null
  accuracy: 'exact' | 'village' | 'taluka' | 'district' | 'state' | 'unknown'
  displayName?: string
  queryUsed: string
  stepMatched?: number
  rawResponse?: any
}

export function getUserAgent(): string {
  return `SaharPoliceStation/2.0 (Maharashtra Police Prototype; contact: ${NOMINATIM_CONTACT_EMAIL})`
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().split(/\s+/).join(' ')
}

export function isInMaharashtra(lat: number, lon: number): boolean {
  return (
    lat >= MAHARASHTRA_BBOX.minLat &&
    lat <= MAHARASHTRA_BBOX.maxLat &&
    lon >= MAHARASHTRA_BBOX.minLon &&
    lon <= MAHARASHTRA_BBOX.maxLon
  )
}

export function isInIndia(lat: number, lon: number): boolean {
  return (
    lat >= INDIA_BBOX.minLat &&
    lat <= INDIA_BBOX.maxLat &&
    lon >= INDIA_BBOX.minLon &&
    lon <= INDIA_BBOX.maxLon
  )
}

export async function throttleNominatim(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return
  const elapsed = Date.now() - lastRequestTime
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
  }
}

export async function callNominatimSingle(query: string): Promise<any | null> {
  await throttleNominatim()

  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'json')
  url.searchParams.set('countrycodes', 'in')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')

  try {
    logger.info({ query }, 'Calling Nominatim')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': getUserAgent(),
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    lastRequestTime = Date.now()

    if (!response.ok) {
      logger.warn({ status: response.status, query }, 'Nominatim returned error status')
      return null
    }

    const items = await response.json()
    if (!Array.isArray(items) || items.length === 0) {
      return null
    }

    for (const item of items) {
      const lat = parseFloat(item.lat)
      const lon = parseFloat(item.lon)
      if (!isNaN(lat) && !isNaN(lon) && isInMaharashtra(lat, lon)) {
        return item
      }
    }

    return null
  } catch (err) {
    logger.error({ err, query }, 'Error fetching from Nominatim')
    lastRequestTime = Date.now()
    return null
  }
}

export async function queryNominatimWithCache(
  query: string,
  defaultAccuracy: 'exact' | 'village' | 'taluka' | 'district' | 'state' | 'unknown'
): Promise<GeocodeResult> {
  const normQuery = normalizeQuery(query)
  if (!normQuery) {
    return { success: false, queryUsed: query, accuracy: 'unknown' }
  }

  // 1. Check cache (valid for 30 days)
  const cached = await prisma.geocodeCache.findUnique({
    where: { normalizedQuery: normQuery },
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  if (cached && cached.createdAt >= thirtyDaysAgo) {
    if (cached.success && cached.latitude != null && cached.longitude != null) {
      return {
        success: true,
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy as any,
        displayName: cached.displayName,
        queryUsed: query,
        rawResponse: cached.rawJson ? JSON.parse(cached.rawJson) : undefined,
      }
    } else {
      return {
        success: false,
        queryUsed: query,
        accuracy: 'unknown',
      }
    }
  }

  // 2. Fetch from Nominatim using single call
  const item = await callNominatimSingle(query)

  if (item) {
    const lat = parseFloat(item.lat)
    const lon = parseFloat(item.lon)
    const displayName = item.display_name || ''
    const placeType = (item.type || '').toLowerCase()
    const placeClass = (item.class || '').toLowerCase()

    let accuracy = defaultAccuracy
    if (defaultAccuracy === 'exact') {
      const exactTypes = new Set([
        'building',
        'house',
        'residential',
        'road',
        'highway',
        'amenity',
        'commercial',
        'apartments',
        'police',
        'shop',
      ])
      if (exactTypes.has(placeType) || ['building', 'highway', 'amenity'].includes(placeClass)) {
        accuracy = 'exact'
      } else {
        accuracy = 'village'
      }
    }

    // Validate India bounding box
    if (!isInIndia(lat, lon)) {
      await prisma.geocodeCache.upsert({
        where: { normalizedQuery: normQuery },
        update: { success: false, createdAt: new Date() },
        create: { normalizedQuery: normQuery, success: false },
      })
      return { success: false, queryUsed: query, accuracy: 'unknown' }
    }

    // Save to cache
    await prisma.geocodeCache.upsert({
      where: { normalizedQuery: normQuery },
      update: {
        success: true,
        latitude: lat,
        longitude: lon,
        accuracy,
        displayName,
        rawJson: JSON.stringify(item),
        createdAt: new Date(),
      },
      create: {
        normalizedQuery: normQuery,
        success: true,
        latitude: lat,
        longitude: lon,
        accuracy,
        displayName,
        rawJson: JSON.stringify(item),
        createdAt: new Date(),
      },
    })

    return {
      success: true,
      latitude: lat,
      longitude: lon,
      accuracy,
      displayName,
      queryUsed: query,
      rawResponse: item,
    }
  } else {
    // Cache miss
    await prisma.geocodeCache.upsert({
      where: { normalizedQuery: normQuery },
      update: {
        success: false,
        latitude: null,
        longitude: null,
        accuracy: 'unknown',
        displayName: '',
        rawJson: '',
        createdAt: new Date(),
      },
      create: {
        normalizedQuery: normQuery,
        success: false,
        latitude: null,
        longitude: null,
        accuracy: 'unknown',
        displayName: '',
        rawJson: '',
        createdAt: new Date(),
      },
    })

    return { success: false, queryUsed: query, accuracy: 'unknown' }
  }
}

export async function geocodeAccusedAddress(params: {
  detailedAddress: string
  village: string
  taluka: string
  district: string
  state?: string
  pincode?: string
}): Promise<GeocodeResult> {
  const { detailedAddress, village, taluka, district, state = 'Maharashtra', pincode = '' } = params

  const steps: Array<{
    parts: string[]
    defaultAccuracy: 'exact' | 'village' | 'taluka' | 'district'
    stepNum: number
  }> = [
    // Step 1: Detailed full address
    {
      parts: [detailedAddress, village, taluka, district, state, pincode, 'India'],
      defaultAccuracy: 'exact',
      stepNum: 1,
    },
    // Step 2: Village level
    {
      parts: [village, taluka, district, state, 'India'],
      defaultAccuracy: 'village',
      stepNum: 2,
    },
    // Step 3: Taluka level
    {
      parts: [taluka, district, state, 'India'],
      defaultAccuracy: 'taluka',
      stepNum: 3,
    },
    // Step 4: District level
    {
      parts: [district, state, 'India'],
      defaultAccuracy: 'district',
      stepNum: 4,
    },
  ]

  for (const step of steps) {
    const validParts = step.parts.map((p) => p.trim()).filter(Boolean)
    if (validParts.length <= 2) continue

    const query = validParts.join(', ')
    const result = await queryNominatimWithCache(query, step.defaultAccuracy)
    if (result.success) {
      result.stepMatched = step.stepNum
      return result
    }
  }

  return {
    success: false,
    accuracy: 'unknown',
    queryUsed: [detailedAddress, village, taluka, district, state, pincode, 'India']
      .map((p) => p.trim())
      .filter(Boolean)
      .join(', '),
  }
}

export async function geocodePlaceAddress(addressParts: string[]): Promise<{ lat: number; lon: number } | null> {
  const query = addressParts.map((p) => p.trim()).filter(Boolean).join(', ')
  if (!query) return null

  const res = await queryNominatimWithCache(query, 'exact')
  if (res.success && res.latitude != null && res.longitude != null) {
    return { lat: res.latitude, lon: res.longitude }
  }
  return null
}
