'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Download, Upload, Filter, X, Phone, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge, Avatar } from '@/components/ui/StatusBadge'
import ClientModal from './ClientModal'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { archiveClientAction } from '@/lib/actions/clients'
import { exportToCSV, parseCSV } from '@/lib/utils/export'
import { formatDate } from '@/lib/utils'
import { CLIENT_STATUS_EXTENDED, LEAD_SOURCE_LABELS } from '@/types/sprint2'

interface Props {
  clients: Record<string, unknown>[]
  users:   { id: string; full_name: string; role: string }[]
  role:    string
  isAdminOrLead: boolean
  currentUserId: string
}

const SECTOR_LABELS: Record<string, string> = {
  banques_finance: 'Banques & Finance',
  telecommunications: 'Télécoms',
  mines_extraction: 'Mines',
  data_centers: 'Data Centers',
  hopitaux_sante: 'Hôpitaux',
  marine_offshore: 'Marine',
  industrie: 'Industrie',
  solaire_energie: 'Solaire',
  autre: 'Autre',
}

export default function ClientsClient({ clients, users, role, isAdminOrLead, currentUserId }: Props) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [editClient, setEditClient]   = useState<Record<string, unknown> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting]       = useState(false)

  // Filtres
  const [filterStatus, setFilterStatus]     = useState('')
  const [filterSector, setFilterSector]     = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [showFilters, setShowFilters]       = useState(false)

  // Données filtrées
  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus   && c.status   !== filterStatus)   return false
      if (filterSector   && c.sector   !== filterSector)   return false
      if (filterAssigned && c.assigned_to !== filterAssigned) return false
      return true
    })
  }, [clients, filterStatus, filterSector, filterAssigned])

  const activeFilters = [filterStatus, filterSector, filterAssigned].filter(Boolean).length

  // Colonnes
  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'company_name',
      header: 'Société',
      sortable: true,
      render: row => (
        <div className="flex items-center gap-2.5">
          <Avatar name={String(row.company_name ?? '')} />
          <div>
            <div className="text-sm font-medium text-navy-900">
              {String(row.company_name)}
            </div>
            {Boolean(row.reference) && (
              <div className="text-2xs text-gray-400">{String(row.reference)}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: row => {
        const s = CLIENT_STATUS_EXTENDED[String(row.status) as keyof typeof CLIENT_STATUS_EXTENDED]
        return s ? <StatusBadge label={s.label} color={s.color} /> : null
      },
    },
    {
      key: 'country',
      header: 'Pays / Ville',
      sortable: true,
      render: row => (
        <div>
          <div className="text-sm text-gray-900">{String(row.country ?? '')}</div>
          {Boolean(row.city) && <div className="text-xs text-gray-400">{String(row.city)}</div>}
        </div>
      ),
    },
    {
      key: 'sector',
      header: 'Secteur',
      render: row => row.sector
        ? <span className="text-xs text-gray-600">{SECTOR_LABELS[String(row.sector)] ?? String(row.sector)}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'contact_name',
      header: 'Contact',
      render: row => (
        <div>
          {Boolean(row.contact_name) && (
            <div className="text-sm text-gray-900">{String(row.contact_name)}</div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            {Boolean(row.contact_email) && (
              <Link href={`/messagerie?${new URLSearchParams({ to: String(row.contact_email), clientId: String(row.id), contactName: String(row.contact_name ?? ''), company: String(row.company_name ?? ''), language: String(row.communication_language ?? 'unknown') })}`}
                onClick={e => e.stopPropagation()}
                className="text-gray-400 hover:text-navy-900 transition-colors">
                <Mail className="w-3 h-3" />
              </Link>
            )}
            {Boolean(row.contact_phone) && (
              <a href={`tel:${row.contact_phone}`}
                onClick={e => e.stopPropagation()}
                className="text-gray-400 hover:text-navy-900 transition-colors">
                <Phone className="w-3 h-3" />
              </a>
            )}
            {Boolean(row.contact_whatsapp) && (
              <a href={`https://wa.me/${String(row.contact_whatsapp).replace(/\D/g, '')}`}
                target="_blank" rel="noopener"
                onClick={e => e.stopPropagation()}
                className="text-gray-400 hover:text-green-600 transition-colors">
                <MessageCircle className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'lead_source',
      header: 'Source',
      render: row => row.lead_source
        ? <span className="text-xs text-gray-500">
            {LEAD_SOURCE_LABELS[String(row.lead_source) as keyof typeof LEAD_SOURCE_LABELS] ?? String(row.lead_source)}
          </span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'created_at',
      header: 'Créé le',
      sortable: true,
      render: row => <span className="text-xs text-gray-400">{formatDate(String(row.created_at))}</span>,
    },
  ]

  // Export CSV
  function handleExport() {
    exportToCSV(
      filtered,
      [
        { key: 'reference',    header: 'Référence' },
        { key: 'company_name', header: 'Société' },
        { key: 'status',       header: 'Statut' },
        { key: 'country',      header: 'Pays' },
        { key: 'city',         header: 'Ville' },
        { key: 'sector',       header: 'Secteur' },
        { key: 'contact_name', header: 'Contact' },
        { key: 'contact_email',header: 'Email' },
        { key: 'contact_phone',header: 'Téléphone' },
        { key: 'contact_whatsapp', header: 'WhatsApp' },
        { key: 'lead_source',  header: 'Source' },
        { key: 'notes',        header: 'Notes' },
        { key: 'created_at',   header: 'Date création', format: v => formatDate(String(v)) },
      ],
      'clients_ime'
    )
    toast.success(`${filtered.length} client(s) exporté(s)`)
  }

  // Import CSV
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { rows } = await parseCSV(file, ['company_name', 'country'])
      toast.info(`${rows.length} lignes détectées — import en cours de développement`)
    } catch (err) {
      toast.error(String(err))
    }
    e.target.value = ''
  }

  // Delete
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await archiveClientAction(String(deleteTarget.id))
    setDeleting(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Client archivé')
    setDeleteTarget(null)
  }

  const clearFilters = () => { setFilterStatus(''); setFilterSector(''); setFilterAssigned('') }

  return (
    <div className="max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients & Prospects</h1>
          <p className="page-subtitle">
            {clients.length} entrée{clients.length > 1 ? 's' : ''}
            {filtered.length !== clients.length && ` · ${filtered.length} filtrée(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <label className="btn btn-outline btn-sm cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Import CSV
            <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
          </label>
          <button
            onClick={() => setShowFilters(p => !p)}
            className={`btn btn-sm relative ${showFilters ? 'btn-primary' : 'btn-outline'}`}
          >
            <Filter className="w-3.5 h-3.5" /> Filtres
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gold-400 text-navy-900
                              text-2xs font-bold rounded-full flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            onClick={() => { setEditClient(null); setModalOpen(true) }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Nouveau client
          </button>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="card card-body animate-fade-up">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Statut</label>
              <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(CLIENT_STATUS_EXTENDED).map(([v, {label}]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Secteur</label>
              <select className="input" value={filterSector} onChange={e => setFilterSector(e.target.value)}>
                <option value="">Tous</option>
                {Object.entries(SECTOR_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            {isAdminOrLead && (
              <div>
                <label className="label">Commercial</label>
                <select className="input" value={filterAssigned} onChange={e => setFilterAssigned(e.target.value)}>
                  <option value="">Tous</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            {activeFilters > 0 && (
              <div className="flex items-end">
                <button onClick={clearFilters} className="btn btn-ghost btn-sm w-full">
                  <X className="w-3.5 h-3.5" /> Effacer les filtres
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher par société, pays, contact..."
          searchKeys={['company_name', 'country', 'city', 'contact_name', 'contact_email']}
          pageSize={25}
          emptyMessage="Aucun client"
          emptySubtext="Créez votre premier client avec le bouton ci-dessus"
          onRowClick={row => { setEditClient(row); setModalOpen(true) }}
          actions={row => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setEditClient(row); setModalOpen(true) }}
                className="btn-icon p-1.5"
                title="Modifier"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              {isAdminOrLead && (
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                  title="Archiver"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              )}
            </div>
          )}
        />
      </div>

      {/* Modals */}
      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        client={editClient}
        users={users}
        isAdminOrLead={isAdminOrLead}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Archiver ce client ?"
        message={`Le client "${deleteTarget?.company_name}" sera archivé et n'apparaîtra plus dans la liste. Cette action est réversible.`}
        confirmLabel="Archiver"
        loading={deleting}
      />
    </div>
  )
}
