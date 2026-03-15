import Link from 'next/link'

import { ConfidenceBadge } from '@/components/analytics/confidence-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { PriceDecomposition } from '@/lib/analytics'
import { PROPERTY_TYPE_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import type { Property } from '@/types'

export function PropertyCard({
  property,
  analysis,
}: {
  property: Property
  analysis?: PriceDecomposition | null
}) {
  return (
    <Link href={`/property/${property.id}`}>
      <Card className="group overflow-hidden transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="relative h-48 bg-gray-100">
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="absolute left-2 top-2 flex gap-1">
            <Badge variant="secondary">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </Badge>
            {property.daysOnMarket <= 3 && (
              <Badge variant="success">New</Badge>
            )}
          </div>
          {analysis && (
            <div className="absolute bottom-2 right-2">
              <ConfidenceBadge
                confidence={analysis.confidence}
                percent={analysis.priceDifferencePercent}
              />
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Address & Area */}
          <h3 className="font-semibold text-gray-900 truncate">
            {property.address}
          </h3>
          <p className="text-sm text-gray-500">
            {property.area}, {property.municipality}
          </p>

          {/* Details */}
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
            <span>{property.rooms} {property.rooms === 1 ? 'room' : 'rooms'}</span>
            <span className="text-gray-300">|</span>
            <span>{property.livingArea} m&sup2;</span>
            {property.floor && (
              <>
                <span className="text-gray-300">|</span>
                <span>Floor {property.floor}</span>
              </>
            )}
          </div>

          {/* Price */}
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(property.price)}
            </span>
            {property.pricePerSqm && (
              <span className="text-xs text-gray-400">
                {formatPrice(property.pricePerSqm)}/m&sup2;
              </span>
            )}
          </div>

          {/* Monthly fee */}
          {property.monthlyFee && (
            <p className="mt-1 text-xs text-gray-400">
              Monthly fee: {formatPrice(property.monthlyFee)}
            </p>
          )}

          {/* Days on market */}
          <p className="mt-2 text-xs text-gray-400">
            {property.daysOnMarket} {property.daysOnMarket === 1 ? 'day' : 'days'} on market
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
