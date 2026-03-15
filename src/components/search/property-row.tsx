import Link from 'next/link'

import { ConfidenceBadge } from '@/components/analytics/confidence-badge'
import type { PriceDecomposition } from '@/lib/analytics'
import { PROPERTY_TYPE_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import type { Property } from '@/types'

export function PropertyRow({
  property,
  analysis,
}: {
  property: Property
  analysis?: PriceDecomposition | null
}) {
  return (
    <Link href={`/property/${property.id}`} className="group">
      {/* Desktop row */}
      <div className="hidden items-center gap-4 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-tertiary)] md:flex">
        {/* Address + Area */}
        <div className="min-w-[220px] flex-1">
          <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-blue)] transition-colors">
            {property.address}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {property.area}, {property.municipality}
          </div>
        </div>

        {/* Price */}
        <div className="w-32 text-right">
          <div className="text-sm font-mono font-semibold text-[var(--color-text-primary)]">
            {formatPrice(property.price)}
          </div>
          {property.pricePerSqm && (
            <div className="text-xs font-mono text-[var(--color-text-muted)]">
              {formatPrice(property.pricePerSqm)}/m&sup2;
            </div>
          )}
        </div>

        {/* Size */}
        <div className="w-20 text-center">
          <div className="text-sm font-mono">{property.livingArea} m&sup2;</div>
          <div className="text-xs text-[var(--color-text-muted)]">{property.rooms} rum</div>
        </div>

        {/* Type badge */}
        <div className="w-24">
          <span className="inline-block rounded bg-[var(--color-surface-tertiary)] px-2 py-0.5 text-xs text-[var(--color-text-secondary)]">
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </span>
        </div>

        {/* Monthly fee */}
        <div className="w-24 text-right text-xs font-mono text-[var(--color-text-muted)]">
          {property.monthlyFee ? formatPrice(property.monthlyFee) + '/mo' : '\u2014'}
        </div>

        {/* Days on market */}
        <div className="w-16 text-right">
          <span className={`text-xs font-mono ${property.daysOnMarket <= 3 ? 'text-[var(--color-accent-green)]' : property.daysOnMarket > 14 ? 'text-[var(--color-accent-yellow)]' : 'text-[var(--color-text-muted)]'}`}>
            {property.daysOnMarket}d
          </span>
        </div>

        {/* Analytics badge */}
        <div className="w-20">
          {analysis ? (
            <ConfidenceBadge confidence={analysis.confidence} percent={analysis.priceDifferencePercent} />
          ) : (
            <span />
          )}
        </div>

        {/* Arrow */}
        <div className="w-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
          &rarr;
        </div>
      </div>

      {/* Mobile row -- stacked layout */}
      <div className="flex flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-tertiary)] md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-blue)] transition-colors truncate">
              {property.address}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {property.area}, {property.municipality}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-mono font-semibold text-[var(--color-text-primary)]">
              {formatPrice(property.price)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="font-mono">{property.livingArea} m&sup2;</span>
          <span className="text-[var(--color-border-light)]">|</span>
          <span className="font-mono">{property.rooms} rum</span>
          <span className="text-[var(--color-border-light)]">|</span>
          <span className="inline-block rounded bg-[var(--color-surface-tertiary)] px-1.5 py-0.5 text-[var(--color-text-secondary)]">
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </span>
          <span className="text-[var(--color-border-light)]">|</span>
          <span className={`font-mono ${property.daysOnMarket <= 3 ? 'text-[var(--color-accent-green)]' : property.daysOnMarket > 14 ? 'text-[var(--color-accent-yellow)]' : ''}`}>
            {property.daysOnMarket}d
          </span>
          {property.pricePerSqm && (
            <>
              <span className="text-[var(--color-border-light)]">|</span>
              <span className="font-mono">{formatPrice(property.pricePerSqm)}/m&sup2;</span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
