import { describe, expect, test } from 'bun:test'

import { MOCK_LOCATIONS, MOCK_PROPERTIES } from '../mock-data'

describe('MOCK_LOCATIONS', () => {
  test('has at least 10 locations', () => {
    expect(MOCK_LOCATIONS.length).toBeGreaterThanOrEqual(10)
  })

  test('all locations have required fields', () => {
    for (const loc of MOCK_LOCATIONS) {
      expect(loc.id).toBeTruthy()
      expect(loc.name).toBeTruthy()
      expect(loc.type).toBeTruthy()
      expect(['kommun', 'stadsdel', 'stad', 'lan', 'omrade', 'adress']).toContain(loc.type)
    }
  })

  test('locations have unique IDs', () => {
    const ids = MOCK_LOCATIONS.map((l) => l.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('includes Stockholm, Gothenburg, and Malmö', () => {
    const names = MOCK_LOCATIONS.map((l) => l.name.toLowerCase())
    expect(names).toContain('stockholm')
    expect(names).toContain('gothenburg')
    expect(names).toContain('malmö')
  })

  test('locations with coordinates have valid ranges', () => {
    for (const loc of MOCK_LOCATIONS) {
      if (loc.coordinates) {
        expect(loc.coordinates.latitude).toBeGreaterThan(50)
        expect(loc.coordinates.latitude).toBeLessThan(70)
        expect(loc.coordinates.longitude).toBeGreaterThan(10)
        expect(loc.coordinates.longitude).toBeLessThan(25)
      }
    }
  })
})

describe('MOCK_PROPERTIES', () => {
  test('has at least 25 properties', () => {
    expect(MOCK_PROPERTIES.length).toBeGreaterThanOrEqual(25)
  })

  test('all properties have required fields', () => {
    for (const prop of MOCK_PROPERTIES) {
      expect(prop.id).toBeTruthy()
      expect(prop.booliId).toBeGreaterThan(0)
      expect(prop.address).toBeTruthy()
      expect(prop.area).toBeTruthy()
      expect(prop.municipality).toBeTruthy()
      expect(prop.price).toBeGreaterThan(0)
      expect(prop.livingArea).toBeGreaterThan(0)
      expect(prop.rooms).toBeGreaterThanOrEqual(1)
      expect(prop.propertyType).toBeTruthy()
      expect(prop.coordinates.latitude).toBeGreaterThan(0)
      expect(prop.coordinates.longitude).toBeGreaterThan(0)
      expect(prop.url).toBeTruthy()
      expect(prop.publishedAt).toBeTruthy()
      expect(prop.daysOnMarket).toBeGreaterThanOrEqual(0)
    }
  })

  test('properties have unique IDs', () => {
    const ids = MOCK_PROPERTIES.map((p) => p.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  test('includes multiple property types', () => {
    const types = new Set(MOCK_PROPERTIES.map((p) => p.propertyType))
    expect(types.size).toBeGreaterThanOrEqual(3)
    expect(types.has('apartment')).toBe(true)
    expect(types.has('house')).toBe(true)
  })

  test('includes properties from multiple municipalities', () => {
    const municipalities = new Set(MOCK_PROPERTIES.map((p) => p.municipality))
    expect(municipalities.size).toBeGreaterThanOrEqual(3)
  })

  test('prices are in reasonable Swedish housing ranges', () => {
    for (const prop of MOCK_PROPERTIES) {
      expect(prop.price).toBeGreaterThan(500000) // > 500k kr
      expect(prop.price).toBeLessThan(50000000) // < 50M kr
    }
  })

  test('living areas are in reasonable ranges', () => {
    for (const prop of MOCK_PROPERTIES) {
      expect(prop.livingArea).toBeGreaterThan(10) // > 10 sqm
      expect(prop.livingArea).toBeLessThan(500) // < 500 sqm
    }
  })

  test('apartments have monthly fees', () => {
    const apartments = MOCK_PROPERTIES.filter(
      (p) => p.propertyType === 'apartment',
    )
    expect(apartments.length).toBeGreaterThan(0)
    for (const apt of apartments) {
      expect(apt.monthlyFee).toBeDefined()
      expect(apt.monthlyFee!).toBeGreaterThan(0)
    }
  })
})
