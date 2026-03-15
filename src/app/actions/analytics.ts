'use server'

import { decomposePrice, loadCoefficients } from '@/lib/analytics'
import type { PriceDecomposition } from '@/lib/analytics'
import { getDataSource } from '@/lib/data-source'

export async function getPropertyAnalysis(
  propertyId: string,
): Promise<PriceDecomposition | null> {
  const coefficients = await loadCoefficients()
  if (!coefficients) return null

  const source = getDataSource()
  const searchResult = await source.searchProperties({ query: propertyId })
  const property = searchResult.properties.find((p) => p.id === propertyId)
  if (!property) return null

  return decomposePrice(property, coefficients)
}
