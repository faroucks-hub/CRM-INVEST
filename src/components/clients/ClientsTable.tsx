'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Eye, Pencil, Archive, Trash2, Phone, Mail, MessageCircle, MoreHorizontal } from 'lucide-react'
import { Badge, EmptyState, ConfirmDialog } from '@/components/ui'
import { cn, formatDate, formatRelativeDate } from '@/lib/utils'
import { archiveClientAction, deleteClientAction } from '@/lib/actions/clients'
import { toast } from 'sonner'
import type { UserRole } from '@/types'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS, SECTOR_LABELS } from '@/types'

interface ClientsTableProps {
  clients: any[]
  role: UserRole
}

export default function ClientsTable({ clients, role }: ClientsTableProps) {
  const [confirmArchive, setConfirmArchive] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const isAdmin = role === 'admin'
  const isPriv  = role === 'admin' || role === 'lead_team'

  async function handleArchive(id: string) {
    setLoading(true)
    const res = await archiveClientAction(id)
    setLoading(false)
    setConfirmArchive(null)
    if (res?.error) toast.error(res.error)
    else toast.success('Client archivé')
  }

  async function handleDelete(id: string) {
    setLoading(true)
    const res = await deleteClientAction(id)
    setLoading(false)
    setConfirmDelete(null)
    if (res && 'error' in res) toast.error(res.error)
  }

  if (!clients.length) {
    return (
      <EmptyState
        icon={<span className="text-xl">👥</span>}
        title="Aucun client trouvé"
        description="Modifiez vos filtres ou créez votre premier client."
        action={
          <Link href="/clients/nouveau" className="btn btn-primary btn-sm">
            Ajouter un client
          </Link>
        }
      />
    )
  }

  return (
    <>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Statut</th>
              <th>Secteur</th>
              <th>Pays</th>
              <th>Contact</th>
              <th>Commercial</th>
              <th>Dernière activité</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                {/* Entreprise */}
                <td>
                  <div className="flex flex-col">
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-navy-900 hover:text-gold-500
                                 transition-colors"
                    >
                      {client.company_name}
                    </Link>
                    {client.reference && (
                      <span className="text-xs text-gray-400">{client.reference}</span>
                    )}
                  </div>
                </td>

                {/* Statut */}
                <td>
                  <Badge className={cn(
                    'text-xs',
                    CLIENT_STATUS_COLORS[client.status as keyof typeof CLIENT_STATUS_COLORS]
                  )}>
                    {CLIENT_STATUS_LABELS[client.status as keyof typeof CLIENT_STATUS_LABELS] ?? client.status}
                  </Badge>
                </td>

                {/* Secteur */}
                <td className="text-gray-600 text-sm">
                  {client.sector
                    ? SECTOR_LABELS[client.sector as keyof typeof SECTOR_LABELS] ?? client.sector
                    : <span className="text-gray-300">—</span>
                  }
                </td>

                {/* Pays / Ville */}
                <td className="text-gray-600 text-sm">
                  <div>{client.country}</div>
                  {client.city && (
                    <div className="text-xs text-gray-400">{client.city}</div>
                  )}
                </td>

                {/* Contact */}
                <td>
                  {client.contact_name ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-900">{client.contact_name}</span>
                      <div className="flex items-center gap-2">
                        {client.contact_email && (
                          <a href={`mailto:${client.contact_email}`}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                            title={client.contact_email}>
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {client.contact_phone && (
                          <a href={`tel:${client.contact_phone}`}
                            className="text-gray-400 hover:text-green-500 transition-colors"
                            title={client.contact_phone}>
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {client.contact_whatsapp && (
                          <a href={`https://wa.me/${client.contact_whatsapp.replace(/\D/g,'')}`}
                            target="_blank" rel="noopener"
                            className="text-gray-400 hover:text-green-500 transition-colors"
                            title="WhatsApp">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-sm">—</span>
                  )}
                </td>

                {/* Commercial */}
                <td className="text-sm text-gray-600">
                  {client.assigned_user?.full_name ?? <span className="text-gray-300">—</span>}
                </td>

                {/* Date */}
                <td className="text-xs text-gray-400">
                  {formatRelativeDate(client.updated_at)}
                </td>

                {/* Actions */}
                <td>
                  <div className="flex items-center justify-end gap-1 relative">
                    <Link
                      href={`/clients/${client.id}`}
                      className="btn-icon" title="Voir"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/clients/${client.id}/modifier`}
                      className="btn-icon" title="Modifier"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    {isPriv && (
                      <div className="relative">
                        <button
                          className="btn-icon"
                          onClick={() => setOpenMenu(openMenu === client.id ? null : client.id)}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {openMenu === client.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white
                                           rounded-lg border border-gray-100 shadow-lg z-20
                                           overflow-hidden animate-fade-up">
                              <button
                                onClick={() => { setConfirmArchive(client.id); setOpenMenu(null) }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm
                                           text-gray-700 hover:bg-gray-50"
                              >
                                <Archive className="w-3.5 h-3.5 text-gray-400" />
                                Archiver
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => { setConfirmDelete(client.id); setOpenMenu(null) }}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm
                                             text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => confirmArchive && handleArchive(confirmArchive)}
        title="Archiver ce client ?"
        message="Le client sera masqué de la liste principale. Vous pouvez le restaurer depuis les archives."
        confirmLabel="Archiver"
        loading={loading}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Supprimer définitivement ?"
        message="Cette action est irréversible. Toutes les données liées seront supprimées."
        confirmLabel="Supprimer"
        danger
        loading={loading}
      />
    </>
  )
}
