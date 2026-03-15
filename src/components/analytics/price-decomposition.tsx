import type { PriceDecomposition } from '@/lib/analytics'
import { cn, formatPrice, formatPriceCompact } from '@/lib/utils'

import { ConfidenceBadge } from './confidence-badge'

function PriceBar({
  label,
  value,
  percent,
  color,
  description,
}: {
  label: string
  value: number
  percent: number
  color: string
  description: string
}) {
  const clampedWidth = Math.min(Math.abs(percent), 100)

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-sm">
        <div>
          <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
          <span className="ml-2 text-[var(--color-text-muted)]">{description}</span>
        </div>
        <span className="ml-4 shrink-0 font-mono font-medium text-[var(--color-text-secondary)]">
          {formatPrice(Math.abs(value))} ({Math.abs(percent)}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--color-surface-tertiary)]">
        <div
          className={cn('h-2 rounded-full transition-all', color)}
          style={{ width: `${clampedWidth}%` }}
        />
      </div>
    </div>
  )
}

export function PriceDecompositionView({
  decomposition,
}: {
  decomposition: PriceDecomposition
}) {
  const {
    components,
    predictedPrice,
    predictionInterval,
    askingPrice,
    priceDifferencePercent,
    confidence,
    confidenceScore,
    comparables,
  } = decomposition

  return (
    <div className="space-y-6">
      {/* Summary with prediction interval */}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Estimated Value</p>
          <p className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {formatPriceCompact(predictionInterval.low)} &ndash; {formatPriceCompact(predictionInterval.high)}
          </p>
          <p className="text-[10px] font-mono text-[var(--color-text-muted)]">
            {Math.round(predictionInterval.confidence * 100)}% confidence &middot; point est. {formatPrice(predictedPrice)}
          </p>
        </div>
        <div className="text-[var(--color-text-muted)]">vs</div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Asking Price</p>
          <p className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {formatPrice(askingPrice)}
          </p>
        </div>
        <ConfidenceBadge
          confidence={confidence}
          percent={priceDifferencePercent}
          confidenceScore={confidenceScore}
          className="self-end"
        />
      </div>

      {/* 4-bar decomposition */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Price Breakdown (Shapley Attribution)
        </h3>
        <PriceBar
          label="Location"
          value={components.location.value}
          percent={components.location.percent}
          color="bg-[var(--color-accent-blue)]"
          description={components.location.description}
        />
        <PriceBar
          label="Features"
          value={components.features.value}
          percent={components.features.percent}
          color="bg-[var(--color-primary)]"
          description={components.features.description}
        />
        <PriceBar
          label="Condition"
          value={components.condition.value}
          percent={components.condition.percent}
          color="bg-[var(--color-accent-yellow)]"
          description={components.condition.description}
        />
        <PriceBar
          label="Market"
          value={components.market.value}
          percent={components.market.percent}
          color="bg-[var(--color-accent-green)]"
          description={components.market.description}
        />
        {components.residual.value !== 0 && (
          <PriceBar
            label="Residual"
            value={components.residual.value}
            percent={components.residual.percent}
            color={
              components.residual.value > 0 ? 'bg-[var(--color-accent-red)]' : 'bg-[var(--color-accent-green)]'
            }
            description={components.residual.description}
          />
        )}
      </div>

      {/* Comparable sales summary */}
      {comparables.count > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Comparable Sales
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Transactions
              </div>
              <div className="mt-0.5 text-sm font-mono font-bold text-[var(--color-text-primary)]">
                {comparables.count}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Median
              </div>
              <div className="mt-0.5 text-sm font-mono font-bold text-[var(--color-text-primary)]">
                {formatPriceCompact(comparables.medianPrice)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Range
              </div>
              <div className="mt-0.5 text-sm font-mono font-bold text-[var(--color-text-primary)]">
                {formatPriceCompact(comparables.priceRange.min)} &ndash; {formatPriceCompact(comparables.priceRange.max)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
