import { describe, expect, test } from 'bun:test'
import { resolve } from 'path'

import { loadCoefficients } from '../coefficients'

const FIXTURE_PATH = resolve(process.cwd(), 'data/coefficients.json')

describe('loadCoefficients', () => {
  test('loads and parses the default coefficients file', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    expect(result!.version).toBeTruthy()
    expect(result!.createdAt).toBe('2026-03-15T00:00:00')
    expect(typeof result!.intercept).toBe('number')
    expect(typeof result!.coefficients).toBe('object')
    expect(result!.featureNames).toBeArray()
    expect(result!.featureNames.length).toBeGreaterThan(0)
  })

  test('maps snake_case JSON keys to camelCase', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    // created_at -> createdAt
    expect(result!.createdAt).toBeDefined()
    // feature_names -> featureNames
    expect(result!.featureNames).toBeDefined()
  })

  test('contains expected coefficient keys', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    const coefs = result!.coefficients
    expect(coefs.sqm).toBeDefined()
    expect(coefs.rooms).toBeDefined()
    expect(coefs.floor).toBeDefined()
    expect(coefs.log_construction_age).toBeDefined()
    expect(coefs.monthly_fee).toBeDefined()
    expect(coefs.lat).toBeDefined()
    expect(coefs.lng).toBeDefined()
  })

  test('featureNames matches coefficient keys', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    for (const name of result!.featureNames) {
      expect(result!.coefficients[name]).toBeDefined()
    }
  })

  test('returns null when file does not exist', async () => {
    const result = await loadCoefficients('/nonexistent/path/coefficients.json')

    expect(result).toBeNull()
  })

  test('returns null when file contains invalid JSON', async () => {
    // The resolve of a directory will cause a read error or parse error
    const result = await loadCoefficients(resolve(process.cwd(), 'src'))

    expect(result).toBeNull()
  })

  test('coefficient values are numeric', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    expect(typeof result!.intercept).toBe('number')
    for (const value of Object.values(result!.coefficients)) {
      expect(typeof value).toBe('number')
    }
  })

  test('uses default path when no argument provided', async () => {
    // This tests the default path resolution (process.cwd() + data/coefficients.json)
    const result = await loadCoefficients()

    // This should work since we have the file at data/coefficients.json
    expect(result).not.toBeNull()
    expect(result!.version).toBeTruthy()
  })

  test('loads feature_means as featureMeans', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    expect(result!.featureMeans).toBeDefined()
    expect(typeof result!.featureMeans).toBe('object')
    expect(result!.featureMeans.sqm).toBe(65.0)
    expect(result!.featureMeans.rooms).toBe(2.5)
    expect(result!.featureMeans.floor).toBe(3.0)
    expect(result!.featureMeans.log_construction_age).toBe(4.7)
    expect(result!.featureMeans.monthly_fee).toBe(3200)
  })

  test('loads model_mae_percent as modelMaePercent', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    expect(typeof result!.modelMaePercent).toBe('number')
    expect(result!.modelMaePercent).toBe(19.5)
  })

  test('loads area_stats with camelCase keys', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    expect(result!.areaStats).toBeDefined()

    // Check a known area
    const sodermalm = result!.areaStats['södermalm']
    expect(sodermalm).toBeDefined()
    expect(sodermalm.medianSqmPrice).toBe(82000)
    expect(sodermalm.avgBidPremium).toBe(8.5)
    expect(sodermalm.transactionCount).toBe(450)
  })

  test('area_stats covers all areas in area_premiums', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    const premiumKeys = Object.keys(result!.areaPremiums)
    const statsKeys = Object.keys(result!.areaStats)

    // Every area with a premium should have stats
    for (const key of premiumKeys) {
      expect(statsKeys).toContain(key)
    }
  })

  test('area stats values are all positive', async () => {
    const result = await loadCoefficients(FIXTURE_PATH)

    expect(result).not.toBeNull()
    for (const stats of Object.values(result!.areaStats)) {
      expect(stats.medianSqmPrice).toBeGreaterThan(0)
      expect(stats.avgBidPremium).toBeGreaterThanOrEqual(0)
      expect(stats.transactionCount).toBeGreaterThan(0)
    }
  })
})
