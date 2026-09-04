'use client'

import Link from 'next/link'
import {
  ArrowDownLeft, ArrowUpRight, Building2, CalendarClock, ExternalLink, Mail,
  MapPin, Pencil, Phone, UserRound, UsersRound, X,
} from 'lucide-react'
import ContactEngagementBadge, { type ContactEngagement } from './ContactEngagementBadge'

export type CommercialContactRecord = {
  id: string
  kind: 'client' | 'lead'
  name: string
  company?: string | null
  contactName?: string | null
  contactTitle?: string | null
  email?: string | null
  phone?: string | null
  country?: string | null
  city?: string | null
  statusLabel: string
  source?: string | null
  owner?: string | null
  summary?: string | null
  engagement?: ContactEngagement | null
  blocked?: boolean
  nextTask?: {
    title: string
    due_date?: string | null
    priority?: string | null
    assigned_name?: string | null
  } | null
  touchpoints?: Array<{
    id: string
    direction: 'outbound' | 'inbound'
    channel: 'email' | 'phone' | 'meeting' | 'note'
    outcome: 'completed' | 'received' | 'failed'
    occurred_at: string
    subject?: string | null
    user_name?: string | null
  }>
  mailHref?: string | null
  detailHref: string
}

const channelLabels = { email: 'E-mail', phone: 'Téléphone', meeting: 'Réunion', note: 'Note' } as const
const outcomeLabels = { completed: 'Effectué', received: 'Reçu', failed: 'Échec' } as const

function dateLabel(value?: string | null, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value || '—'}</dd></div>
}

export default function CommercialContactDrawer({
  record,
  onClose,
  onEdit,
}: {
  record: CommercialContactRecord | null
  onClose: () => void
  onEdit?: () => void
}) {
  if (!record) return null
  const engagement = record.engagement
  const location = [record.country, record.city].filter(Boolean).join(', ')

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`Suivi de ${record.name}`}>
      <button aria-label="Fermer" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl animate-slide-left">
        <header className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-600">Fiche de suivi commercial</p>
              <h2 className="mt-1 truncate text-xl font-bold text-navy-950">{record.name}</h2>
              {record.company && record.company !== record.name && <p className="mt-0.5 truncate text-sm text-slate-500">{record.company}</p>}
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" title="Fermer"><X className="h-5 w-5" /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{record.statusLabel}</span>
            <ContactEngagementBadge engagement={engagement} blocked={record.blocked} />
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950"><UserRound className="h-4 w-4 text-gold-600" />Coordonnées</h3>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Info label="Contact" value={record.contactName} />
              <Info label="Fonction" value={record.contactTitle} />
              <Info label="Localisation" value={location} />
              <Info label="Responsable" value={record.owner} />
              <Info label="Source" value={record.source} />
            </dl>
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {record.email && <div className="flex items-center gap-2 text-sm text-slate-700"><Mail className="h-4 w-4 text-slate-400" /><span className="break-all">{record.email}</span></div>}
              {record.phone && <a href={`tel:${record.phone}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-navy-950"><Phone className="h-4 w-4 text-slate-400" />{record.phone}</a>}
              {location && <div className="flex items-center gap-2 text-sm text-slate-700"><MapPin className="h-4 w-4 text-slate-400" />{location}</div>}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950"><UsersRound className="h-4 w-4 text-gold-600" />Détail des contacts</h3>
            {record.touchpoints?.length ? (
              <ol className="space-y-3">
                {record.touchpoints.map(point => (
                  <li key={point.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        {point.direction === 'outbound' ? <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" /> : <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />}
                        <span>{point.direction === 'outbound' ? 'Sortant' : 'Entrant'}</span>
                        <span className="text-slate-300">•</span>
                        <span>{channelLabels[point.channel] ?? point.channel}</span>
                        <span className="text-slate-300">•</span>
                        <span>{outcomeLabels[point.outcome] ?? point.outcome}</span>
                      </div>
                      <time className="text-[11px] text-slate-500">{dateLabel(point.occurred_at, true)}</time>
                    </div>
                    {point.subject && <p className="mt-2 text-sm font-medium text-slate-800">{point.subject}</p>}
                    {point.user_name && <p className="mt-1 text-[11px] text-slate-500">Responsable : {point.user_name}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-slate-500">Aucun contact détaillé enregistré.</p>}
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950"><Building2 className="h-4 w-4 text-gold-600" />Résumé commercial</h3>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{record.summary?.trim() || 'Aucun résumé commercial renseigné.'}</p>
          </section>

          <section className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-navy-950"><CalendarClock className="h-4 w-4 text-gold-600" />Historique et prochaine action</h3>
            <dl className="grid grid-cols-2 gap-4">
              <Info label="Dernier contact" value={dateLabel(engagement?.last_contacted_at, true)} />
              <Info label="Dernière réponse" value={dateLabel(engagement?.last_reply_at, true)} />
              <Info label="E-mails envoyés" value={String(engagement?.outbound_count ?? 0)} />
              <Info label="Réponses reçues" value={String(engagement?.inbound_count ?? 0)} />
            </dl>
            {engagement?.last_subject && <div className="mt-4 border-t border-slate-100 pt-3"><Info label="Dernier objet" value={engagement.last_subject} /></div>}
            <div className={`mt-4 rounded-lg border p-3 ${record.nextTask ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wide ${record.nextTask ? 'text-amber-700' : 'text-red-700'}`}>Prochaine action</p>
              {record.nextTask ? <div className="mt-1.5"><p className="text-sm font-semibold text-slate-900">{record.nextTask.title}</p><p className="mt-1 text-xs text-slate-600">Échéance : {dateLabel(record.nextTask.due_date)}{record.nextTask.assigned_name ? ` · ${record.nextTask.assigned_name}` : ''}</p></div> : <p className="mt-1.5 text-sm font-medium text-red-800">Aucune relance planifiée.</p>}
            </div>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
          <Link href={record.detailHref} className="btn btn-outline btn-sm"><ExternalLink className="h-3.5 w-3.5" />Fiche complète</Link>
          {record.mailHref && !record.blocked && <Link href={record.mailHref} className="btn btn-outline btn-sm"><Mail className="h-3.5 w-3.5" />Écrire</Link>}
          {onEdit && <button onClick={onEdit} className="btn btn-primary btn-sm"><Pencil className="h-3.5 w-3.5" />Modifier</button>}
        </footer>
      </aside>
    </div>
  )
}
