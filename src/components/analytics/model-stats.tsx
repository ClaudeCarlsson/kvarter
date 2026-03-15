import type { ModelAccuracyStats } from '@/lib/analytics/model-accuracy'
import { cn } from '@/lib/utils'

function StatBox({
  label,
  value,
  description,
  variant = 'neutral',
}: {
  label: string
  value: string
  description?: string
  variant?: 'good' | 'warning' | 'bad' | 'neutral'
}) {
  const colorMap = {
    good: 'text-[var(--color-accent-green)]',
    warning: 'text-[var(--color-accent-yellow)]',
    bad: 'text-[var(--color-accent-red)]',
    neutral: 'text-[var(--color-text-primary)]',
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </div>
      <div className={cn('mt-1 text-xl font-mono font-bold', colorMap[variant])}>
        {value}
      </div>
      {description && (
        <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
          {description}
        </div>
      )}
    </div>
  )
}

function getMaeVariant(maePercent: number): 'good' | 'warning' | 'bad' {
  if (maePercent <= 5) return 'good'
  if (maePercent <= 10) return 'warning'
  return 'bad'
}

function getR2Variant(rSquared: number): 'good' | 'warning' | 'bad' {
  if (rSquared >= 0.85) return 'good'
  if (rSquared >= 0.7) return 'warning'
  return 'bad'
}

function getBidPremiumVariant(
  premium: number,
): 'good' | 'warning' | 'bad' | 'neutral' {
  if (premium > 0) return 'good'
  if (premium < -3) return 'bad'
  return 'neutral'
}

export function ModelStatsPanel({
  stats,
  className,
}: {
  stats: ModelAccuracyStats
  className?: string
}) {
  const bidSign = stats.meanBidPremium > 0 ? '+' : ''

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Model Performance
        </h2>
        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
          n={stats.totalProperties}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatBox
          label="MAE%"
          value={`${stats.meanAbsoluteErrorPercent}%`}
          description="Mean absolute error"
          variant={getMaeVariant(stats.meanAbsoluteErrorPercent)}
        />
        <StatBox
          label={`R\u00B2`}
          value={stats.r2Score.toFixed(2)}
          description="Coefficient of determination"
          variant={getR2Variant(stats.r2Score)}
        />
        <StatBox
          label="Within 5%"
          value={`${Math.round(stats.within5Percent)}%`}
          description="Predictions within 5% of actual"
          variant={stats.within5Percent >= 60 ? 'good' : stats.within5Percent >= 40 ? 'warning' : 'bad'}
        />
        <StatBox
          label="Within 10%"
          value={`${Math.round(stats.within10Percent)}%`}
          description="Predictions within 10% of actual"
          variant={stats.within10Percent >= 80 ? 'good' : stats.within10Percent >= 60 ? 'warning' : 'bad'}
        />
        <StatBox
          label="Mean Bid Premium"
          value={`${bidSign}${stats.meanBidPremium}%`}
          description="Avg sold vs asking"
          variant={getBidPremiumVariant(stats.meanBidPremium)}
        />
      </div>
    </div>
  )
}
