'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Mail, Phone } from 'lucide-react'
import { WebsiteLeadStatusBadge, WEBSITE_LEAD_STATUS_OPTIONS } from './WebsiteLeadStatusBadge'
import ContactEngagementBadge, { type ContactEngagement } from '@/components/commercial/ContactEngagementBadge'

type WebsiteLead = {
  id: string
  created_at: string
  full_name: string | null
  company: string | null
  email: string | null
  phone: string | null
  country: string | null
  message: string | null
  source: string | null
  status: string | null
  do_not_contact: boolean
  contact_engagement?: ContactEngagement | null
}

export default function WebsiteLeadsClient({
  leads,
}: {
  leads: WebsiteLead[]
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [contactStatus, setContactStatus] = useState('')

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return leads.filter((lead) => {
      const matchesStatus = !status || (lead.status || 'new') === status
      const engagement = lead.contact_engagement
      const matchesContact = !contactStatus
        || (contactStatus === 'unverified' && !engagement?.history_checked_at)
        || (contactStatus === 'never' && Boolean(engagement?.history_checked_at) && Number(engagement?.outbound_count ?? 0) === 0)
        || (contactStatus === 'contacted' && Number(engagement?.outbound_count ?? 0) > 0)
        || (contactStatus === 'replied' && Number(engagement?.inbound_count ?? 0) > 0)
        || (contactStatus === 'blocked' && lead.do_not_contact)

      const searchable = [
        lead.full_name,
        lead.company,
        lead.email,
        lead.phone,
        lead.country,
        lead.source,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)

      return matchesStatus && matchesContact && matchesQuery
    })
  }, [leads, query, status, contactStatus])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_200px_200px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher par nom, entreprise, email, téléphone..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
        >
          <option value="">All statuses</option>
          {WEBSITE_LEAD_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select value={contactStatus} onChange={(event) => setContactStatus(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20">
          <option value="">Tous les suivis</option>
          <option value="unverified">À vérifier</option>
          <option value="never">Jamais contactés</option>
          <option value="contacted">Déjà contactés</option>
          <option value="replied">Réponse reçue</option>
          <option value="blocked">Ne plus contacter</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Lead</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Pays</th>
              <th className="p-3">Source</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Suivi e-mail</th>
            </tr>
          </thead>

          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-t hover:bg-muted/50">
                <td className="p-3 whitespace-nowrap text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>

                <td className="p-3">
                  <Link
                    href={`/website-leads/${lead.id}`}
                    className="block rounded-md outline-none focus:ring-2 focus:ring-gold-400/40"
                  >
                    <span className="font-medium text-blue-600 hover:underline">
                      {lead.full_name || 'Sans nom'}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {lead.company || 'Entreprise non renseignée'}
                    </span>
                  </Link>
                </td>

                <td className="p-3">
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span>{lead.email || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{lead.phone || '—'}</span>
                    </div>
                  </div>
                </td>

                <td className="p-3">{lead.country || '—'}</td>
                <td className="p-3 capitalize">{lead.source || 'website'}</td>
                <td className="p-3">
                  <WebsiteLeadStatusBadge status={lead.status} />
                </td>
                <td className="p-3"><ContactEngagementBadge engagement={lead.contact_engagement} blocked={lead.do_not_contact} compact /></td>
              </tr>
            ))}

            {filteredLeads.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Aucun lead ne correspond à votre recherche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
