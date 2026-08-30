import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Globe2,
  Mail,
  MessageSquareText,
  Phone,
  Sparkles,
  UserRound,
} from 'lucide-react'
import WebsiteLeadActions from '@/components/website-leads/WebsiteLeadActions'
import { WebsiteLeadStatusBadge } from '@/components/website-leads/WebsiteLeadStatusBadge'
import { createClient } from '@/lib/supabase/server'
import ContactEngagementBadge from '@/components/commercial/ContactEngagementBadge'

function formatDate(value?: string | null) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Mail
  label: string
  value?: string | null
  href?: string
}) {
  const displayValue = value || '—'

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3.5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-navy-700 shadow-sm ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        {href && value ? (
          <a
            href={href}
            className="mt-1 block break-words text-sm font-semibold text-navy-900 transition hover:text-gold-600"
          >
            {displayValue}
          </a>
        ) : (
          <p className="mt-1 break-words text-sm font-semibold text-navy-900">{displayValue}</p>
        )}
      </div>
    </div>
  )
}

export default async function WebsiteLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('website_leads')
    .select('*')
    .eq('id', id)
    .single()

  if (!lead) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user!.id).single()
  const canAssign = profile?.role === 'admin' || profile?.role === 'lead_team'
  const { data: users } = canAssign
    ? await supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name')
    : { data: [] }
  const { data: engagement } = lead.email
    ? await supabase.from('contact_engagements').select('*').eq('email_key', lead.email.trim().toLowerCase()).maybeSingle()
    : { data: null }

  const isConverted = Boolean(lead.converted_opportunity_id || lead.converted_at)

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6 pb-10">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-6 py-5 lg:px-8">
          <Link
            href="/website-leads"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-navy-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux leads
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-white shadow-sm">
                <UserRound className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate text-2xl font-bold tracking-tight text-navy-950 lg:text-3xl">
                    {lead.full_name || 'Website Lead'}
                  </h1>
                  <WebsiteLeadStatusBadge status={lead.status} />
                  <ContactEngagementBadge engagement={engagement} blocked={Boolean(lead.do_not_contact)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                    <Building2 className="h-4 w-4" />
                    {lead.company || 'Entreprise non renseignée'}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Reçu le {formatDate(lead.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              {lead.email && !lead.do_not_contact && <Link href={`/messagerie?to=${encodeURIComponent(lead.email)}&leadId=${lead.id}`} className="btn btn-primary"><Mail className="h-4 w-4" />Répondre par e-mail</Link>}
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Source</p>
                <p className="mt-1 text-sm font-semibold capitalize text-navy-900">{lead.source || 'website'}</p>
              </div>
              {isConverted && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Opportunité créée
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <main className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy-800">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy-950">Demande du prospect</h2>
                <p className="text-sm text-slate-500">Message transmis depuis le site IME</p>
              </div>
            </div>

            <div className="min-h-[220px] whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-[15px] leading-7 text-slate-700">
              {lead.message || 'Aucun message.'}
            </div>
          </section>

          {lead.internal_notes && (
            <section className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm lg:p-7">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-navy-950">Note interne</h2>
                  <p className="text-sm text-slate-500">Informations réservées à l'équipe commerciale</p>
                </div>
              </div>
              <div className="whitespace-pre-wrap rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm leading-7 text-slate-700">
                {lead.internal_notes}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-navy-950">Documents</h2>
                <p className="text-sm text-slate-500">Pièces jointes associées à cette demande</p>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-5 py-8 text-center">
              <FileText className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Aucun document associé</p>
              <p className="mt-1 text-xs text-slate-500">Les futurs fichiers du lead apparaîtront ici.</p>
            </div>
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-navy-950">Coordonnées</h2>
              <p className="mt-1 text-sm text-slate-500">Informations principales du prospect</p>
            </div>
            <div className="space-y-3">
              <InfoRow icon={Building2} label="Entreprise" value={lead.company} />
              <InfoRow icon={Mail} label="Email" value={lead.email} href={lead.email && !lead.do_not_contact ? `/messagerie?to=${encodeURIComponent(lead.email)}&leadId=${lead.id}` : undefined} />
              <InfoRow icon={Phone} label="Téléphone" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
              <InfoRow icon={Globe2} label="Pays" value={lead.country} />
              <InfoRow icon={CalendarDays} label="Date de réception" value={formatDate(lead.created_at)} />
            </div>
          </section>

          <WebsiteLeadActions
            leadId={lead.id}
            status={lead.status}
            internalNotes={lead.internal_notes}
            isConverted={isConverted}
            assignedTo={lead.assigned_to}
            doNotContact={Boolean(lead.do_not_contact)}
            users={users ?? []}
            canAssign={canAssign}
          />
        </aside>
      </div>
    </div>
  )
}
