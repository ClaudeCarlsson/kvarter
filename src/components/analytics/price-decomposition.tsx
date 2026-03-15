import type { PriceDecomposition } from '@/lib/analytics'
import { cn, formatPrice } from '@/lib/utils'

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
  const { components, predictedPrice, askingPrice, priceDifferencePercent, confidence } =
    decomposition

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">Model Estimate</p>
          <p className="text-xl font-mono font-bold text-[var(--color-text-primary)]">
            {formatPrice(predictedPrice)}
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
          className="self-end"
        />
      </div>

      {/* Decomposition bars */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Price Breakdown
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
    </div>
  )
}
