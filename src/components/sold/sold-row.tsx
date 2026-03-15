import type { ModelPrediction } from '@/lib/analytics/model-accuracy'
import { cn, formatPriceCompact } from '@/lib/utils'
import type { SoldProperty } from '@/types/sold'

function getErrorColor(absErrorPercent: number): string {
  if (absErrorPercent <= 5) return 'text-[var(--color-accent-green)]'
  if (absErrorPercent <= 10) return 'text-[var(--color-accent-yellow)]'
  return 'text-[var(--color-accent-red)]'
}

function getErrorBg(absErrorPercent: number): string {
  if (absErrorPercent <= 5) return 'bg-[var(--color-accent-green)]/10'
  if (absErrorPercent <= 10) return 'bg-[var(--color-accent-yellow)]/10'
  return 'bg-[var(--color-accent-red)]/10'
}

function getBidColor(bidPremium: number): string {
  if (bidPremium > 0) return 'text-[var(--color-accent-green)]'
  if (bidPremium < 0) return 'text-[var(--color-accent-red)]'
  return 'text-[var(--color-text-muted)]'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('sv-SE', {
    month: 'short',
    day: 'numeric',
  })
}

export function SoldRow({
  prediction,
}: {
  prediction: ModelPrediction
}) {
  const { property, predictedPrice, errorPercent, absoluteErrorPercent } = prediction
  const bidSign = property.bidPremium > 0 ? '+' : ''
  const errorSign = errorPercent > 0 ? '+' : ''

  return (
    <>
      {/* Desktop row */}
      <div className="hidden items-center gap-3 border-b border-[var(--color-border)] px-4 py-2.5 transition-colors hover:bg-[var(--color-surface-tertiary)] md:flex">
        {/* Address + Area */}
        <div className="min-w-[180px] flex-1">
          <div className="text-sm font-medium text-[var(--color-text-primary)]">
            {property.address}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {property.area}, {property.municipality}
          </div>
        </div>

        {/* Asking price */}
        <div className="w-28 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">Asking</div>
          <div className="text-sm font-mono text-[var(--color-text-secondary)]">
            {formatPriceCompact(property.askingPrice)}
          </div>
        </div>

        {/* Sold price */}
        <div className="w-28 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">Sold</div>
          <div className="text-sm font-mono font-semibold text-[var(--color-text-primary)]">
            {formatPriceCompact(property.soldPrice)}
          </div>
        </div>

        {/* Bid premium */}
        <div className="w-16 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">&Delta;</div>
          <div className={cn('text-sm font-mono font-medium', getBidColor(property.bidPremium))}>
            {bidSign}{property.bidPremium}%
          </div>
        </div>

        {/* Model predicted */}
        <div className="w-28 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">Model</div>
          <div className="text-sm font-mono text-[var(--color-text-secondary)]">
            {formatPriceCompact(predictedPrice)}
          </div>
        </div>

        {/* Model error */}
        <div className="w-20 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">Error</div>
          <div
            className={cn(
              'inline-block rounded px-1.5 py-0.5 text-sm font-mono font-medium',
              getErrorColor(absoluteErrorPercent),
              getErrorBg(absoluteErrorPercent),
            )}
          >
            {errorSign}{errorPercent}%
          </div>
        </div>

        {/* Date */}
        <div className="w-16 text-right">
          <div className="text-xs text-[var(--color-text-muted)]">Date</div>
          <div className="text-sm font-mono text-[var(--color-text-secondary)]">
            {formatDate(property.soldDate)}
          </div>
        </div>
      </div>

      {/* Mobile row -- stacked layout */}
      <div className="flex flex-col gap-1.5 border-b border-[var(--color-border)] px-4 py-3 transition-colors hover:bg-[var(--color-surface-tertiary)] md:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
              {property.address}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {property.area} &middot; {formatDate(property.soldDate)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-mono font-semibold text-[var(--color-text-primary)]">
              {formatPriceCompact(property.soldPrice)}
            </div>
            <div className={cn('text-xs font-mono', getBidColor(property.bidPremium))}>
              {bidSign}{property.bidPremium}%
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[var(--color-text-muted)]">
            Ask {formatPriceCompact(property.askingPrice)}
          </span>
          <span className="text-[var(--color-border-light)]">|</span>
          <span className="font-mono text-[var(--color-text-muted)]">
            Model {formatPriceCompact(predictedPrice)}
          </span>
          <span className="text-[var(--color-border-light)]">|</span>
          <span
            className={cn(
              'rounded px-1 py-0.5 font-mono font-medium',
              getErrorColor(absoluteErrorPercent),
              getErrorBg(absoluteErrorPercent),
            )}
          >
            {errorSign}{errorPercent}%
          </span>
        </div>
      </div>
    </>
  )
}

/**
 * Compact sold row for use in property detail sidebar.
 * Shows minimal info: address, sold price, date, bid premium.
 */
export function SoldRowCompact({
  property,
}: {
  property: SoldProperty
}) {
  const bidSign = property.bidPremium > 0 ? '+' : ''

  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)] py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">
          {property.address}
        </div>
        <div className="text-[10px] text-[var(--color-text-muted)]">
          {formatDate(property.soldDate)}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs font-mono font-medium text-[var(--color-text-secondary)]">
          {formatPriceCompact(property.soldPrice)}
        </span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-mono font-medium',
            getBidColor(property.bidPremium),
          )}
        >
          {bidSign}{property.bidPremium}%
        </span>
      </div>
    </div>
  )
}
