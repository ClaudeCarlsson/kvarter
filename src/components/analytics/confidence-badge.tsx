import { cn } from '@/lib/utils'

type Confidence = 'below' | 'at' | 'above'

const CONFIDENCE_CONFIG: Record<
  Confidence,
  { label: string; color: string; symbol: string }
> = {
  below: {
    label: 'Below Estimate',
    color: 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]',
    symbol: '\u2193',
  },
  at: {
    label: 'At Estimate',
    color: 'bg-[var(--color-accent-yellow)]/15 text-[var(--color-accent-yellow)]',
    symbol: '~',
  },
  above: {
    label: 'Above Estimate',
    color: 'bg-[var(--color-accent-red)]/15 text-[var(--color-accent-red)]',
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
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-medium',
        config.color,
        className,
      )}
    >
      <span aria-hidden="true">{config.symbol}</span>
      <span>
        {sign}{percent}%
      </span>
    </span>
  )
}
