import { describe, expect, test } from 'bun:test'

import type { SoldProperty } from '@/types'

import type { ModelCoefficients } from '../coefficients'
import { evaluateModel } from '../model-accuracy'

const TEST_COEFFICIENTS: ModelCoefficients = {
  version: '3.0.0',
  createdAt: '2026-03-15T00:00:00',
  intercept: 15.1,
  coefficients: {
    sqm: 0.008,
    rooms: 0.032,
    floor: 0.009,
    log_construction_age: -0.08,
    monthly_fee: -0.000028,
    lat: 0.0,
    lng: 0.0,
    property_type_apartment: 0.0,
    property_type_house: 0.05,
    property_type_townhouse: 0.03,
    property_type_cottage: -0.10,
    property_type_plot: -0.30,
  },
  areaPremiums: { södermalm: 0.25 },
  featureMeans: {
    sqm: 65,
    rooms: 2.5,
    floor: 3,
    log_construction_age: 4.7,
    monthly_fee: 3200,
  },
  modelMaePercent: 19.5,
  areaStats: {
    södermalm: {
      medianSqmPrice: 82000,
      avgBidPremium: 8.5,
      transactionCount: 450,
    },
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

function makeSoldProperty(overrides: Partial<SoldProperty> = {}): SoldProperty {
  return {
    id: 's1',
    address: 'Hornsgatan 42',
    area: 'Södermalm',
    municipality: 'Stockholm',
    askingPrice: 4_500_000,
    soldPrice: 4_950_000,
    soldDate: '2026-02-15',
    livingArea: 60,
    rooms: 2,
    floor: 4,
    constructionYear: 1925,
    monthlyFee: 3_200,
    propertyType: 'apartment',
    coordinates: { latitude: 59.3171, longitude: 18.0494 },
    pricePerSqm: 82_500,
    bidPremium: 10.0,
    ...overrides,
  }
}

describe('evaluateModel', () => {
  test('returns zero stats for empty input', () => {
    const result = evaluateModel([], TEST_COEFFICIENTS)

    expect(result.totalProperties).toBe(0)
    expect(result.meanAbsoluteErrorPercent).toBe(0)
    expect(result.r2Score).toBe(0)
    expect(result.predictions).toHaveLength(0)
    expect(result.maePercent).toBe(0)
    expect(result.rSquared).toBe(0)
    expect(result.sampleSize).toBe(0)
  })

  test('produces predictions for each property', () => {
    const properties = [
      makeSoldProperty({ id: 's1' }),
      makeSoldProperty({ id: 's2', soldPrice: 5_200_000 }),
    ]
    const result = evaluateModel(properties, TEST_COEFFICIENTS)

    expect(result.totalProperties).toBe(2)
    expect(result.predictions).toHaveLength(2)
  })

  test('prediction contains all required fields', () => {
    const result = evaluateModel(
      [makeSoldProperty()],
      TEST_COEFFICIENTS,
    )
    const prediction = result.predictions[0]

    expect(prediction.property).toBeDefined()
    expect(prediction.predictedPrice).toBeGreaterThan(0)
    expect(prediction.actualPrice).toBe(4_950_000)
    expect(typeof prediction.error).toBe('number')
    expect(typeof prediction.errorPercent).toBe('number')
    expect(typeof prediction.absoluteErrorPercent).toBe('number')
  })

  test('error metrics are non-negative', () => {
    const result = evaluateModel(
      [makeSoldProperty()],
      TEST_COEFFICIENTS,
    )

    expect(result.meanAbsoluteErrorPercent).toBeGreaterThanOrEqual(0)
    expect(result.medianAbsoluteErrorPercent).toBeGreaterThanOrEqual(0)
  })

  test('within-X percentages are between 0 and 100', () => {
    const properties = [
      makeSoldProperty({ id: 's1' }),
      makeSoldProperty({ id: 's2', soldPrice: 5_200_000 }),
    ]
    const result = evaluateModel(properties, TEST_COEFFICIENTS)

    expect(result.within5Percent).toBeGreaterThanOrEqual(0)
    expect(result.within5Percent).toBeLessThanOrEqual(100)
    expect(result.within10Percent).toBeGreaterThanOrEqual(0)
    expect(result.within10Percent).toBeLessThanOrEqual(100)
    expect(result.within15Percent).toBeGreaterThanOrEqual(0)
    expect(result.within15Percent).toBeLessThanOrEqual(100)
  })

  test('within thresholds are ordered: 5% <= 10% <= 15%', () => {
    const properties = [
      makeSoldProperty({ id: 's1', soldPrice: 4_000_000 }),
      makeSoldProperty({ id: 's2', soldPrice: 4_500_000 }),
      makeSoldProperty({ id: 's3', soldPrice: 5_200_000, livingArea: 75, rooms: 3 }),
    ]
    const result = evaluateModel(properties, TEST_COEFFICIENTS)

    expect(result.within5Percent).toBeLessThanOrEqual(result.within10Percent)
    expect(result.within10Percent).toBeLessThanOrEqual(result.within15Percent)
  })

  test('bid premium stats are computed', () => {
    const properties = [
      makeSoldProperty({ id: 's1', bidPremium: 5.0 }),
      makeSoldProperty({ id: 's2', bidPremium: 15.0 }),
    ]
    const result = evaluateModel(properties, TEST_COEFFICIENTS)

    expect(result.meanBidPremium).toBe(10.0)
    expect(result.medianBidPremium).toBe(10.0)
  })

  test('deprecated aliases match primary fields', () => {
    const result = evaluateModel(
      [makeSoldProperty()],
      TEST_COEFFICIENTS,
    )

    expect(result.maePercent).toBe(result.meanAbsoluteErrorPercent)
    expect(result.rSquared).toBe(result.r2Score)
    expect(result.sampleSize).toBe(result.totalProperties)
  })

  test('R2 score is computed correctly for varied data', () => {
    const properties = [
      makeSoldProperty({ id: 's1', soldPrice: 4_000_000, livingArea: 50 }),
      makeSoldProperty({ id: 's2', soldPrice: 6_000_000, livingArea: 80 }),
      makeSoldProperty({ id: 's3', soldPrice: 5_000_000, livingArea: 65 }),
    ]
    const result = evaluateModel(properties, TEST_COEFFICIENTS)

    // R2 should be a finite number
    expect(Number.isFinite(result.r2Score)).toBe(true)
  })
})
