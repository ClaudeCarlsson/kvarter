import type { Coordinates, Property, PropertyType } from '@/types'

import type { ModelCoefficients } from './coefficients'

export type PriceComponent = {
  value: number
  percent: number
  description: string
}

export type PriceDecomposition = {
  predictedPrice: number
  askingPrice: number
  priceDifference: number
  priceDifferencePercent: number
  components: {
    location: PriceComponent
    features: PriceComponent
    residual: PriceComponent
  }
  confidence: 'below' | 'at' | 'above'
}

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
 * Decompose a property's price into location, feature, and residual components
 * using the hedonic model coefficients.
 *
 * The model predicts ln(price) = intercept + sum(coefficient * feature).
 * Predicted price = exp(ln_price).
 */
export function decomposePrice(
  property: Property,
  coefficients: ModelCoefficients,
): PriceDecomposition {
  const features = buildFeatureVector(property, coefficients.featureNames)

  let lnPrice = coefficients.intercept
  let locationLnContribution = 0
  let featureLnContribution = 0

  for (const [name, coef] of Object.entries(coefficients.coefficients)) {
    const featureValue = features[name] ?? 0
    const contribution = coef * featureValue

    lnPrice += contribution

    if (name === 'lat' || name === 'lng') {
      locationLnContribution += contribution
    } else {
      featureLnContribution += contribution
    }
  }

  const predictedPrice = Math.exp(lnPrice)
  const priceDifference = property.price - predictedPrice
  const priceDifferencePercent = (priceDifference / predictedPrice) * 100

  // Convert ln-space contributions to price-space using absolute values
  // so shares are always non-negative even when some contributions are negative.
  const absLocation = Math.abs(locationLnContribution)
  const absFeature = Math.abs(featureLnContribution)
  const absTotal = absLocation + absFeature
  const locationShare = absTotal !== 0 ? absLocation / absTotal : 0.5
  const featureShare = 1 - locationShare

  const locationValue = predictedPrice * locationShare
  const featureValue = predictedPrice * featureShare
  const residual = property.price - predictedPrice

  let confidence: 'below' | 'at' | 'above'
  if (priceDifferencePercent < -CONFIDENCE_THRESHOLD) {
    confidence = 'below'
  } else if (priceDifferencePercent > CONFIDENCE_THRESHOLD) {
    confidence = 'above'
  } else {
    confidence = 'at'
  }

  return {
    predictedPrice: Math.round(predictedPrice),
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
    confidence,
  }
}
