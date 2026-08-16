// ── Sprint 6 — Lydie AI ───────────────────────────────────────────

export type ContextType = 'commercial' | 'technique' | 'projet' | 'dashboard' | 'general'

export interface AiConversation {
  id:           string
  user_id:      string
  role:         'user' | 'assistant'
  message:      string
  response?:    string | null
  context_type: ContextType
  context_data?: Record<string, unknown>
  model?:       string
  tokens_used?: number | null
  session_id?:  string | null
  created_at:   string
}

export interface LydieUsageStat {
  user_id:            string
  full_name:          string
  role:               string
  messages_sent:      number
  sessions:           number
  commercial_queries: number
  technique_queries:  number
  projet_queries:     number
  last_used_at:       string | null
}

export const CONTEXT_LABELS: Record<ContextType, string> = {
  commercial: 'Commercial',
  technique:  'Technique',
  projet:     'Projets',
  dashboard:  'Dashboard',
  general:    'Général',
}

export const CONTEXT_ICONS: Record<ContextType, string> = {
  commercial: '💼',
  technique:  '⚡',
  projet:     '📋',
  dashboard:  '📊',
  general:    '💬',
}
