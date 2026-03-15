import { describe, expect, test } from 'bun:test'

import {
  mapBooliLocationToDomain,
  mapBooliPropertyToDomain,
  mapSearchFiltersToBooliVariables,
} from '../mappers'
import type { BooliLocationRaw, BooliPropertyRaw } from '../types'

describe('mapBooliPropertyToDomain', () => {
  const fullRawProperty: BooliPropertyRaw = {
    booliId: 12345,
    address: 'Testgatan 1',
    area: 'Södermalm',
    municipality: 'Stockholm',
    price: 3500000,
    pricePerSqm: 70000,
    livingArea: 50,
    rooms: 2,
    floor: 3,
    totalFloors: 5,
    constructionYear: 1920,
    monthlyFee: 3200,
    propertyType: 'apartment',
    coordinates: { latitude: 59.315, longitude: 18.071 },
    images: [
      { url: 'https://example.com/img1.jpg', width: 800, height: 600 },
      { url: 'https://example.com/img2.jpg' },
    ],
    description: 'A nice apartment',
    url: 'https://booli.se/annons/12345',
    publishedAt: '2024-01-15',
    daysOnMarket: 7,
  }

  test('maps all fields correctly', () => {
    const result = mapBooliPropertyToDomain(fullRawProperty)

    expect(result.id).toBe('12345')
    expect(result.booliId).toBe(12345)
    expect(result.address).toBe('Testgatan 1')
    expect(result.area).toBe('Södermalm')
    expect(result.municipality).toBe('Stockholm')
    expect(result.price).toBe(3500000)
    expect(result.pricePerSqm).toBe(70000)
    expect(result.livingArea).toBe(50)
    expect(result.rooms).toBe(2)
    expect(result.floor).toBe(3)
    expect(result.totalFloors).toBe(5)
    expect(result.constructionYear).toBe(1920)
    expect(result.monthlyFee).toBe(3200)
    expect(result.propertyType).toBe('apartment')
    expect(result.coordinates).toEqual({ latitude: 59.315, longitude: 18.071 })
    expect(result.images).toHaveLength(2)
    expect(result.images[0].url).toBe('https://example.com/img1.jpg')
    expect(result.images[0].width).toBe(800)
    expect(result.images[1].width).toBeUndefined()
    expect(result.description).toBe('A nice apartment')
    expect(result.url).toBe('https://booli.se/annons/12345')
    expect(result.publishedAt).toBe('2024-01-15')
    expect(result.daysOnMarket).toBe(7)
  })

  test('handles missing optional fields', () => {
    const minimal: BooliPropertyRaw = {
      booliId: 99999,
      address: 'Minimal Address',
      area: 'TestArea',
      municipality: 'TestMunicipality',
      price: 1000000,
      livingArea: 30,
      rooms: 1,
      propertyType: 'apartment',
      coordinates: { latitude: 59.0, longitude: 18.0 },
      images: [],
      url: 'https://booli.se/annons/99999',
      publishedAt: '2024-01-01',
      daysOnMarket: 0,
    }

    const result = mapBooliPropertyToDomain(minimal)

    expect(result.floor).toBeUndefined()
    expect(result.totalFloors).toBeUndefined()
    expect(result.constructionYear).toBeUndefined()
    expect(result.monthlyFee).toBeUndefined()
    expect(result.description).toBeUndefined()
    expect(result.pricePerSqm).toBe(Math.round(1000000 / 30))
    expect(result.images).toHaveLength(0)
  })

  test('calculates pricePerSqm when not provided', () => {
    const raw: BooliPropertyRaw = {
      ...fullRawProperty,
      pricePerSqm: undefined,
      price: 5000000,
      livingArea: 100,
    }

    const result = mapBooliPropertyToDomain(raw)
    expect(result.pricePerSqm).toBe(50000)
  })

  test('handles zero livingArea without division error', () => {
    const raw: BooliPropertyRaw = {
      ...fullRawProperty,
      pricePerSqm: undefined,
      livingArea: 0,
    }

    const result = mapBooliPropertyToDomain(raw)
    expect(result.pricePerSqm).toBeUndefined()
  })

  test('normalizes Swedish property types', () => {
    const types: [string, string][] = [
      ['lägenhet', 'apartment'],
      ['lagenhet', 'apartment'],
      ['villa', 'house'],
      ['radhus', 'townhouse'],
      ['tomt', 'plot'],
      ['fritidshus', 'cottage'],
      ['stuga', 'cottage'],
      ['unknown_type', 'apartment'], // fallback
    ]

    for (const [input, expected] of types) {
      const raw = { ...fullRawProperty, propertyType: input }
      const result = mapBooliPropertyToDomain(raw)
      expect(result.propertyType).toBe(expected as import('@/types').PropertyType)
    }
  })

  test('normalizes English property types', () => {
    const types = ['apartment', 'house', 'townhouse', 'plot', 'cottage']

    for (const type of types) {
      const raw = { ...fullRawProperty, propertyType: type }
      const result = mapBooliPropertyToDomain(raw)
      expect(result.propertyType).toBe(type as import('@/types').PropertyType)
    }
  })

  test('generates string ID from booliId', () => {
    const raw = { ...fullRawProperty, booliId: 42 }
    const result = mapBooliPropertyToDomain(raw)
    expect(result.id).toBe('42')
    expect(typeof result.id).toBe('string')
  })
})

