import type { Property } from '@/types'

import { PropertyRow } from './property-row'

export function PropertyList({ properties }: { properties: Property[] }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-hidden">
      {/* Table header -- desktop only */}
      <div className="hidden items-center gap-4 border-b border-[var(--color-border-light)] bg-[var(--color-surface-tertiary)] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)] md:flex">
        <div className="min-w-[220px] flex-1">Property</div>
        <div className="w-32 text-right">Price</div>
        <div className="w-20 text-center">Size</div>
        <div className="w-24">Type</div>
        <div className="w-24 text-right">Fee</div>
        <div className="w-16 text-right">Days</div>
        <div className="w-20">Analysis</div>
        <div className="w-4"></div>
      </div>
      {/* Rows */}
      {properties.map((property) => (
        <PropertyRow key={property.id} property={property} />
      ))}
    </div>
  )
}
