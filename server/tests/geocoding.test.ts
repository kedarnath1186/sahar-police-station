import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import prisma from '../src/db.js'
import * as geocodingService from '../src/services/geocoding.js'

describe('Geocoding Service Unit Tests', () => {
  beforeEach(async () => {
    await prisma.geocodeCache.deleteMany()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('verifies bounding box checks for Maharashtra and India', () => {
    expect(geocodingService.isInMaharashtra(19.076, 72.8777)).toBe(true)
    expect(geocodingService.isInIndia(19.076, 72.8777)).toBe(true)

    expect(geocodingService.isInMaharashtra(28.6139, 77.209)).toBe(false)
    expect(geocodingService.isInIndia(28.6139, 77.209)).toBe(true)

    expect(geocodingService.isInIndia(51.5074, -0.1278)).toBe(false)
    expect(geocodingService.isInMaharashtra(51.5074, -0.1278)).toBe(false)
  })

  it('handles fallback order step 1 exact match', async () => {
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

    const res = await geocodingService.geocodeAccusedAddress({
      detailedAddress: 'Flat 101, Sai Apts',
      village: 'Sahar Village',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400099',
    })

    expect(res.success).toBe(true)
    expect(res.accuracy).toBe('exact')
    expect(res.stepMatched).toBe(1)
    expect(res.latitude).toBeCloseTo(19.0988, 4)
    expect(res.longitude).toBeCloseTo(72.8711, 4)
  })

  it('falls back to step 2 when step 1 fails', async () => {
    let callCount = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return { ok: true, json: async () => [] } // Step 1 returns empty
      }
      return {
        ok: true,
        json: async () => [
          {
            lat: '19.1124',
            lon: '72.8863',
            display_name: 'Marol, Andheri, Mumbai, India',
            type: 'village',
            class: 'place',
          },
        ],
      }
    }))

    const res = await geocodingService.geocodeAccusedAddress({
      detailedAddress: 'Unknown Lane, Fake Building',
      village: 'Marol',
      taluka: 'Andheri',
      district: 'Mumbai Suburban',
      state: 'Maharashtra',
      pincode: '400059',
    })

    expect(res.success).toBe(true)
    expect(res.accuracy).toBe('village')
    expect(res.stepMatched).toBe(2)
    expect(res.latitude).toBeCloseTo(19.1124, 4)
  })

  it('returns failure when all 4 fallback steps fail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }))

    const res = await geocodingService.geocodeAccusedAddress({
      detailedAddress: 'Nowhere',
      village: 'Ghost Town',
      taluka: 'Lost Taluka',
      district: 'Empty District',
      state: 'Maharashtra',
      pincode: '999999',
    })

    expect(res.success).toBe(false)
    expect(res.accuracy).toBe('unknown')
  })

  it('uses 30-day cache for repeat queries and avoids external call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          lat: '19.0760',
          lon: '72.8777',
          display_name: 'Mumbai, Maharashtra, India',
          type: 'city',
          class: 'place',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const query = 'Mumbai, Maharashtra, India'
    const res1 = await geocodingService.queryNominatimWithCache(query, 'district')
    expect(res1.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call should hit DB cache and NOT call fetch
    const res2 = await geocodingService.queryNominatimWithCache(query, 'district')
    expect(res2.success).toBe(true)
    expect(res2.latitude).toBeCloseTo(19.0760, 4)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
