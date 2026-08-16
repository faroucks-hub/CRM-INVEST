'use client'

import { useState, useMemo } from 'react'
import { Plus, Download, FileDown, MoreVertical, XCircle, FolderKanban } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import ProformaForm from './ProformaForm'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import {
  deleteProformaAction,
  updateProformaAction,
  getProformaForPdfAction,
} from '@/lib/actions/proformas'
import { createProjectFromProformaAction } from '@/lib/actions/projects'
import { exportToCSV } from '@/lib/utils/export'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  PROFORMA_STATUS_LABELS,
  PROFORMA_STATUS_COLORS,
  type ProformaPaymentStatus,
  type Proforma,
} from '@/types/sprint3'
import { downloadProformaPDF } from '@/lib/pdf/quotation-pdf'

interface Props {
  proformas: Record<string, unknown>[]
  clients: { id: string; company_name: string; country: string }[]
  quotations: {
    id: string
    number: string
    client_id: string
    total_sell: number
    currency: string
  }[]
  users: { id: string; full_name: string }[]
  role: string
  isAdminOrLead: boolean
  currentUserId: string
  termsProfiles:{id:string;code:string;name:string;version:string;commercial_role:string;status:string;role_summary?:string|null}[]
}

type CurrencyTotals = {
  total: number
  received: number
  balance: number
}

