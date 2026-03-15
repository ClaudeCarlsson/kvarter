import { readFile } from 'fs/promises'
import { resolve } from 'path'

export type ModelCoefficients = {
  version: string
  createdAt: string
  intercept: number
  coefficients: Record<string, number>
  featureNames: string[]
}

type RawCoefficientsJson = {
  version: string
  created_at: string
  intercept: number
  coefficients: Record<string, number>
  feature_names: string[]
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

    return {
      version: data.version,
      createdAt: data.created_at,
      intercept: data.intercept,
      coefficients: data.coefficients,
      featureNames: data.feature_names,
    }
  } catch {
    return null
  }
}
