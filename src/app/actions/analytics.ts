'use server'

import { decomposePrice, loadCoefficients } from '@/lib/analytics'
import type { PriceDecomposition } from '@/lib/analytics'
import { MOCK_PROPERTIES } from '@/lib/booli/mock-data'

export async function getPropertyAnalysis(
  propertyId: string,
): Promise<PriceDecomposition | null> {
  const coefficients = await loadCoefficients()
  if (!coefficients) return null

  const property = MOCK_PROPERTIES.find((p) => p.id === propertyId)
  if (!property) return null

  return decomposePrice(property, coefficients)
}
