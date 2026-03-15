import type { Coordinates, Property, PropertyType } from '@/types'

import type { ModelCoefficients } from './coefficients'

export type PriceComponent = {
  value: number
  percent: number
  description: string
}

export type PredictionInterval = {
  low: number
  high: number
  confidence: number
}

export type ComparablesSummary = {
  count: number
  medianPrice: number
  priceRange: { min: number; max: number }
}

export type PriceDecomposition = {
  predictedPrice: number
  predictionInterval: PredictionInterval
  askingPrice: number
  priceDifference: number
  priceDifferencePercent: number
  components: {
    location: PriceComponent
    features: PriceComponent
    condition: PriceComponent
    market: PriceComponent
    residual: PriceComponent
  }
  comparables: ComparablesSummary
  confidence: 'undervalued' | 'fair' | 'overvalued'
  confidenceScore: number
}

/** Z-score for 80% confidence interval (two-tailed). */
const Z_80 = 1.28

/** Threshold percent for confidence labeling. */
const CONFIDENCE_THRESHOLD = 5

/**
 * Minimal shape required by buildFeatureVector.
 * Both Property and SoldProperty satisfy this.
 */
export type FeatureInput = {
  livingArea: number
  rooms: number
  floor?: number
  constructionYear?: number
  monthlyFee?: number
  propertyType: PropertyType
  coordinates: Coordinates
}

/**
 * Build the feature vector from a property-like object for the hedonic model.
 */
export function buildFeatureVector(
  property: FeatureInput,
  featureNames: string[],
): Record<string, number> {
  const constructionAge = Math.max(
    1,
    (property.constructionYear ?? 1950) - 1800,
  )

  const features: Record<string, number> = {
    sqm: property.livingArea,
    rooms: property.rooms,
    floor: property.floor ?? 0,
    log_construction_age: Math.log(constructionAge),
    monthly_fee: property.monthlyFee ?? 0,
    lat: property.coordinates.latitude,
    lng: property.coordinates.longitude,
  }

  for (const name of featureNames) {
    if (name.startsWith('property_type_')) {
      const type = name.replace('property_type_', '')
      features[name] = property.propertyType === type ? 1 : 0
    }
  }

  return features
}

/**
 * Compute Shapley-style decomposition of ln-price contributions.
 *
 * Instead of naive linear attribution, each feature's contribution is
 * centered around the population mean:
 *   contribution_i = coefficient_i * (feature_value_i - mean_i)
 *
 * This gives each feature a signed contribution relative to the average
 * property, which is the correct Shapley value for additive linear models.
 */
function shapleyDecompose(
  features: Record<string, number>,
  coefficients: Record<string, number>,
  featureMeans: Record<string, number>,
  areaPremium: number,
): {
  locationLn: number
  featureLn: number
  conditionLn: number
  marketLn: number
} {
  let locationLn = areaPremium
  let featureLn = 0
  let conditionLn = 0
  let marketLn = 0

  const LOCATION_FEATURES = new Set(['lat', 'lng'])
  const CONDITION_FEATURES = new Set(['log_construction_age'])
  const MARKET_FEATURES = new Set(['monthly_fee'])

  for (const [name, coef] of Object.entries(coefficients)) {
    const featureValue = features[name] ?? 0
    const meanValue = featureMeans[name] ?? 0

    // For binary/categorical features (property_type_*), mean is ~0,
    // so contribution is simply coef * indicator
    const contribution = name.startsWith('property_type_')
      ? coef * featureValue
      : coef * (featureValue - meanValue)

    if (LOCATION_FEATURES.has(name)) {
      locationLn += contribution
    } else if (CONDITION_FEATURES.has(name)) {
      conditionLn += contribution
    } else if (MARKET_FEATURES.has(name)) {
      marketLn += contribution
    } else {
      featureLn += contribution
    }
  }

  return { locationLn, featureLn, conditionLn, marketLn }
}

/**
 * Build a prediction interval from model MAE%.
 *
 * Uses a normal approximation:
 *   half_width = z * (MAE% / 100) * predicted_price
 *
 * For 80% CI, z = 1.28.
 */
function buildPredictionInterval(
  predictedPrice: number,
  maePercent: number,
): PredictionInterval {
  const halfWidth = Z_80 * (maePercent / 100) * predictedPrice
  return {
    low: Math.round(predictedPrice - halfWidth),
    high: Math.round(predictedPrice + halfWidth),
    confidence: 0.8,
  }
}

/**
 * Build a comparable-sales summary from area stats.
 *
 * When real comparables are unavailable, we synthesize a summary
 * from the area's median sqm price and the property's living area.
 */
function buildComparablesSummary(
  property: Property,
  coefficients: ModelCoefficients,
  predictedPrice: number,
): ComparablesSummary {
  const areaKey = property.area.toLowerCase()
  const areaStats = coefficients.areaStats[areaKey]

  if (areaStats && areaStats.transactionCount > 0) {
    const medianPrice = areaStats.medianSqmPrice * property.livingArea
    // Estimate a price range from the area stats spread
    const spreadFactor = 0.25
    return {
      count: areaStats.transactionCount,
      medianPrice: Math.round(medianPrice),
      priceRange: {
        min: Math.round(medianPrice * (1 - spreadFactor)),
        max: Math.round(medianPrice * (1 + spreadFactor)),
      },
    }
  }

  // Fallback: no area data available
  return {
    count: 0,
    medianPrice: Math.round(predictedPrice),
    priceRange: {
      min: Math.round(predictedPrice * 0.8),
      max: Math.round(predictedPrice * 1.2),
    },
  }
}

