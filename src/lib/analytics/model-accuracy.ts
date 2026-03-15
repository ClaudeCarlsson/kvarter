import type { SoldProperty } from '@/types'

import type { ModelCoefficients } from './coefficients'
import { buildFeatureVector } from './decompose'

export type ModelPrediction = {
  property: SoldProperty
  predictedPrice: number
  actualPrice: number
  error: number
  errorPercent: number
  absoluteErrorPercent: number
}

export type ModelAccuracyStats = {
  totalProperties: number
  meanAbsoluteErrorPercent: number
  medianAbsoluteErrorPercent: number
  r2Score: number
  within5Percent: number
  within10Percent: number
  within15Percent: number
  predictions: ModelPrediction[]
  meanBidPremium: number
  medianBidPremium: number
  /** @deprecated Use meanAbsoluteErrorPercent */
  maePercent: number
  /** @deprecated Use r2Score */
  rSquared: number
  /** @deprecated Use totalProperties */
  sampleSize: number
}

/**
 * @deprecated Use ModelPrediction instead.
 * Kept for backward compatibility with UI components.
 */
export type SoldPropertyWithPrediction = SoldProperty & {
  predictedPrice: number
  modelErrorPercent: number
}

/**
 * Calculate the predicted price for a sold property using the hedonic model.
 * The model predicts ln(price) = intercept + sum(coefficient * feature).
 */
function predictPrice(
  property: SoldProperty,
  coefficients: ModelCoefficients,
): number {
  const features = buildFeatureVector(property, coefficients.featureNames)

  let lnPrice = coefficients.intercept
  for (const [name, coef] of Object.entries(coefficients.coefficients)) {
    const featureValue = features[name] ?? 0
    lnPrice += coef * featureValue
  }

  return Math.exp(lnPrice)
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Evaluate the hedonic model against actual sold prices.
 *
 * For each sold property:
 * 1. Build feature vector using the same logic as decomposePrice
 * 2. Calculate predicted price via the log-linear model
 * 3. Compare to actual sold price
 * 4. Aggregate error metrics (MAE%, median AE%, R2, within-X%)
 */
export function evaluateModel(
  soldProperties: SoldProperty[],
  coefficients: ModelCoefficients,
): ModelAccuracyStats {
  if (soldProperties.length === 0) {
    return {
      totalProperties: 0,
      meanAbsoluteErrorPercent: 0,
      medianAbsoluteErrorPercent: 0,
      r2Score: 0,
      within5Percent: 0,
      within10Percent: 0,
      within15Percent: 0,
      predictions: [],
      meanBidPremium: 0,
      medianBidPremium: 0,
      maePercent: 0,
      rSquared: 0,
      sampleSize: 0,
    }
  }

  const predictions: ModelPrediction[] = soldProperties.map((property) => {
    const predictedPrice = predictPrice(property, coefficients)
    const actualPrice = property.soldPrice
    const error = actualPrice - predictedPrice
    const errorPercent = (error / actualPrice) * 100
    const absoluteErrorPercent = Math.abs(errorPercent)

    return {
      property,
      predictedPrice: Math.round(predictedPrice),
      actualPrice,
      error: Math.round(error),
      errorPercent: Math.round(errorPercent * 100) / 100,
      absoluteErrorPercent: Math.round(absoluteErrorPercent * 100) / 100,
    }
  })

  const absoluteErrors = predictions.map((p) => p.absoluteErrorPercent)
  const meanAbsoluteErrorPercent =
    absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length
  const medianAbsoluteErrorPercent = median(absoluteErrors)

  // R-squared: 1 - SS_res / SS_tot
  const actualPrices = predictions.map((p) => p.actualPrice)
  const meanActual =
    actualPrices.reduce((sum, p) => sum + p, 0) / actualPrices.length

  const ssResidual = predictions.reduce(
    (sum, p) => sum + (p.actualPrice - p.predictedPrice) ** 2,
    0,
  )
  const ssTotal = actualPrices.reduce(
    (sum, price) => sum + (price - meanActual) ** 2,
    0,
  )

  const r2Score = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal

  const totalCount = predictions.length
  const within5Percent =
    (predictions.filter((p) => p.absoluteErrorPercent <= 5).length /
      totalCount) *
    100
  const within10Percent =
    (predictions.filter((p) => p.absoluteErrorPercent <= 10).length /
      totalCount) *
    100
  const within15Percent =
    (predictions.filter((p) => p.absoluteErrorPercent <= 15).length /
      totalCount) *
    100

  const bidPremiums = soldProperties.map((p) => p.bidPremium)
  const meanBidPremium =
    bidPremiums.reduce((sum, bp) => sum + bp, 0) / bidPremiums.length
  const medianBidPremium = median(bidPremiums)

  const roundedMae = Math.round(meanAbsoluteErrorPercent * 100) / 100
  const roundedR2 = Math.round(r2Score * 10000) / 10000

  return {
    totalProperties: totalCount,
    meanAbsoluteErrorPercent: roundedMae,
    medianAbsoluteErrorPercent:
      Math.round(medianAbsoluteErrorPercent * 100) / 100,
    r2Score: roundedR2,
    within5Percent: Math.round(within5Percent * 100) / 100,
    within10Percent: Math.round(within10Percent * 100) / 100,
    within15Percent: Math.round(within15Percent * 100) / 100,
    predictions,
    meanBidPremium: Math.round(meanBidPremium * 100) / 100,
    medianBidPremium: Math.round(medianBidPremium * 100) / 100,
    maePercent: roundedMae,
    rSquared: roundedR2,
    sampleSize: totalCount,
  }
}
