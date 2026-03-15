'use server'

import { loadCoefficients } from '@/lib/analytics'
import { evaluateModel } from '@/lib/analytics/model-accuracy'
import type { ModelAccuracyStats } from '@/lib/analytics/model-accuracy'
import { getDataSource } from '@/lib/data-source'
import type { SearchFilters, SoldProperty } from '@/types'

function applySoldFilters(
  properties: SoldProperty[],
  filters: SearchFilters,
): SoldProperty[] {
  let results = properties

  if (filters.priceRange?.min) {
    results = results.filter((p) => p.soldPrice >= filters.priceRange!.min!)
  }
  if (filters.priceRange?.max) {
    results = results.filter((p) => p.soldPrice <= filters.priceRange!.max!)
  }

  if (filters.roomsRange?.min) {
    results = results.filter((p) => p.rooms >= filters.roomsRange!.min!)
  }
  if (filters.roomsRange?.max) {
    results = results.filter((p) => p.rooms <= filters.roomsRange!.max!)
  }

  if (filters.areaRange?.min) {
    results = results.filter((p) => p.livingArea >= filters.areaRange!.min!)
  }
  if (filters.areaRange?.max) {
    results = results.filter((p) => p.livingArea <= filters.areaRange!.max!)
  }

  if (filters.propertyTypes && filters.propertyTypes.length > 0) {
    results = results.filter((p) => filters.propertyTypes!.includes(p.propertyType))
  }

  if (filters.maxMonthlyFee) {
    results = results.filter((p) => (p.monthlyFee ?? 0) <= filters.maxMonthlyFee!)
  }

  return results
}

export async function getModelAccuracy(
  area?: string,
  filters?: SearchFilters,
): Promise<ModelAccuracyStats | null> {
  const source = getDataSource()
  if (!source.getSoldProperties) return null

  const sold = await source.getSoldProperties(area)
  const filtered = filters ? applySoldFilters(sold, filters) : sold
  const coefficients = await loadCoefficients()
  if (!coefficients) return null

  return evaluateModel(filtered, coefficients)
}

export async function getSoldProperties(
  area?: string,
  filters?: SearchFilters,
): Promise<SoldProperty[]> {
  const source = getDataSource()
  if (!source.getSoldProperties) return []

  const sold = await source.getSoldProperties(area)
  return filters ? applySoldFilters(sold, filters) : sold
}
