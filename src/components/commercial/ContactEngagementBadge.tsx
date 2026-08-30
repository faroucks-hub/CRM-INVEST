import { AlertTriangle, CheckCircle2, Clock3, MessageCircleReply } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCommercialContactState } from '@/lib/commercial/contact-tracking'

export type ContactEngagement = {
  email_key: string
  first_contacted_at?: string | null
  last_contacted_at?: string | null
  last_reply_at?: string | null
  outbound_count?: number | null
  inbound_count?: number | null
  history_checked_at?: string | null
  last_subject?: string | null
}

export default function ContactEngagementBadge({ engagement, blocked = false, compact = false }: { engagement?: ContactEngagement | null; blocked?: boolean; compact?: boolean }) {
  const state = getCommercialContactState(engagement, blocked)
  if (state === 'blocked') return <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700"><AlertTriangle className="h-3.5 w-3.5" />Ne plus contacter</span>
  if (state === 'unverified') return <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5" />À vérifier</span>
  const outbound = Number(engagement?.outbound_count ?? 0)
  const inbound = Number(engagement?.inbound_count ?? 0)
  if (state === 'awaiting_reply') return <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700"><MessageCircleReply className="h-3.5 w-3.5" />À répondre · {inbound}</span>
  if (state === 'never_contacted') return <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"><Clock3 className="h-3.5 w-3.5" />Jamais contacté</span>
  const date = engagement?.last_contacted_at ? new Date(engagement.last_contacted_at) : null
  const label = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: compact ? undefined : 'numeric' }) : 'date inconnue'
  return <span title={engagement?.last_subject || undefined} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', inbound ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800')}>
    {inbound ? <MessageCircleReply className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
    {inbound ? 'Réponse reçue' : 'Contacté'} · {outbound} · {label}
  </span>
}