export default function ProformasClient({
  proformas,
  clients,
  quotations,
  users,
  role,
  isAdminOrLead,
  currentUserId,
  termsProfiles,
}: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editProf, setEditProf] = useState<Proforma | null>(null)
  const [deleteTarget, setDelete] = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMenu, setActionMenu] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const filtered = useMemo(
    () =>
      proformas.filter((p) => {
        if (filterStatus && p.payment_status !== filterStatus) return false
        if (filterClient && p.client_id !== filterClient) return false
        return true
      }),
    [proformas, filterStatus, filterClient]
  )

  const totalsByCurrency = filtered.reduce<Record<string, CurrencyTotals>>((acc, p) => {
    const currency = String(p.currency ?? 'USD')

    if (!acc[currency]) {
      acc[currency] = {
        total: 0,
        received: 0,
        balance: 0,
      }
    }

    const totals = acc[currency]
    totals.total += Number(p.total_sell || 0)
    totals.received += Number(p.amount_received || 0)
    totals.balance += Number(p.balance_due || 0)

    return acc
  }, {} as Record<string, CurrencyTotals>)

  async function handlePDF(prof: Record<string, unknown>) {
    try {
      const result = await getProformaForPdfAction(String(prof.id))

      if (result.error) {
        toast.error(result.error)
        return
      }

      await downloadProformaPDF(result.data as unknown as Proforma)
      toast.success('PDF téléchargé')
    } catch {
      toast.error('Erreur PDF')
    }
  }

  async function handleCreateProject(row: Record<string, unknown>) {
    try {
      const result = await createProjectFromProformaAction(String(row.id))

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Projet créé automatiquement')
    } catch {
      toast.error('Erreur création projet')
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const r = await updateProformaAction(id, { payment_status: status })

    if (r.error) {
      toast.error(r.error)
      return
    }

    toast.success(`Statut → ${PROFORMA_STATUS_LABELS[status as ProformaPaymentStatus]}`)
    setActionMenu(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    const r = await deleteProformaAction(String(deleteTarget.id))
    setDeleting(false)

    if (r.error) {
      toast.error(r.error)
      return
    }

    toast.success('Proforma supprimée')
    setDelete(null)
  }

  function handleExport() {
    exportToCSV(
      filtered,
      [
        { key: 'number', header: 'Numéro' },
        {
          key: 'payment_status',
          header: 'Statut',
          format: (v) =>
            PROFORMA_STATUS_LABELS[v as ProformaPaymentStatus] ?? String(v),
        },
        {
          key: 'issued_date',
          header: 'Date',
          format: (v) => formatDate(String(v)),
        },
        { key: 'currency', header: 'Devise' },
        { key: 'total_sell', header: 'Total HT' },
        { key: 'amount_received', header: 'Reçu' },
        { key: 'balance_due', header: 'Solde' },
      ],
      'proformas_ime'
    )

    toast.success(`${filtered.length} proforma(s) exportée(s)`)
  }

  const canCreateProject = (status: unknown) =>
    [
      'payee',
      'paye',
      'payé',
      'partiellement_payee',
      'partiellement_paye',
      'partiellement_payé',
    ].includes(String(status))

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'number',
      header: 'Numéro',
      sortable: true,
      render: (row) => (
        <div>
          <div className="text-sm font-semibold text-navy-900">
            {String(row.number)}
          </div>
          <div className="text-2xs text-gray-400">
            {formatDate(String(row.issued_date))}
          </div>
          {Boolean((row.quotations_v2 as Record<string, unknown> | null)?.number) && (
            <div className="text-2xs text-blue-500">
              Réf: {(row.quotations_v2 as Record<string, unknown>).number as string}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      render: (row) => {
        const c = row.clients as Record<string, unknown> | null

        return (
          <div>
            <div className="text-sm font-medium">
              {(c?.company_name as string) ?? '—'}
            </div>
            <div className="text-xs text-gray-400">
              {(c?.country as string) ?? ''}
            </div>
          </div>
        )
      },
    },
    {
      key: 'payment_status',
      header: 'Statut paiement',
      render: (row) => {
        const s = String(row.payment_status) as ProformaPaymentStatus

        return (
          <StatusBadge
            label={PROFORMA_STATUS_LABELS[s] ?? s}
            color={PROFORMA_STATUS_COLORS[s]}
          />
        )
      },
    },
    {
      key: 'total_sell',
      header: 'Total HT',
      sortable: true,
      render: (row) => {
        const currency = String(row.currency ?? 'USD') as 'USD'

        return (
          <div>
            <div className="text-sm font-semibold text-navy-900">
              {formatCurrency(Number(row.total_sell), currency)}
            </div>

            {Number(row.amount_received) > 0 && (
              <div className="text-xs text-green-600">
                Reçu: {formatCurrency(Number(row.amount_received), currency)}
              </div>
            )}

            {Number(row.balance_due) > 0 && (
              <div className="text-xs text-red-500">
                Solde: {formatCurrency(Number(row.balance_due), currency)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'bank_name',
      header: 'Banque',
      render: (row) =>
        row.bank_name ? (
          <span className="text-xs text-gray-600">{String(row.bank_name)}</span>
        ) : (
          <span className="text-gray-300">—</span>
        ),
    },
    {
      key: 'assigned_to',
      header: 'Commercial',
      render: (row) => {
        const u = row.users_profiles as Record<string, unknown> | null

        return (
          <span className="text-xs text-gray-500">
            {(u?.full_name as string) ?? '—'}
          </span>
        )
      },
    },
    {
      key: 'valid_until',
      header: 'Validité',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {formatDate(String(row.valid_until))}
        </span>
      ),
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Factures Proformas</h1>
          <p className="page-subtitle">
            {filtered.length} document{filtered.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>

          {isAdminOrLead && (
            <button
              onClick={() => {
                setEditProf(null)
                setFormOpen(true)
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouvelle proforma
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.entries(totalsByCurrency) as [string, CurrencyTotals][]).map(([currency, totals]) => (
          <div key={currency} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-navy-900">{currency}</div>
              <div className="text-2xs text-gray-400">Devise</div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-2xs text-gray-400">Total facturé</div>
                <div className="text-lg font-semibold text-navy-900">
                  {formatCurrency(totals.total, currency as 'USD')}
                </div>
              </div>

              <div>
                <div className="text-2xs text-gray-400">Paiements reçus</div>
                <div className="text-sm font-medium text-green-700">
                  {formatCurrency(totals.received, currency as 'USD')}
                </div>
              </div>

              <div>
                <div className="text-2xs text-gray-400">Solde à recevoir</div>
                <div className="text-sm font-medium text-amber-600">
                  {formatCurrency(totals.balance, currency as 'USD')}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input w-auto text-sm h-9"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(PROFORMA_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>

        <select
          className="input w-auto text-sm h-9"
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
        >
          <option value="">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>

        {(filterStatus || filterClient) && (
          <button
            onClick={() => {
              setFilterStatus('')
              setFilterClient('')
            }}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            × Effacer
          </button>
        )}
      </div>

      <div className="card">
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher..."
          searchKeys={['number']}
          pageSize={25}
          emptyMessage="Aucune proforma"
          emptySubtext="Créez une proforma depuis une quotation approuvée"
          onRowClick={(row) => {
            setEditProf(row as unknown as Proforma)
            setFormOpen(true)
          }}
          actions={(row) => (
            <div className="flex items-center gap-1 relative">
              {canCreateProject(row.payment_status) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreateProject(row)
                  }}
                  className="btn-icon p-1.5 text-blue-600 hover:bg-blue-50"
                  title="Créer projet"
                >
                  <FolderKanban className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePDF(row)
                }}
                className="btn-icon p-1.5"
                title="PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setActionMenu((m) =>
                      m === String(row.id) ? null : String(row.id)
                    )
                  }}
                  className="btn-icon p-1.5"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {actionMenu === String(row.id) && (
                  <div
                    className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {Object.entries(PROFORMA_STATUS_LABELS)
                      .filter(([v]) => v !== row.payment_status)
                      .map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => handleStatusChange(String(row.id), v)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          → {l}
                        </button>
                      ))}

                    {isAdminOrLead && (
                      <button
                        onClick={() => {
                          setDelete(row)
                          setActionMenu(null)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"
                      >
                        <XCircle className="w-4 h-4" />
                        Supprimer
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {actionMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenu(null)} />
      )}

      <ProformaForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditProf(null)
        }}
        proforma={editProf}
        clients={clients}
        quotations={quotations}
        users={users}
        isAdminOrLead={isAdminOrLead}
        currentUserId={currentUserId}
        termsProfiles={termsProfiles}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer cette proforma ?"
        message={`La proforma "${deleteTarget?.number}" sera supprimée définitivement.`}
        confirmLabel="Supprimer"
        loading={deleting}
        danger
      />
    </div>
  )
}
