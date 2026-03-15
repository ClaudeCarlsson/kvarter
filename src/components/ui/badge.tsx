import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning'

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-blue-100 text-blue-800',
  secondary: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
