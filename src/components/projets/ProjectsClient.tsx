'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { Plus, Download, Eye, Trash2, MoreVertical, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import ProjectModal from './ProjectModal'
import ProjectWorkflow from './ProjectWorkflow'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { deleteProjectAction } from '@/lib/actions/projects'
import { exportToCSV } from '@/lib/utils/export'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS,
  type ProjectGeneralStatus, type Project, isProjectLate,
} from '@/types/sprint4'
import ProjectTimeline from './ProjectTimeline'

interface Props {
  projects:   Record<string,unknown>[]
  clients:    {id:string;company_name:string;country:string}[]
  quotations: {id:string;number:string;client_id:string}[]
  proformas:  {id:string;number:string;client_id:string;total_sell:number;currency:string}[]
  users:      {id:string;full_name:string}[]
  role:string; isAdminOrLead:boolean; currentUserId:string;
}

export default function ProjectsClient({ projects, clients, quotations, proformas, users, role, isAdminOrLead, currentUserId }: Props) {
  const [modalOpen,    setModalOpen]    = useState(false)
  const [workflowOpen, setWorkflowOpen] = useState(false)
  const [editProject,  setEditProject]  = useState<Record<string,unknown>|null>(null)
  const [deleteTarget, setDelete]       = useState<Record<string,unknown>|null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const [filterStatus, setFilterStatus] = useState('')

  const filtered = useMemo(() => projects.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    return true
  }), [projects, filterStatus])

  const lateProjects  = projects.filter(p => isProjectLate(p as unknown as Project))
  const activeProjects = projects.filter(p => !['cloture','annule'].includes(String(p.status)))

  const columns: Column<Record<string,unknown>>[] = [
    { key:'reference', header:'Référence', sortable:true, render:row => (
      <div>
        <div className="flex items-center gap-1.5">
          <Link
  href={`/projets/${row.id}`}
  className="text-sm font-semibold text-navy-900 hover:text-blue-600 transition-colors"
>
  {String(row.reference)}
</Link>
          {isProjectLate(row as unknown as Project) && (
            <span title="Projet en retard">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">{String(row.name)}</div>
      </div>
    )},
    { key:'client', header:'Client', render:row => {
      const c = row.clients as Record<string,unknown>|null
      return <div>
        <div className="text-sm font-medium">{c?.company_name as string ?? '—'}</div>
        <div className="text-xs text-gray-400">{c?.country as string ?? ''}</div>
      </div>
    }},
    { key:'status', header:'Statut', render:row => {
      const s = String(row.status) as ProjectGeneralStatus
      return <StatusBadge label={PROJECT_STATUS_LABELS[s]??s} color={PROJECT_STATUS_COLORS[s]} />
    }},
    { key:'progress_pct', header:'Avancement', render:row => (
  <div className="min-w-[180px] space-y-2">
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-navy-900 rounded-full transition-all"
          style={{ width: `${row.progress_pct}%` }}
        />
      </div>

      <span className="text-xs text-gray-500 flex-shrink-0">
        {String(row.progress_pct)}%
      </span>
    </div>

    <div className="flex items-center gap-2">
  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[90px]">
    <div
      className="h-full bg-navy-900 rounded-full transition-all"
      style={{ width: `${row.progress_pct}%` }}
    />
  </div>

  <span className="text-2xs text-gray-500 whitespace-nowrap">
    {String(row.workflow_stage ?? 'Engineering')}
  </span>
</div>
  </div>
)},
    { key:'contract_value', header:'Valeur', sortable:true, render:row => row.contract_value
      ? <span className="text-sm font-semibold text-navy-900">
          {formatCurrency(Number(row.contract_value), String(row.currency??'USD') as 'USD')}
        </span>
      : <span className="text-gray-300">—</span>
    },
    { key:'expected_delivery', header:'Livraison prévue', sortable:true, render:row => {
      const isLate = isProjectLate(row as unknown as Project)
      return row.expected_delivery
        ? <span className={`text-xs ${isLate ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
            {formatDate(String(row.expected_delivery))}
          </span>
        : <span className="text-gray-300">—</span>
    }},
    { key:'assigned_to', header:'Commercial', render:row => {
      const u = row.users_profiles as Record<string,unknown>|null
      return <span className="text-xs text-gray-500">{u?.full_name as string ?? '—'}</span>
    }},
  ]

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const r = await deleteProjectAction(String(deleteTarget.id))
    setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Projet supprimé')
    setDelete(null)
  }

  function handleExport() {
    exportToCSV(filtered, [
      { key:'reference',         header:'Référence' },
      { key:'name',              header:'Nom' },
      { key:'status',            header:'Statut', format:v=>PROJECT_STATUS_LABELS[v as ProjectGeneralStatus]??String(v) },
      { key:'contract_value',    header:'Valeur' },
      { key:'currency',          header:'Devise' },
      { key:'expected_delivery', header:'Livraison prévue', format:v=>formatDate(String(v)) },
      { key:'progress_pct',      header:'Avancement %' },
    ], 'projets_ime')
    toast.success(`${filtered.length} projet(s) exporté(s)`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projets</h1>
          <p className="page-subtitle">
            {activeProjects.length} actif{activeProjects.length>1?'s':''}
            {lateProjects.length > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {lateProjects.length} en retard</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          {isAdminOrLead && (
            <button onClick={() => { setEditProject(null); setModalOpen(true) }} className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Nouveau projet
            </button>
          )}
        </div>
      </div>

      {/* Alertes retard */}
      {lateProjects.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <span className="text-sm font-medium text-red-800">
              {lateProjects.length} projet{lateProjects.length>1?'s':''} en retard :
            </span>
            <span className="text-sm text-red-700 ml-1">
              {lateProjects.map(p => String(p.reference)).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Projets actifs',    value:activeProjects.length,                           color:'text-navy-900' },
          { label:'En cours',          value:projects.filter(p=>p.status==='en_cours').length, color:'text-blue-700' },
          { label:'En retard',         value:lateProjects.length,                             color:'text-red-600' },
          { label:'Livrés / Clôturés', value:projects.filter(p=>['livre','cloture'].includes(String(p.status))).length, color:'text-green-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <select className="input w-auto text-sm h-9" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        {filterStatus && <button onClick={()=>setFilterStatus('')} className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>}
      </div>

      {/* Table */}
      <div className="card">
        <DataTable
          data={filtered} columns={columns}
          searchable searchPlaceholder="Rechercher un projet..."
          searchKeys={['reference','name']}
          pageSize={20}
          emptyMessage="Aucun projet" emptySubtext="Créez votre premier projet"
          actions={row => (
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditProject(row); setWorkflowOpen(true) }}
                className="btn-icon p-1.5" title="Voir le workflow">
                <Eye className="w-3.5 h-3.5" />
              </button>
              {isAdminOrLead && <button onClick={() => { setEditProject(row); setModalOpen(true) }}
                className="btn-icon p-1.5" title="Modifier">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>}
              {role === 'admin' && (
                <button onClick={() => setDelete(row)}
                  className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Supprimer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        />
      </div>

      <ProjectModal open={modalOpen} onClose={() => { setModalOpen(false); setEditProject(null) }}
        project={editProject} clients={clients} quotations={quotations} proformas={proformas}
        users={users} isAdminOrLead={isAdminOrLead} />

      {editProject && (
        <ProjectWorkflow open={workflowOpen} onClose={() => { setWorkflowOpen(false); setEditProject(null) }}
          project={editProject} users={users} isAdminOrLead={isAdminOrLead} />
      )}

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDelete(null)} onConfirm={handleDelete}
        title="Supprimer ce projet ?" message={`Le projet "${deleteTarget?.reference}" et toutes ses étapes seront supprimés.`}
        confirmLabel="Supprimer" loading={deleting} danger />
    </div>
  )
}
