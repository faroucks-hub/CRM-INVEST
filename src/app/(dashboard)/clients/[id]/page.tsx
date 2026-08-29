import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Pencil, Mail, Phone, MessageCircle, Globe, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui'
import { PageHeader } from '@/components/ui/page-header'
import { cn, formatDate, formatDateTime } from '@/lib/utils'
import {
  CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS,
  SECTOR_LABELS, LEAD_SOURCE_LABELS
} from '@/types'

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Fiche client' }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'commercial'
  const isPriv = role === 'admin' || role === 'lead_team'

  const { data: client, error } = await supabase
    .from('clients')
    .select(`
      *,
      assigned_user:users_profiles!clients_assigned_to_fkey(id, full_name)
    `)
    .eq('id', id)
    .single()

  if (error || !client) notFound()

  // Opportunités liées
  const { data: opps } = await supabase
    .from('opportunities')
    .select('id, name, stage, estimated_sell, currency, updated_at')
    .eq('client_id', id)
    .order('updated_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <PageHeader
            title={client.company_name}
            description={`${client.reference ? client.reference + ' · ' : ''}${client.country}${client.city ? ', ' + client.city : ''} · Créé le ${formatDate(client.created_at)}`}
            backHref="/clients"
            backLabel="Retour aux clients"
          />
          <Badge className={cn(
            CLIENT_STATUS_COLORS[client.status as keyof typeof CLIENT_STATUS_COLORS]
          )}>
            {CLIENT_STATUS_LABELS[client.status as keyof typeof CLIENT_STATUS_LABELS]}
          </Badge>
        </div>
        <Link href={`/clients/${id}/modifier`} className="btn btn-outline btn-sm">
          <Pencil className="w-3.5 h-3.5" />
          Modifier
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">

        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">

          {/* Informations générales */}
          <div className="card card-body space-y-4">
            <h2 className="text-sm font-semibold text-navy-900">Informations</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                { l: 'Secteur',   v: client.sector ? SECTOR_LABELS[client.sector as keyof typeof SECTOR_LABELS] : null },
                { l: 'Source',    v: client.lead_source ? LEAD_SOURCE_LABELS[client.lead_source as keyof typeof LEAD_SOURCE_LABELS] : null },
                { l: 'Devise',    v: client.currency_pref },
                { l: 'Commercial', v: (client as any).assigned_user?.full_name },
                { l: 'Conditions', v: client.payment_terms },
              ].map(({ l, v }) => v ? (
                <div key={l}>
                  <dt className="text-gray-400 text-xs">{l}</dt>
                  <dd className="text-gray-900 font-medium mt-0.5">{v}</dd>
                </div>
              ) : null)}
            </dl>
            {client.notes && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{client.notes}</p>
              </div>
            )}
            {isPriv && client.technical_notes && (
              <div className="border-t border-dashed border-gray-200 pt-3">
                <p className="text-xs text-amber-600 font-medium mb-1">Notes techniques (confidentiel)</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{client.technical_notes}</p>
              </div>
            )}
          </div>

          {/* Opportunités liées */}
          {opps && opps.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-sm font-semibold text-navy-900">
                  Opportunités ({opps.length})
                </h2>
                <Link href={`/opportunites/nouvelle?client=${id}`}
                  className="text-xs text-gold-500 hover:text-gold-400">
                  + Nouvelle
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {opps.map((opp: any) => (
                  <Link key={opp.id} href={`/opportunites/${opp.id}`}
                    className="flex items-center justify-between px-5 py-3
                               hover:bg-surface-100 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {opp.stage?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    {opp.estimated_sell && (
                      <div className="text-sm font-medium text-navy-900">
                        {opp.estimated_sell.toLocaleString()} {opp.currency}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar contact */}
        <div className="space-y-4">
          {/* Contact principal */}
          <div className="card card-body">
            <h2 className="text-sm font-semibold text-navy-900 mb-3">Contact principal</h2>
            {client.contact_name ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{client.contact_name}</p>
                  {client.contact_title && (
                    <p className="text-xs text-gray-400">{client.contact_title}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {client.contact_email && (
                    <Link href={`/messagerie?${new URLSearchParams({ to: client.contact_email, clientId: client.id, contactName: client.contact_name ?? '', company: client.company_name, language: client.communication_language ?? 'unknown' })}`}
                      className="flex items-center gap-2 text-sm text-blue-600
                                 hover:text-blue-800 transition-colors">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      {client.contact_email}
                    </Link>
                  )}
                  {client.contact_phone && (
                    <a href={`tel:${client.contact_phone}`}
                      className="flex items-center gap-2 text-sm text-gray-700
                                 hover:text-gray-900 transition-colors">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      {client.contact_phone}
                    </a>
                  )}
                  {client.contact_whatsapp && (
                    <a href={`https://wa.me/${client.contact_whatsapp.replace(/\D/g,'')}`}
                      target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-sm text-green-600
                                 hover:text-green-800 transition-colors">
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      {client.contact_whatsapp}
                    </a>
                  )}
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noopener"
                      className="flex items-center gap-2 text-sm text-gray-600
                                 hover:text-gray-900 transition-colors">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      Site web
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Aucun contact renseigné</p>
            )}
          </div>

          {/* Actions rapides */}
          <div className="card card-body space-y-2">
            <h2 className="text-sm font-semibold text-navy-900 mb-3">Actions rapides</h2>
            <Link
              href={`/opportunites/nouvelle?client=${id}`}
              className="btn btn-primary w-full justify-center"
            >
              Créer une opportunité
            </Link>
            {client.contact_whatsapp && (
              <a
                href={`https://wa.me/${client.contact_whatsapp.replace(/\D/g,'')}?text=Bonjour,`}
                target="_blank" rel="noopener"
                className="btn btn-outline w-full justify-center"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
          </div>

          {/* Métadonnées */}
          <div className="card card-body">
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Dernière modification</dt>
                <dd className="text-gray-700">{formatDate(client.updated_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Date de création</dt>
                <dd className="text-gray-700">{formatDate(client.created_at)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
