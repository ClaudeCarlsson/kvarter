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
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
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
      <h3 className="text-sm font-semibold text-gray-900">Score Comparison</h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {properties.map((p, i) => (
          <div key={p.id} className="flex items-center gap-1.5">
            <div className={cn('h-3 w-3 rounded-full', COLORS[i % COLORS.length])} />
            <span className="text-xs text-gray-600 truncate max-w-[120px]">{p.address}</span>
          </div>
        ))}
      </div>

      {/* Bar groups */}
      <div className="space-y-3">
        {DIMENSIONS.map((dim, di) => (
          <div key={dim.label}>
            <div className="mb-1 text-xs font-medium text-gray-500">{dim.label}</div>
            <div className="space-y-1">
              {properties.map((p, pi) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="h-2.5 w-full rounded-full bg-gray-100">
                    <div
                      className={cn('h-2.5 rounded-full transition-all', COLORS[pi % COLORS.length])}
                      style={{ width: `${Math.max(scores[di][pi], 2)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-gray-400">
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
