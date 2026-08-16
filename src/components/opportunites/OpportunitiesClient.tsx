'use client'

import { useState, useMemo } from 'react'
import { Plus, Download, LayoutGrid, List, CalendarClock, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import OpportunityModal from './OpportunityModal'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { deleteOpportunityAction, movePipelineStageAction } from '@/lib/actions/opportunities'
import { exportToCSV } from '@/lib/utils/export'
import { formatCurrency, formatDate, sumByCurrency } from '@/lib/utils'
import { CurrencyBreakdown } from '@/components/ui/CurrencyBreakdown'
import {
  PIPELINE_STAGE_LABELS, PIPELINE_STAGE_COLORS,
  KANBAN_COLUMNS, type OppPipelineStage
} from '@/types/sprint2'

interface Props {
  opportunities: Record<string, unknown>[]
  clients:   { id: string; company_name: string; country: string }[]
  users:     { id: string; full_name: string }[]
  role:      string
  isAdminOrLead: boolean
  currentUserId: string
}

export default function OpportunitiesClient({
  opportunities, clients, users, role, isAdminOrLead, currentUserId
}: Props) {
  const [view, setView]             = useState<'kanban' | 'list'>('kanban')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editOpp, setEditOpp]       = useState<Record<string, unknown> | null>(null)
  const [defaultStage, setDefault]  = useState<string | undefined>()
  const [deleteTarget, setDelete]   = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting]     = useState(false)

  // Filtre par commercial assigné
  const [filterAssigned, setFilterAssigned] = useState('')

  const filtered = useMemo(() => {
    if (!filterAssigned) return opportunities
    return opportunities.filter(o => String(o.assigned_to ?? '') === filterAssigned)
  }, [opportunities, filterAssigned])

  // Métriques pipeline
  const openOpps = filtered.filter(o =>
    String(o.pipeline_stage) !== 'perdu_annule' &&
    String(o.pipeline_stage) !== 'projet_livre'
  )
  const totalPipelineByCurrency = sumByCurrency(
    openOpps,
    o => Number(o.estimated_sell) || 0,
    o => String(o.currency ?? 'USD')
  )
  const weightedPipelineByCurrency = sumByCurrency(
    openOpps,
    o => (Number(o.estimated_sell) || 0) * (Number(o.probability) || 0) / 100,
    o => String(o.currency ?? 'USD')
  )

  // ── KANBAN ──────────────────────────────────────────────────────
  function KanbanView() {
    const oppsByStage = KANBAN_COLUMNS.reduce((acc, stage) => {
      acc[stage] = filtered.filter(o => String(o.pipeline_stage) === stage)
      return acc
    }, {} as Record<string, typeof filtered>)

    async function handleStageChange(oppId: string, newStage: string) {
      const result = await movePipelineStageAction(oppId, newStage)
      if (result.error) toast.error(result.error)
      else toast.success('Étape mise à jour')
    }

    return (
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
        {KANBAN_COLUMNS.map(stage => {
          const cards = oppsByStage[stage] ?? []
          const colTotals = sumByCurrency(
            cards,
            c => Number(c.estimated_sell) || 0,
            c => String(c.currency ?? 'USD')
          )

          return (
            <div key={stage} className="flex-shrink-0 w-60">
              {/* Column header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`badge text-2xs ${PIPELINE_STAGE_COLORS[stage as OppPipelineStage]}`}>
                    {cards.length}
                  </span>
                  <span className="text-xs font-medium text-gray-700 truncate">
                    {PIPELINE_STAGE_LABELS[stage as OppPipelineStage]}
                  </span>
                </div>
                <CurrencyBreakdown
                  totals={colTotals}
                  className="text-2xs text-right text-gray-400 flex-shrink-0"
                  emptyLabel=""
                />
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[100px]">
                {/* Add button */}
                <button
                  onClick={() => { setDefault(stage); setEditOpp(null); setModalOpen(true) }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs
                             text-gray-400 hover:text-gray-600 hover:bg-gray-100
                             rounded-md border border-dashed border-gray-200 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Ajouter
                </button>

                {cards.map(opp => (
                  <KanbanCard
                    key={String(opp.id)}
                    opp={opp}
                    onEdit={() => { setEditOpp(opp); setModalOpen(true) }}
                    onStageChange={newStage => handleStageChange(String(opp.id), newStage)}
                    onDelete={() => setDelete(opp)}
                    isAdminOrLead={isAdminOrLead}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Colonne Perdu */}
        <div className="flex-shrink-0 w-60 opacity-60">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <span className="badge text-2xs bg-red-50 text-red-600">
              {filtered.filter(o => String(o.pipeline_stage) === 'perdu_annule').length}
            </span>
            <span className="text-xs font-medium text-gray-500">Perdu / Annulé</span>
          </div>
          <div className="space-y-2">
            {filtered
              .filter(o => String(o.pipeline_stage) === 'perdu_annule')
              .map(opp => (
                <KanbanCard
                  key={String(opp.id)}
                  opp={opp}
                  onEdit={() => { setEditOpp(opp); setModalOpen(true) }}
                  onStageChange={newStage => handleStageChange(String(opp.id), newStage)}
                  onDelete={() => setDelete(opp)}
                  isAdminOrLead={isAdminOrLead}
                />
              ))}
          </div>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────────
  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Opportunité',
      sortable: true,
      render: row => (
        <div>
          <div className="text-sm font-medium text-navy-900">{String(row.name)}</div>
          <div className="text-xs text-gray-400">
            {(row.clients as Record<string, unknown>)?.company_name as string ?? ''}
          </div>
        </div>
      ),
    },
    {
      key: 'pipeline_stage',
      header: 'Étape',
      render: row => {
        const stage = String(row.pipeline_stage) as OppPipelineStage
        return (
          <StatusBadge
            label={PIPELINE_STAGE_LABELS[stage] ?? stage}
            color={PIPELINE_STAGE_COLORS[stage]}
          />
        )
      },
    },
    {
      key: 'estimated_sell',
      header: 'Valeur',
      sortable: true,
      render: row => row.estimated_sell
        ? <span className="text-sm font-medium text-navy-900">
            {formatCurrency(Number(row.estimated_sell), String(row.currency ?? 'USD') as 'USD')}
          </span>
        : <span className="text-gray-300">—</span>,
    },
    {
      key: 'probability',
      header: 'Proba.',
      render: row => (
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gold-400 rounded-full"
              style={{ width: `${row.probability ?? 0}%` }} />
          </div>
          <span className="text-xs text-gray-500">{String(row.probability ?? 0)}%</span>
        </div>
      ),
    },
    {
      key: 'next_followup',
      header: 'Relance',
      render: row => {
        if (!row.next_followup) return <span className="text-gray-300">—</span>
        const isOverdue = new Date(String(row.next_followup)) < new Date()
        return (
          <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {formatDate(String(row.next_followup))}
          </span>
        )
      },
    },
    {
      key: 'assigned_to',
      header: 'Commercial',
      render: row => {
        const assignee = row.users_profiles as Record<string, unknown> | null
        return assignee?.full_name
          ? <span className="text-xs text-gray-600">{String(assignee.full_name)}</span>
          : <span className="text-gray-300">—</span>
      },
    },
    {
      key: 'updated_at',
      header: 'MAJ',
      sortable: true,
      render: row => <span className="text-xs text-gray-400">{formatDate(String(row.updated_at))}</span>,
    },
  ]

  function handleExport() {
    exportToCSV(filtered, [
      { key: 'name',           header: 'Opportunité' },
      { key: 'pipeline_stage', header: 'Étape',
        format: v => PIPELINE_STAGE_LABELS[v as OppPipelineStage] ?? String(v) },
      { key: 'estimated_sell', header: 'Valeur estimée' },
      { key: 'currency',       header: 'Devise' },
      { key: 'probability',    header: 'Probabilité %' },
      { key: 'expected_close', header: 'Clôture prévue', format: v => formatDate(String(v)) },
      { key: 'next_followup',  header: 'Prochaine relance', format: v => formatDate(String(v)) },
      { key: 'notes',          header: 'Notes' },
      { key: 'created_at',     header: 'Créé le', format: v => formatDate(String(v)) },
    ], 'opportunites_ime')
    toast.success(`${filtered.length} opportunité(s) exportée(s)`)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deleteOpportunityAction(String(deleteTarget.id))
    setDeleting(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Opportunité déplacée dans "Perdu / Annulé"')
    setDelete(null)
  }

  return (
    <div className="max-w-full space-y-4">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pipeline commercial</h1>
          <p className="page-subtitle">
            {openOpps.length} opportunité{openOpps.length > 1 ? 's' : ''} active{openOpps.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {/* Toggle vue */}
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button onClick={() => setView('kanban')}
              className={`p-2 transition-colors ${view === 'kanban' ? 'bg-navy-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')}
              className={`p-2 transition-colors ${view === 'list' ? 'bg-navy-900 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => { setEditOpp(null); setDefault(undefined); setModalOpen(true) }}
            className="btn btn-primary btn-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Nouvelle opportunité
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Opportunités actives', value: String(openOpps.length), icon: TrendingUp },
          {
            label: 'Valeur totale pipeline',
            value: <CurrencyBreakdown totals={totalPipelineByCurrency} />,
            icon: TrendingUp,
          },
          {
            label: 'Pipeline pondéré',
            value: <CurrencyBreakdown totals={weightedPipelineByCurrency} />,
            icon: TrendingUp,
          },
          { label: 'Relances à faire', value: String(
            openOpps.filter(o => o.next_followup && new Date(String(o.next_followup)) <= new Date()).length
          ), icon: CalendarClock },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-lg font-semibold text-navy-900">{value}</div>
          </div>
        ))}
      </div>

      {/* Filtres commerciaux */}
      {isAdminOrLead && users.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Filtrer par commercial :</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterAssigned('')}
              className={`text-xs px-3 py-1 rounded-full border transition-colors
                ${!filterAssigned ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-900'}`}
            >
              Tous
            </button>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => setFilterAssigned(u.id)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors
                  ${filterAssigned === u.id ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-600 border-gray-200 hover:border-navy-900'}`}
              >
                {u.full_name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenu — Kanban ou Liste */}
      {view === 'kanban' ? (
        <KanbanView />
      ) : (
        <div className="card">
          <DataTable
            data={filtered}
            columns={columns}
            searchable
            searchPlaceholder="Rechercher une opportunité..."
            searchKeys={['name', 'description', 'notes']}
            pageSize={25}
            emptyMessage="Aucune opportunité"
            emptySubtext="Créez votre première opportunité commerciale"
            onRowClick={row => { setEditOpp(row); setModalOpen(true) }}
            actions={row => (
              <button
                onClick={() => setDelete(row)}
                className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            )}
          />
        </div>
      )}

      <OpportunityModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditOpp(null); setDefault(undefined) }}
        opportunity={editOpp}
        clients={clients}
        users={users}
        defaultStage={defaultStage}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        title="Marquer comme perdu ?"
        message={`L'opportunité "${deleteTarget?.name}" sera déplacée dans "Perdu / Annulé".`}
        confirmLabel="Confirmer"
        loading={deleting}
        danger
      />
    </div>
  )
}

// ── Kanban Card ───────────────────────────────────────────────────
function KanbanCard({
  opp, onEdit, onDelete, onStageChange, isAdminOrLead,
}: {
  opp: Record<string, unknown>
  onEdit: () => void
  onDelete: () => void
  onStageChange: (stage: string) => void
  isAdminOrLead: boolean
}) {
  const [stageMenu, setStageMenu] = useState(false)
  const client = opp.clients as Record<string, unknown> | null
  const clientName = typeof client?.company_name === 'string'
    ? client.company_name
    : null
  const estimatedSell = typeof opp.estimated_sell === 'number'
    || typeof opp.estimated_sell === 'string'
    ? Number(opp.estimated_sell)
    : null
  const isOverdue = Boolean(opp.next_followup)
    && new Date(String(opp.next_followup)) < new Date()

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer
                 hover:border-gold-400/50 hover:shadow-sm transition-all group relative"
      onClick={onEdit}
    >
      <div className="font-medium text-xs text-navy-900 mb-1 leading-tight line-clamp-2">
        {String(opp.name)}
      </div>
      {clientName && (
        <div className="text-2xs text-gray-400 mb-2">{clientName}</div>
      )}

      {/* Value */}
      {estimatedSell !== null && (
        <div className="text-xs font-semibold text-navy-900 mb-2">
          {formatCurrency(estimatedSell, String(opp.currency ?? 'USD') as 'USD')}
          <span className="text-2xs text-gray-400 font-normal ml-1">
            · {String(opp.probability ?? 0)}%
          </span>
        </div>
      )}

      {/* Follow-up alert */}
      {isOverdue && (
        <div className="flex items-center gap-1 text-2xs text-red-600 bg-red-50
                       px-1.5 py-0.5 rounded mb-1.5">
          <CalendarClock className="w-2.5 h-2.5" />
          Relance en retard
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move stage */}
        <div className="relative" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setStageMenu(p => !p)}
            className="text-2xs text-gray-400 hover:text-navy-900 flex items-center gap-0.5"
          >
            Déplacer ▾
          </button>
          {stageMenu && (
            <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-100
                           rounded-lg shadow-lg z-10 py-1 animate-fade-up">
              {[...KANBAN_COLUMNS, 'perdu_annule'].map(s => (
                <button
                  key={s}
                  onClick={() => { onStageChange(s); setStageMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700"
                >
                  {PIPELINE_STAGE_LABELS[s as OppPipelineStage]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-2xs text-red-400 hover:text-red-600"
        >
          Supprimer
        </button>
      </div>
    </div>
  )
}
