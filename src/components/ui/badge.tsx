import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--color-accent-blue)]/15 text-[var(--color-accent-blue)]',
  secondary: 'bg-[var(--color-surface-tertiary)] text-[var(--color-text-secondary)]',
  success: 'bg-[var(--color-accent-green)]/15 text-[var(--color-accent-green)]',
  warning: 'bg-[var(--color-accent-yellow)]/15 text-[var(--color-accent-yellow)]',
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
