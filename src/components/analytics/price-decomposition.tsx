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
          <span className="font-medium text-gray-900">{label}</span>
          <span className="ml-2 text-gray-500">{description}</span>
        </div>
        <span className="ml-4 shrink-0 font-medium text-gray-900">
          {formatPrice(Math.abs(value))} ({Math.abs(percent)}%)
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-100">
        <div
          className={cn('h-3 rounded-full transition-all', color)}
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
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-sm text-gray-500">Model Estimate</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrice(predictedPrice)}
          </p>
        </div>
        <div className="text-gray-300">vs</div>
        <div>
          <p className="text-sm text-gray-500">Asking Price</p>
          <p className="text-2xl font-bold text-gray-900">
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
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Price Breakdown
        </h3>
        <PriceBar
          label="Location"
          value={components.location.value}
          percent={components.location.percent}
          color="bg-blue-500"
          description={components.location.description}
        />
        <PriceBar
          label="Features"
          value={components.features.value}
          percent={components.features.percent}
          color="bg-indigo-500"
          description={components.features.description}
        />
        {components.residual.value !== 0 && (
          <PriceBar
            label="Residual"
            value={components.residual.value}
            percent={components.residual.percent}
            color={
              components.residual.value > 0 ? 'bg-red-400' : 'bg-green-400'
            }
            description={components.residual.description}
          />
        )}
      </div>
    </div>
  )
}
