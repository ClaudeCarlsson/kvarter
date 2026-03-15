import { readFile } from 'fs/promises'
import { resolve } from 'path'

export type AreaStats = {
  medianSqmPrice: number
  avgBidPremium: number
  transactionCount: number
}

export type ModelCoefficients = {
  version: string
  createdAt: string
  intercept: number
  coefficients: Record<string, number>
  areaPremiums: Record<string, number>
  featureNames: string[]
  featureMeans: Record<string, number>
  modelMaePercent: number
  areaStats: Record<string, AreaStats>
}

type RawAreaStats = {
  median_sqm_price: number
  avg_bid_premium: number
  transaction_count: number
}

type RawCoefficientsJson = {
  version: string
  created_at: string
  intercept: number
  coefficients: Record<string, number>
  area_premiums?: Record<string, number>
  feature_names: string[]
  feature_means?: Record<string, number>
  model_mae_percent?: number
  area_stats?: Record<string, RawAreaStats>
}

/**
 * Load hedonic model coefficients from the local JSON file.
 * In production this would read from Redis or a shared volume.
 * Returns null when the file is missing or malformed.
 */
export async function loadCoefficients(
  filePath?: string,
): Promise<ModelCoefficients | null> {
  const target = filePath ?? resolve(process.cwd(), 'data/coefficients.json')

  try {
    const raw = await readFile(target, 'utf-8')
    const data: RawCoefficientsJson = JSON.parse(raw)

    const areaStats: Record<string, AreaStats> = {}
    if (data.area_stats) {
      for (const [key, rawStats] of Object.entries(data.area_stats)) {
        areaStats[key] = {
          medianSqmPrice: rawStats.median_sqm_price,
          avgBidPremium: rawStats.avg_bid_premium,
          transactionCount: rawStats.transaction_count,
        }
      }
    }

    return {
      version: data.version,
      createdAt: data.created_at,
      intercept: data.intercept,
      coefficients: data.coefficients,
      areaPremiums: data.area_premiums ?? {},
      featureNames: data.feature_names,
      featureMeans: data.feature_means ?? {},
      modelMaePercent: data.model_mae_percent ?? 0,
      areaStats,
    }
  } catch {
    return null
  }
}