/**
 * Compute a confidence score (0-100) based on how much data backs the estimate.
 *
 * Factors:
 * - Area transaction count (more data = more confident)
 * - Model MAE% (lower error = more confident)
 * - Whether area premium is known
 */
function computeConfidenceScore(
  coefficients: ModelCoefficients,
  areaKey: string,
): number {
  const areaStats = coefficients.areaStats[areaKey]
  const hasAreaPremium = areaKey in coefficients.areaPremiums

  // Transaction count factor: 0-40 points
  // 500+ transactions = full 40, 0 transactions = 0
  const txCount = areaStats?.transactionCount ?? 0
  const txScore = Math.min(40, (txCount / 500) * 40)

  // MAE factor: 0-40 points
  // 0% MAE = full 40, 30%+ MAE = 0
  const maeScore = Math.max(0, 40 - (coefficients.modelMaePercent / 30) * 40)

  // Area premium known: 0 or 20 points
  const areaScore = hasAreaPremium ? 20 : 0

  return Math.round(txScore + maeScore + areaScore)
}

/**
 * Decompose a property's price into location, feature, condition, market,
 * and residual components using Shapley-value attribution with prediction
 * intervals derived from the model's MAE.
 *
 * The model predicts ln(price) = intercept + sum(coefficient * feature).
 * Predicted price = exp(ln_price).
 *
 * Shapley attribution centers each feature contribution around its population
 * mean, giving a fair decomposition for additive linear models.
 */
export function decomposePrice(
  property: Property,
  coefficients: ModelCoefficients,
): PriceDecomposition {
  const features = buildFeatureVector(property, coefficients.featureNames)

  // --- Compute predicted price ---
  let lnPrice = coefficients.intercept

  const areaKey = property.area.toLowerCase()
  const areaPremium = coefficients.areaPremiums?.[areaKey] ?? 0
  lnPrice += areaPremium

  for (const [name, coef] of Object.entries(coefficients.coefficients)) {
    const featureValue = features[name] ?? 0
    lnPrice += coef * featureValue
  }

  const predictedPrice = Math.exp(lnPrice)

  // --- Shapley decomposition ---
  const { locationLn, featureLn, conditionLn, marketLn } = shapleyDecompose(
    features,
    coefficients.coefficients,
    coefficients.featureMeans,
    areaPremium,
  )

  // Convert ln-space contributions to price shares using absolute values.
  const absLocation = Math.abs(locationLn)
  const absFeature = Math.abs(featureLn)
  const absCondition = Math.abs(conditionLn)
  const absMarket = Math.abs(marketLn)
  const absTotal = absLocation + absFeature + absCondition + absMarket

  // When all contributions are zero, distribute equally across components.
  const locationShare = absTotal !== 0 ? absLocation / absTotal : 0.25
  const featureShare = absTotal !== 0 ? absFeature / absTotal : 0.25
  const conditionShare = absTotal !== 0 ? absCondition / absTotal : 0.25
  const marketShare = absTotal !== 0 ? absMarket / absTotal : 0.25

  const locationValue = predictedPrice * locationShare
  const featureValue = predictedPrice * featureShare
  const conditionValue = predictedPrice * conditionShare
  const marketValue = predictedPrice * marketShare

  // --- Residual ---
  const residual = property.price - predictedPrice
  const priceDifference = property.price - predictedPrice
  const priceDifferencePercent = (priceDifference / predictedPrice) * 100

  // --- Prediction interval ---
  const predictionInterval = buildPredictionInterval(
    predictedPrice,
    coefficients.modelMaePercent,
  )

  // --- Comparables ---
  const comparables = buildComparablesSummary(
    property,
    coefficients,
    predictedPrice,
  )

  // --- Confidence label ---
  let confidence: 'undervalued' | 'fair' | 'overvalued'
  if (priceDifferencePercent < -CONFIDENCE_THRESHOLD) {
    confidence = 'undervalued'
  } else if (priceDifferencePercent > CONFIDENCE_THRESHOLD) {
    confidence = 'overvalued'
  } else {
    confidence = 'fair'
  }

  // --- Confidence score ---
  const confidenceScore = computeConfidenceScore(coefficients, areaKey)

  // --- Construction year description ---
  const ageDesc =
    property.constructionYear != null
      ? `Built ${property.constructionYear}`
      : 'Age unknown'

  // --- Market description ---
  const areaStats = coefficients.areaStats[areaKey]
  const marketDesc = areaStats
    ? `${areaStats.avgBidPremium > 0 ? '+' : ''}${areaStats.avgBidPremium}% avg bid premium`
    : 'Market conditions'

  return {
    predictedPrice: Math.round(predictedPrice),
    predictionInterval,
    askingPrice: property.price,
    priceDifference: Math.round(priceDifference),
    priceDifferencePercent: Math.round(priceDifferencePercent * 10) / 10,
    components: {
      location: {
        value: Math.round(locationValue),
        percent: Math.round(locationShare * 100),
        description: `${property.area}, ${property.municipality}`,
      },
      features: {
        value: Math.round(featureValue),
        percent: Math.round(featureShare * 100),
        description: `${property.livingArea}m², ${property.rooms} ${property.rooms === 1 ? 'room' : 'rooms'}`,
      },
      condition: {
        value: Math.round(conditionValue),
        percent: Math.round(conditionShare * 100),
        description: ageDesc,
      },
      market: {
        value: Math.round(marketValue),
        percent: Math.round(marketShare * 100),
        description: marketDesc,
      },
      residual: {
        value: Math.round(residual),
        percent:
          property.price !== 0
            ? Math.round((residual / property.price) * 100)
            : 0,
        description:
          residual > 0 ? 'Above model estimate' : 'Below model estimate',
      },
    },
    comparables,
    confidence,
    confidenceScore,
  }
}
