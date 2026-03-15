import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PriceDecompositionView } from '@/components/analytics/price-decomposition'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { decomposePrice, loadCoefficients } from '@/lib/analytics'
import { MOCK_PROPERTIES } from '@/lib/booli/mock-data'
import { PROPERTY_TYPE_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'

type PropertyDetailParams = {
  params: Promise<{ id: string }>
}

export default async function PropertyDetailPage({
  params,
}: PropertyDetailParams) {
  const { id } = await params
  const property = MOCK_PROPERTIES.find((p) => p.id === id)

  if (!property) {
    notFound()
  }

  const coefficients = await loadCoefficients()
  const decomposition = coefficients
    ? decomposePrice(property, coefficients)
    : null

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Back link */}
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to search
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="relative mb-4 h-64 overflow-hidden rounded-xl bg-gray-100 sm:h-80">
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg
              className="h-20 w-20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div className="absolute left-3 top-3 flex gap-2">
            <Badge variant="secondary">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </Badge>
            {property.daysOnMarket <= 3 && (
              <Badge variant="success">New</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {property.address}
            </h1>
            <p className="text-gray-500">
              {property.area}, {property.municipality}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {formatPrice(property.price)}
            </p>
            {property.pricePerSqm && (
              <p className="text-sm text-gray-400">
                {formatPrice(property.pricePerSqm)}/m&sup2;
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Analytics */}
        <div className="space-y-6 lg:col-span-2">
          {/* Price Decomposition */}
          {decomposition && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Price Analysis
                </h2>
              </CardHeader>
              <CardContent>
                <PriceDecompositionView decomposition={decomposition} />
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {property.description && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  Description
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{property.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Property details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3">
                <DetailRow label="Living area" value={`${property.livingArea} m\u00B2`} />
                <DetailRow
                  label="Rooms"
                  value={`${property.rooms} ${property.rooms === 1 ? 'room' : 'rooms'}`}
                />
                {property.floor != null && (
                  <DetailRow
                    label="Floor"
                    value={
                      property.totalFloors
                        ? `${property.floor} of ${property.totalFloors}`
                        : String(property.floor)
                    }
                  />
                )}
                {property.constructionYear != null && (
                  <DetailRow
                    label="Construction year"
                    value={String(property.constructionYear)}
                  />
                )}
                {property.monthlyFee != null && (
                  <DetailRow
                    label="Monthly fee"
                    value={formatPrice(property.monthlyFee)}
                  />
                )}
                <DetailRow
                  label="Property type"
                  value={PROPERTY_TYPE_LABELS[property.propertyType]}
                />
                <DetailRow
                  label="Days on market"
                  value={`${property.daysOnMarket} ${property.daysOnMarket === 1 ? 'day' : 'days'}`}
                />
                <DetailRow
                  label="Coordinates"
                  value={`${property.coordinates.latitude.toFixed(4)}, ${property.coordinates.longitude.toFixed(4)}`}
                />
              </dl>
            </CardContent>
          </Card>

          {/* External link */}
          <Card>
            <CardContent className="pt-4">
              <a
                href={property.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                View on Booli
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2 last:border-0">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  )
}
