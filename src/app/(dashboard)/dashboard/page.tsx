import Link from 'next/link'
import { Globe, TrendingUp, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { WebsiteLeadStatusBadge } from '@/components/website-leads/WebsiteLeadStatusBadge'

function startOfTodayISO() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function startOfMonthISO() {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const todayISO = startOfTodayISO()
  const monthISO = startOfMonthISO()

  const [
    totalLeadsResult,
    newLeadsResult,
    qualifiedLeadsResult,
    todayLeadsResult,
    monthLeadsResult,
    recentLeadsResult,
  ] = await Promise.all([
    supabase
      .from('website_leads')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('website_leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),

    supabase
      .from('website_leads')
      .select('id', { count: 'exact', head: true })
      .in('status', ['qualified', 'quotation', 'negotiation', 'won']),

    supabase
      .from('website_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayISO),

    supabase
      .from('website_leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthISO),

    supabase
      .from('website_leads')
      .select('id, created_at, full_name, company, email, country, source, status')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const totalLeads = totalLeadsResult.count ?? 0
  const newLeads = newLeadsResult.count ?? 0
  const qualifiedLeads = qualifiedLeadsResult.count ?? 0
  const todayLeads = todayLeadsResult.count ?? 0
  const monthLeads = monthLeadsResult.count ?? 0
  const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0
  const recentLeads = recentLeadsResult.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Vue d’ensemble commerciale et suivi des leads reçus depuis le site IME."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Website Leads Today</p>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-bold">{todayLeads}</div>
          <p className="mt-1 text-xs text-muted-foreground">Nouvelles demandes aujourd’hui</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Website Leads This Month</p>
            <Globe className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-bold">{monthLeads}</div>
          <p className="mt-1 text-xs text-muted-foreground">Demandes reçues ce mois</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">New Leads</p>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-bold">{newLeads}</div>
          <p className="mt-1 text-xs text-muted-foreground">À traiter dans Website Leads</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-3 text-3xl font-bold">{conversionRate}%</div>
          <p className="mt-1 text-xs text-muted-foreground">Leads qualifiés ou convertis</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <div>
              <h2 className="text-lg font-semibold">Recent Website Leads</h2>
              <p className="text-sm text-muted-foreground">Dernières demandes reçues depuis le site.</p>
            </div>

            <Link
              href="/website-leads"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Lead</th>
                  <th className="px-5 py-3">Country</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-t hover:bg-slate-50">
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Link
                          href={`/website-leads/${lead.id}`}
                          className="font-medium hover:text-blue-600 hover:underline"
                        >
                          {lead.full_name || 'Lead sans nom'}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {lead.company || '—'} · {lead.email || '—'}
                        </div>
                      </td>
                      <td className="px-5 py-3">{lead.country || '—'}</td>
                      <td className="px-5 py-3 capitalize">{lead.source || 'website'}</td>
                      <td className="px-5 py-3">
                        <WebsiteLeadStatusBadge status={lead.status || 'new'} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      Aucun lead reçu pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Lead Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivi rapide de la qualité des demandes entrantes.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Nouveaux leads</span>
                <span className="font-medium">{newLeads}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${totalLeads ? Math.min((newLeads / totalLeads) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>Leads qualifiés</span>
                <span className="font-medium">{qualifiedLeads}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{ width: `${totalLeads ? Math.min((qualifiedLeads / totalLeads) * 100, 100) : 0}%` }}
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Prochaine action :</strong> traiter les leads au statut New,
              puis convertir les demandes qualifiées en opportunités commerciales.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
