import { describe, expect, test } from 'bun:test'

import type { Property } from '@/types'

import type { ModelCoefficients } from '../coefficients'
import { buildFeatureVector, decomposePrice } from '../decompose'

const TEST_COEFFICIENTS: ModelCoefficients = {
  version: '1.0.0',
  createdAt: '2026-03-15T00:00:00',
  intercept: 8.5,
  coefficients: {
    sqm: 0.0085,
    rooms: 0.045,
    floor: 0.012,
    log_construction_age: -0.15,
    monthly_fee: -0.000045,
    lat: 0.82,
    lng: 0.18,
    property_type_apartment: 0.0,
    property_type_house: 0.22,
    property_type_townhouse: 0.12,
    property_type_cottage: -0.08,
    property_type_plot: -0.25,
  },
  featureNames: [
    'sqm',
    'rooms',
    'floor',
    'log_construction_age',
    'monthly_fee',
    'lat',
    'lng',
    'property_type_apartment',
    'property_type_house',
    'property_type_townhouse',
    'property_type_cottage',
    'property_type_plot',
  ],
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: '1',
    booliId: 100001,
    address: 'Hornsgatan 42',
    area: 'Sodermalm',
    municipality: 'Stockholm',
    price: 4_950_000,
    pricePerSqm: 82_500,
    livingArea: 60,
    rooms: 2,
    floor: 4,
    totalFloors: 6,
    constructionYear: 1925,
    monthlyFee: 3_200,
    propertyType: 'apartment',
    coordinates: { latitude: 59.3171, longitude: 18.0494 },
    images: [{ url: '/placeholder.jpg' }],
    description: 'Test apartment',
    url: 'https://www.booli.se/annons/100001',
    publishedAt: '2026-03-15',
    daysOnMarket: 5,
    ...overrides,
  }
}

/** Helper: get predicted price for a property to derive test prices from it. */
function getPredictedPrice(overrides: Partial<Property> = {}): number {
  const result = decomposePrice(makeProperty(overrides), TEST_COEFFICIENTS)
  return result.predictedPrice
}

describe('buildFeatureVector', () => {
  test('builds correct features for a typical apartment', () => {
    const property = makeProperty()
    const features = buildFeatureVector(
      property,
      TEST_COEFFICIENTS.featureNames,
    )

    expect(features.sqm).toBe(60)
    expect(features.rooms).toBe(2)
    expect(features.floor).toBe(4)
    expect(features.monthly_fee).toBe(3_200)
    expect(features.lat).toBe(59.3171)
    expect(features.lng).toBe(18.0494)
    expect(features.property_type_apartment).toBe(1)
    expect(features.property_type_house).toBe(0)
    expect(features.property_type_townhouse).toBe(0)
  })

  test('handles house with no floor and no monthly fee', () => {
    const property = makeProperty({
      propertyType: 'house',
      floor: undefined,
      monthlyFee: undefined,
    })
    const features = buildFeatureVector(
      property,
      TEST_COEFFICIENTS.featureNames,
    )

    expect(features.floor).toBe(0)
    expect(features.monthly_fee).toBe(0)
    expect(features.property_type_house).toBe(1)
    expect(features.property_type_apartment).toBe(0)
  })

  test('handles missing construction year by defaulting to 1950', () => {
    const property = makeProperty({ constructionYear: undefined })
    const features = buildFeatureVector(
      property,
      TEST_COEFFICIENTS.featureNames,
    )

    const expectedAge = 1950 - 1800
    expect(features.log_construction_age).toBeCloseTo(
      Math.log(expectedAge),
      5,
    )
  })

  test('clamps construction age to at least 1', () => {
    const property = makeProperty({ constructionYear: 1800 })
    const features = buildFeatureVector(
      property,
      TEST_COEFFICIENTS.featureNames,
    )

    expect(features.log_construction_age).toBeCloseTo(Math.log(1), 5)
  })
})

