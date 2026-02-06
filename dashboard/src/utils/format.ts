import { format, formatDistanceToNow } from 'date-fns'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatConfidence(confidence: number | null): string {
  if (confidence === null) return 'N/A'
  return `${(confidence * 100).toFixed(0)}%`
}

export function getOutcomeColor(outcome: string | null): string {
  if (!outcome) return ''
  const lower = outcome.toLowerCase()
  if (lower.includes('approve') || lower === 'success') return 'approved'
  if (lower.includes('deny') || lower.includes('reject') || lower === 'failed') return 'denied'
  if (lower.includes('escalate') || lower.includes('review')) return 'escalate'
  if (lower.includes('override')) return 'override'
  return ''
}

export function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
