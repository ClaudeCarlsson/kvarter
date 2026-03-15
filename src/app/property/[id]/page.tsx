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
    <div className="container mx-auto px-4 py-4">
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs text-[var(--color-accent-blue)] hover:text-[var(--color-primary)] transition-colors"
      >
        <svg
          className="h-3.5 w-3.5"
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

      {/* Header bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {property.address}
            </h1>
            <Badge variant="secondary">
              {PROPERTY_TYPE_LABELS[property.propertyType]}
            </Badge>
            {property.daysOnMarket <= 3 && (
              <Badge variant="success">New</Badge>
            )}
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {property.area}, {property.municipality}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {formatPrice(property.price)}
          </p>
          {property.pricePerSqm && (
            <p className="text-xs font-mono text-[var(--color-text-muted)]">
              {formatPrice(property.pricePerSqm)}/m&sup2;
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column: Analytics */}
        <div className="space-y-4 lg:col-span-2">
          {/* Price Decomposition */}
          {decomposition && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
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
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Description
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-text-secondary)]">{property.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Property details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Details</h2>
            </CardHeader>
            <CardContent>
              <dl className="space-y-0">
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
                className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-blue)] hover:text-[var(--color-primary)] transition-colors"
              >
                View on Booli
                <svg
                  className="h-3.5 w-3.5"
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
    <div className="flex justify-between border-b border-[var(--color-border)] py-2 last:border-0">
      <dt className="text-xs text-[var(--color-text-muted)]">{label}</dt>
      <dd className="text-xs font-mono font-medium text-[var(--color-text-secondary)]">{value}</dd>
    </div>
  )
}
