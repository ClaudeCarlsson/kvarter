import { cn } from '@/lib/utils'
import type { Property } from '@/types'

type Dimension = {
  label: string
  getValue: (p: Property) => number
  higherIsBetter: boolean
}

const DIMENSIONS: Dimension[] = [
  {
    label: 'Value',
    getValue: (p) => p.pricePerSqm ? 1 / p.pricePerSqm * 100000 : 0,
    higherIsBetter: true,
  },
  {
    label: 'Size',
    getValue: (p) => p.livingArea,
    higherIsBetter: true,
  },
  {
    label: 'Rooms',
    getValue: (p) => p.rooms,
    higherIsBetter: true,
  },
  {
    label: 'Low Fee',
    getValue: (p) => p.monthlyFee ? 1 / p.monthlyFee * 10000 : 1,
    higherIsBetter: true,
  },
  {
    label: 'Newness',
    getValue: (p) => p.constructionYear ?? 1900,
    higherIsBetter: true,
  },
]

const COLORS = [
  'bg-[var(--color-accent-blue)]',
  'bg-[var(--color-accent-green)]',
  'bg-[var(--color-accent-yellow)]',
  'bg-[var(--color-primary)]',
  'bg-[var(--color-accent-red)]',
]

function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  return values.map((v) => ((v - min) / range) * 100)
}

export function RadarChart({ properties }: { properties: Property[] }) {
  if (properties.length === 0) return null

  const scores = DIMENSIONS.map((dim) => {
    const raw = properties.map((p) => dim.getValue(p))
    return normalize(raw)
  })

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Score Comparison</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {properties.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-sm', COLORS[i % COLORS.length])} />
            <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[120px]">{p.address}</span>
          </div>
        ))}
      </div>

      {/* Bar groups */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim, di) => (
          <div key={dim.label}>
            <div className="mb-1 text-xs font-medium text-[var(--color-text-muted)]">{dim.label}</div>
            <div className="space-y-1">
              {properties.map((p, pi) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="h-2 w-full rounded-full bg-[var(--color-surface-tertiary)]">
                    <div
                      className={cn('h-2 rounded-full transition-all', COLORS[pi % COLORS.length])}
                      style={{ width: `${Math.max(scores[di][pi], 2)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-mono text-[var(--color-text-muted)]">
                    {Math.round(scores[di][pi])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
