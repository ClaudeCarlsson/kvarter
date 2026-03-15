import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('sv-SE').format(price) + ' kr'
}

export function formatPriceCompact(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000
    return `${millions.toFixed(millions % 1 === 0 ? 0 : 1)}M kr`
  }
  return formatPrice(price)
}
