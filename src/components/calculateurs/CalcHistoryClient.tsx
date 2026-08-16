'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, Copy, ChevronDown, ChevronUp, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { CalcTypeBadge } from './CalcUI'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { deleteCalculationAction, saveCalculationAction } from '@/lib/actions/calculators'
import {
  downloadCalculationHistoryPdf,
  downloadCalculationPdf,
  calculationFieldLabel,
  formatCalculationValue,
  type CalculationPdfEntry,
} from '@/lib/pdf/calculator-report'
import { formatDate, formatDateTime } from '@/lib/utils'
import { CALC_LABELS, CALC_ICONS, type CalcType } from '@/types/sprint5'

interface Props {
  history:       Record<string, unknown>[]
  stats:         Record<string, unknown>[]
  isAdminOrLead: boolean
  currentUserId: string
}

export default function CalcHistoryClient({ history, stats, isAdminOrLead, currentUserId }: Props) {
  const router = useRouter()
  const [filterType, setFilterType] = useState('')
  const [deleteTarget, setDelete]   = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [expanded, setExpanded]     = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!filterType) return history
    return history.filter(h => h.calc_type === filterType)
  }, [history, filterType])

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'calc_type', header: 'Type', render: row => (
        <div className="flex items-center gap-2">
          <CalcTypeBadge type={String(row.calc_type) as CalcType} />
        </div>
      ),
    },
    {
      key: 'name', header: 'Nom', sortable: true, render: row => (
        <div>
          <div className="text-sm font-medium text-navy-900">
            {String(row.name ?? CALC_LABELS[String(row.calc_type) as CalcType] ?? row.calc_type)}
          </div>
          {Boolean((row.clients as Record<string, unknown> | null)?.company_name) && (
            <div className="text-xs text-gray-400">
              {(row.clients as Record<string, unknown>).company_name as string}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'project', header: 'Projet', render: row => {
        const p = row.projets_v2 as Record<string, unknown> | null
        return p?.reference
          ? <span className="text-xs text-navy-700 font-medium">{p.reference as string}</span>
          : <span className="text-gray-300">—</span>
      },
    },
    {
      key: 'creator', header: 'Par', render: row => {
        const u = row.users_profiles as Record<string, unknown> | null
        return <span className="text-xs text-gray-500">{u?.full_name as string ?? '—'}</span>
      },
    },
    {
      key: 'created_at', header: 'Date', sortable: true, render: row => (
        <span className="text-xs text-gray-400">{formatDateTime(String(row.created_at))}</span>
      ),
    },
  ]

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const r = await deleteCalculationAction(String(deleteTarget.id))
    setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Calcul supprimé')
    setDelete(null)
    router.refresh()
  }

  async function handleDuplicate(row: Record<string, unknown>) {
    const r = await saveCalculationAction({
      calc_type:   String(row.calc_type) as CalcType,
      name:        `${String(row.name ?? '')} (copie)`,
      inputs:      row.inputs as Record<string, unknown>,
      outputs:     row.outputs as Record<string, unknown>,
      client_id:   String(row.client_id ?? '') || undefined,
      project_id:  String(row.project_id ?? '') || undefined,
      quotation_id:String(row.quotation_id ?? '') || undefined,
    })
    if (r.error) { toast.error(r.error); return }
    toast.success('Calcul dupliqué')
    router.refresh()
  }

  function pdfEntry(row: Record<string, unknown>): CalculationPdfEntry {
    const client = row.clients as Record<string, unknown> | null
    const project = row.projets_v2 as Record<string, unknown> | null
    const quotation = row.quotations_v2 as Record<string, unknown> | null
    return {
      type:String(row.calc_type) as CalcType,
      name:String(row.name ?? ''),
      inputs:row.inputs as Record<string, unknown>,
      outputs:row.outputs as Record<string, unknown>,
      createdAt:String(row.created_at ?? ''),
      client:client?.company_name ? String(client.company_name) : undefined,
      project:project?.reference ? `${String(project.reference)} - ${String(project.name ?? '')}` : undefined,
      quotation:quotation?.number ? String(quotation.number) : undefined,
    }
  }

  async function handleExportRow(row: Record<string, unknown>) {
    await downloadCalculationPdf(pdfEntry(row))
    toast.success('PDF téléchargé')
  }

  async function handleExportAll() {
    if (!filtered.length) {
      toast.error('Aucun calcul à exporter')
      return
    }
    await downloadCalculationHistoryPdf(filtered.map(pdfEntry))
    toast.success(`${filtered.length} calcul(s) regroupé(s) dans un PDF`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Historique des calculs</h1>
          <p className="page-subtitle">{filtered.length} calcul{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportAll} className="btn btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <Link href="/calculateurs" className="btn btn-primary btn-sm">
            <Calculator className="w-3.5 h-3.5" /> Nouveau calcul
          </Link>
        </div>
      </div>

      {/* Stats par type */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {(['ups', 'battery', 'rectifier', 'inverter', 'frequency_converter', 'bess'] as CalcType[]).map(type => {
          const count = history.filter(h => h.calc_type === type).length
          return (
            <button key={type}
              onClick={() => setFilterType(f => f === type ? '' : type)}
              className={`card p-4 text-left transition-all hover:shadow-sm
                ${filterType === type ? 'border-navy-900 shadow-sm' : 'hover:border-gray-300'}`}>
              <div className="text-xl mb-1">{CALC_ICONS[type]}</div>
              <div className="text-2xl font-semibold text-navy-900">{count}</div>
              <div className="text-xs text-gray-400">{CALC_LABELS[type].replace('Calculateur ', '')}</div>
            </button>
          )
        })}
      </div>

      {/* Performance par commercial (admin only) */}
      {isAdminOrLead && stats.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header">
            <h2 className="text-sm font-medium text-navy-900">Performance par utilisateur</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Total</th>
                <th>UPS</th>
                <th>Batteries</th>
                <th>Rectifier</th>
                <th>Inverter</th>
                <th>Frequency Converter</th>
                <th>BESS</th>
                <th>Dernier calcul</th>
              </tr>
            </thead>
            <tbody>
              {stats.filter(s => Number(s.total_calcs) > 0).map(s => (
                <tr key={String(s.user_id)}>
                  <td className="font-medium">{String(s.full_name)}</td>
                  <td className="font-semibold text-navy-900">{String(s.total_calcs)}</td>
                  <td>{String(s.ups_count)}</td>
                  <td>{String(s.battery_count)}</td>
                  <td>{String(s.rectifier_count)}</td>
                  <td>{String(s.inverter_count)}</td>
                  <td>{String(s.frequency_converter_count)}</td>
                  <td>{String(s.bess_count)}</td>
                  <td className="text-xs text-gray-400">{formatDate(String(s.last_calc_at))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Filtres */}
      {filterType && (
        <div className="flex items-center gap-2">
          <CalcTypeBadge type={filterType as CalcType} />
          <button onClick={() => setFilterType('')} className="text-xs text-gray-400 hover:text-gray-700">
            × Effacer le filtre
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <DataTable
          data={filtered}
          columns={columns}
          searchable
          searchPlaceholder="Rechercher un calcul..."
          searchKeys={['name', 'calc_type']}
          pageSize={20}
          emptyMessage="Aucun calcul sauvegardé"
          emptySubtext="Effectuez un calcul et sauvegardez-le pour le retrouver ici"
          onRowClick={row => setExpanded(expanded === String(row.id) ? null : String(row.id))}
          actions={row => (
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); handleExportRow(row) }}
                className="btn-icon p-1.5" title="Export PDF">
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={e => { e.stopPropagation(); handleDuplicate(row) }}
                className="btn-icon p-1.5" title="Dupliquer">
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button onClick={e => { e.stopPropagation(); setDelete(row) }}
                className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        />
      </div>

      {/* Expanded detail inline */}
      {expanded && (() => {
        const row = history.find(h => String(h.id) === expanded)
        if (!row) return null
        const inputs  = row.inputs  as Record<string, unknown>
        const outputs = row.outputs as Record<string, unknown>
        return (
          <div className="card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy-900">
                {CALC_ICONS[String(row.calc_type) as CalcType]} {String(row.name ?? '')}
              </h3>
              <button onClick={() => setExpanded(null)} className="text-gray-400 hover:text-gray-700 text-lg">×</button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Paramètres d'entrée</h4>
                <div className="space-y-1.5">
                  {Object.entries(inputs).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-gray-500">{calculationFieldLabel(k)}</span>
                      <span className="font-medium text-navy-900">{formatCalculationValue(k, v)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Résultats</h4>
                <div className="space-y-1.5">
                  {Object.entries(outputs)
                    .filter(([k]) => !['ok', 'disclaimer', 'autonomy_data', 'recommendation'].includes(k))
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-gray-500">{calculationFieldLabel(k)}</span>
                        <span className="font-medium text-navy-900">{formatCalculationValue(k, v, true)}</span>
                      </div>
                    ))}
                </div>
                {Boolean(outputs.recommendation) && (
                  <div className="mt-3 p-3 bg-navy-900/5 rounded-lg text-xs text-gray-700 border border-navy-900/10">
                    {String(outputs.recommendation)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer ce calcul ?"
        message="Ce calcul et ses résultats seront supprimés définitivement."
        confirmLabel="Supprimer"
        loading={deleting}
        danger
      />
    </div>
  )
}