describe('mapBooliLocationToDomain', () => {
  test('maps all fields correctly', () => {
    const raw: BooliLocationRaw = {
      id: 'loc-123',
      name: 'Södermalm',
      type: 'stadsdel',
      slug: 'sodermalm',
      coordinates: { latitude: 59.315, longitude: 18.071 },
      parentName: 'Stockholm',
    }

    const result = mapBooliLocationToDomain(raw)

    expect(result.id).toBe('loc-123')
    expect(result.name).toBe('Södermalm')
    expect(result.type).toBe('stadsdel')
    expect(result.slug).toBe('sodermalm')
    expect(result.coordinates).toEqual({ latitude: 59.315, longitude: 18.071 })
    expect(result.parentName).toBe('Stockholm')
  })

  test('handles missing optional fields', () => {
    const raw: BooliLocationRaw = {
      id: 'loc-456',
      name: 'TestLocation',
      type: 'stad',
    }

    const result = mapBooliLocationToDomain(raw)

    expect(result.slug).toBeUndefined()
    expect(result.coordinates).toBeUndefined()
    expect(result.parentName).toBeUndefined()
  })

  test('normalizes known location types', () => {
    const types = ['kommun', 'stadsdel', 'stad', 'lan', 'omrade', 'adress']

    for (const type of types) {
      const raw: BooliLocationRaw = { id: '1', name: 'Test', type }
      const result = mapBooliLocationToDomain(raw)
      expect(result.type).toBe(type as import('@/types').LocationType)
    }
  })

  test('falls back to omrade for unknown location types', () => {
    const raw: BooliLocationRaw = { id: '1', name: 'Test', type: 'unknown_type' }
    const result = mapBooliLocationToDomain(raw)
    expect(result.type).toBe('omrade')
  })
})

describe('mapSearchFiltersToBooliVariables', () => {
  test('maps full filters correctly', () => {
    const result = mapSearchFiltersToBooliVariables(
      {
        query: 'Stockholm',
        locationId: 'loc-1',
        priceRange: { min: 1000000, max: 5000000 },
        roomsRange: { min: 2, max: 4 },
        areaRange: { min: 40, max: 100 },
        propertyTypes: ['apartment'],
        maxMonthlyFee: 5000,
        maxPricePerSqm: 100000,
        daysActive: 30,
      },
      { offset: 0, limit: 20 },
    )

    expect(result.query).toBe('Stockholm')
    expect(result.locationId).toBe('loc-1')
    expect(result.minPrice).toBe(1000000)
    expect(result.maxPrice).toBe(5000000)
    expect(result.minRooms).toBe(2)
    expect(result.maxRooms).toBe(4)
    expect(result.minArea).toBe(40)
    expect(result.maxArea).toBe(100)
    expect(result.propertyType).toBe('apartment')
    expect(result.maxRent).toBe(5000)
    expect(result.maxPricePerSqm).toBe(100000)
    expect(result.daysActive).toBe(30)
    expect(result.offset).toBe(0)
    expect(result.limit).toBe(20)
  })

  test('handles empty filters', () => {
    const result = mapSearchFiltersToBooliVariables({})

    expect(result.query).toBeUndefined()
    expect(result.locationId).toBeUndefined()
    expect(result.minPrice).toBeUndefined()
    expect(result.maxPrice).toBeUndefined()
    expect(result.limit).toBeUndefined()
    expect(result.offset).toBeUndefined()
  })

  test('handles partial price range', () => {
    const result = mapSearchFiltersToBooliVariables({
      priceRange: { min: 1000000 },
    })

    expect(result.minPrice).toBe(1000000)
    expect(result.maxPrice).toBeUndefined()
  })

  test('uses first property type from array', () => {
    const result = mapSearchFiltersToBooliVariables({
      propertyTypes: ['house', 'apartment'],
    })

    expect(result.propertyType).toBe('house')
  })
})
