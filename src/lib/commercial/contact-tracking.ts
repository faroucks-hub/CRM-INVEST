export type CommercialContactState = 'blocked' | 'unverified' | 'never_contacted' | 'awaiting_reply' | 'reply_received' | 'contacted'

export type EngagementSnapshot = {
  history_checked_at?: string | null
  outbound_count?: number | null
  inbound_count?: number | null
}

export function normalizeContactEmail(value: string) {
  return value.trim().toLowerCase()
}

export function isValidContactEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeContactEmail(value))
}

export function getCommercialContactState(engagement?: EngagementSnapshot | null, blocked = false): CommercialContactState {
  if (blocked) return 'blocked'
  if (!engagement?.history_checked_at) return 'unverified'
  const outbound = Number(engagement.outbound_count ?? 0)
  const inbound = Number(engagement.inbound_count ?? 0)
  if (!outbound && inbound) return 'awaiting_reply'
  if (!outbound) return 'never_contacted'
  if (inbound) return 'reply_received'
  return 'contacted'
}
