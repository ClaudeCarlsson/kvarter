import { describe, expect, test } from 'bun:test'

import {
  CITY_ZOOM,
  DEBOUNCE_MS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_ZOOM,
  PROPERTY_TYPE_LABELS,
  STOCKHOLM_CENTER,
  SWEDEN_CENTER,
} from '../constants'

describe('constants', () => {
  test('STOCKHOLM_CENTER has valid coordinates', () => {
    expect(STOCKHOLM_CENTER.latitude).toBeCloseTo(59.3293, 2)
    expect(STOCKHOLM_CENTER.longitude).toBeCloseTo(18.0686, 2)
  })

  test('SWEDEN_CENTER has valid coordinates', () => {
    expect(SWEDEN_CENTER.latitude).toBeCloseTo(62.0, 0)
    expect(SWEDEN_CENTER.longitude).toBeCloseTo(15.0, 0)
  })

  test('zoom levels are positive integers', () => {
    expect(DEFAULT_ZOOM).toBeGreaterThan(0)
    expect(CITY_ZOOM).toBeGreaterThan(DEFAULT_ZOOM)
  })

  test('DEFAULT_PAGE_SIZE is reasonable', () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0)
    expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(100)
  })

  test('DEBOUNCE_MS is reasonable', () => {
    expect(DEBOUNCE_MS).toBeGreaterThan(0)
    expect(DEBOUNCE_MS).toBeLessThan(1000)
  })

  test('PROPERTY_TYPE_LABELS has all property types', () => {
    expect(PROPERTY_TYPE_LABELS.apartment).toBe('Apartment')
    expect(PROPERTY_TYPE_LABELS.house).toBe('House')
    expect(PROPERTY_TYPE_LABELS.townhouse).toBe('Townhouse')
    expect(PROPERTY_TYPE_LABELS.plot).toBe('Plot')
    expect(PROPERTY_TYPE_LABELS.cottage).toBe('Cottage')
  })

  test('PROPERTY_TYPE_LABELS covers exactly 5 types', () => {
    expect(Object.keys(PROPERTY_TYPE_LABELS)).toHaveLength(5)
  })
})
