import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Conditional + conflict-free Tailwind class merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as USD with no trailing cents when whole. */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Budget range for a job, e.g. "$4,000 – $7,000" or "$60 – $90/hr". */
export function formatBudget(
  min: number | null,
  max: number | null,
  type: 'fixed' | 'hourly',
): string {
  const suffix = type === 'hourly' ? '/hr' : ''
  if (min == null && max == null) return 'Budget TBD'
  if (min != null && max != null) return `${formatMoney(min)} – ${formatMoney(max)}${suffix}`
  return `${formatMoney(min ?? max)}${suffix}`
}

/** Relative time like "3 days ago" from an ISO string. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}