describe('decomposePrice', () => {
  test('produces a valid decomposition for a typical Stockholm apartment', () => {
    const property = makeProperty()
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.askingPrice).toBe(4_950_000)
    expect(result.predictedPrice).toBeGreaterThan(0)
    expect(typeof result.priceDifference).toBe('number')
    expect(typeof result.priceDifferencePercent).toBe('number')

    // Components should exist with positive values
    expect(result.components.location.value).toBeGreaterThan(0)
    expect(result.components.features.value).toBeGreaterThan(0)
    expect(result.components.location.description).toContain('Stockholm')
    expect(result.components.features.description).toContain('60m')
    expect(result.components.features.description).toContain('2 rooms')
  })

  test('location + features percentages sum to 100', () => {
    const property = makeProperty()
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    const sum =
      result.components.location.percent + result.components.features.percent
    expect(sum).toBe(100)
  })

  test('priceDifference equals askingPrice - predictedPrice', () => {
    const property = makeProperty()
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.priceDifference).toBe(
      result.askingPrice - result.predictedPrice,
    )
  })

  test('confidence is "below" when asking price is much lower than predicted', () => {
    const predicted = getPredictedPrice()
    // Set asking price to 50% of predicted - well below the -5% threshold
    const belowPrice = Math.round(predicted * 0.5)
    const property = makeProperty({ price: belowPrice })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.confidence).toBe('below')
    expect(result.priceDifferencePercent).toBeLessThan(-5)
  })

  test('confidence is "above" when asking price is much higher than predicted', () => {
    const predicted = getPredictedPrice()
    // Set asking price to 200% of predicted - well above the +5% threshold
    const abovePrice = Math.round(predicted * 2)
    const property = makeProperty({ price: abovePrice })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.confidence).toBe('above')
    expect(result.priceDifferencePercent).toBeGreaterThan(5)
  })

  test('confidence is "at" when asking price is close to predicted', () => {
    const property = makeProperty()
    const initial = decomposePrice(property, TEST_COEFFICIENTS)

    const atProperty = makeProperty({ price: initial.predictedPrice })
    const result = decomposePrice(atProperty, TEST_COEFFICIENTS)

    expect(result.confidence).toBe('at')
    expect(Math.abs(result.priceDifferencePercent)).toBeLessThanOrEqual(5)
  })

  test('works with a house (no floor, no monthly fee)', () => {
    const property = makeProperty({
      propertyType: 'house',
      livingArea: 150,
      rooms: 5,
      floor: undefined,
      monthlyFee: undefined,
      price: 9_500_000,
      constructionYear: 1965,
      coordinates: { latitude: 59.338, longitude: 17.94 },
    })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.predictedPrice).toBeGreaterThan(0)
    expect(result.askingPrice).toBe(9_500_000)
    expect(result.components.location).toBeDefined()
    expect(result.components.features).toBeDefined()
  })

  test('handles edge case: zero living area', () => {
    const property = makeProperty({ livingArea: 0 })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.predictedPrice).toBeGreaterThan(0)
    expect(result.components.features.description).toContain('0m')
  })

  test('handles edge case: missing construction year defaults correctly', () => {
    const property = makeProperty({ constructionYear: undefined })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.predictedPrice).toBeGreaterThan(0)
  })

  test('residual description reflects direction', () => {
    const predicted = getPredictedPrice()

    // Below model
    const belowProperty = makeProperty({ price: Math.round(predicted * 0.5) })
    const belowResult = decomposePrice(belowProperty, TEST_COEFFICIENTS)
    expect(belowResult.components.residual.description).toBe(
      'Below model estimate',
    )

    // Above model
    const aboveProperty = makeProperty({ price: Math.round(predicted * 2) })
    const aboveResult = decomposePrice(aboveProperty, TEST_COEFFICIENTS)
    expect(aboveResult.components.residual.description).toBe(
      'Above model estimate',
    )
  })

  test('residual percent is based on asking price', () => {
    const property = makeProperty()
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    const expectedPercent = Math.round(
      (result.components.residual.value / property.price) * 100,
    )
    expect(result.components.residual.percent).toBe(expectedPercent)
  })

  test('handles townhouse property type correctly', () => {
    const property = makeProperty({ propertyType: 'townhouse' })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.predictedPrice).toBeGreaterThan(0)
    // Townhouse coefficient is 0.12 vs apartment 0.0
    // So townhouse predicted price should be higher
    const apartmentResult = decomposePrice(
      makeProperty({ propertyType: 'apartment' }),
      TEST_COEFFICIENTS,
    )
    expect(result.predictedPrice).toBeGreaterThan(
      apartmentResult.predictedPrice,
    )
  })

  test('singular room label for 1-room properties', () => {
    const property = makeProperty({ rooms: 1 })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.components.features.description).toContain('1 room')
    expect(result.components.features.description).not.toContain('1 rooms')
  })

  test('handles zero price without division error', () => {
    const property = makeProperty({ price: 0 })
    const result = decomposePrice(property, TEST_COEFFICIENTS)

    expect(result.askingPrice).toBe(0)
    expect(result.components.residual.percent).toBe(0)
    expect(Number.isFinite(result.components.residual.percent)).toBe(true)
  })
})
