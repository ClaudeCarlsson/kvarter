'use server'

import { loadCoefficients } from '@/lib/analytics'
import { evaluateModel } from '@/lib/analytics/model-accuracy'
import type { ModelAccuracyStats } from '@/lib/analytics/model-accuracy'
import { getDataSource } from '@/lib/data-source'
import type { SoldProperty } from '@/types'

export async function getModelAccuracy(
  area?: string,
): Promise<ModelAccuracyStats | null> {
  const source = getDataSource()
  if (!source.getSoldProperties) return null

  const sold = await source.getSoldProperties(area)
  const coefficients = await loadCoefficients()
  if (!coefficients) return null

  return evaluateModel(sold, coefficients)
}

export async function getSoldProperties(
  area?: string,
): Promise<SoldProperty[]> {
  const source = getDataSource()
  if (!source.getSoldProperties) return []

  return source.getSoldProperties(area)
}
