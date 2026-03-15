import { cn } from '@/lib/utils'

type Confidence = 'below' | 'at' | 'above'

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { label: string; color: string; symbol: string }
> = {
  below: {
    label: 'Below Estimate',
    color: 'bg-green-100 text-green-800',
    symbol: '\u2193',
  },
  at: {
    label: 'At Estimate',
    color: 'bg-amber-100 text-amber-800',
    symbol: '~',
  },
  above: {
    label: 'Above Estimate',
    color: 'bg-red-100 text-red-800',
    symbol: '\u2191',
  },
}

export function ConfidenceBadge({
  confidence,
  percent,
  className,
}: {
  confidence: Confidence
  percent: number
  className?: string
}) {
  const config = CONFIDENCE_CONFIG[confidence]
  const sign = percent > 0 ? '+' : ''

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.color,
        className,
      )}
    >
      <span aria-hidden="true">{config.symbol}</span>
      <span>
        {config.label} ({sign}
        {percent}%)
      </span>
    </span>
  )
}
