'use client'

import { useState, useMemo } from 'react'
import { Plus, CheckCircle2, Clock, AlertTriangle, Circle, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Modal from '@/components/ui/modal/Modal'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import { createTaskAction, updateTaskAction, deleteTaskAction, markTaskDoneAction, type TaskPayload } from '@/lib/actions/tasks'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const PRIORITY_CONFIG = {
  faible:  { label:'Faible',   color:'bg-gray-100 text-gray-500',   icon:'↓' },
  normale: { label:'Normale',  color:'bg-blue-50 text-blue-600',    icon:'→' },
  haute:   { label:'Haute',    color:'bg-amber-50 text-amber-700',  icon:'↑' },
  urgente: { label:'Urgente',  color:'bg-red-50 text-red-700',      icon:'⚡' },
}
const STATUS_CONFIG = {
  a_faire:   { label:'À faire',   color:'bg-gray-100 text-gray-600',   icon: Circle },
  en_cours:  { label:'En cours',  color:'bg-blue-50 text-blue-700',    icon: Clock },
  termine:   { label:'Terminé',   color:'bg-green-50 text-green-700',  icon: CheckCircle2 },
  en_retard: { label:'En retard', color:'bg-red-50 text-red-600',      icon: AlertTriangle },
}

interface Props {
  tasks:       Record<string,unknown>[]
  users:       {id:string;full_name:string}[]
  clients:     {id:string;company_name:string}[]
  leads:       {id:string;full_name:string|null;company:string|null}[]
  projects:    {id:string;reference:string;name:string}[]
  role:        string
  isAdminOrLead:boolean
  currentUserId:string
}

export default function TasksClient({ tasks, users, clients, leads, projects, role, isAdminOrLead, currentUserId }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask,  setEditTask]  = useState<Record<string,unknown>|null>(null)
  const [deleteTarget, setDelete] = useState<Record<string,unknown>|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [filterStatus, setFilter] = useState('')
  const [filterPriority, setFilterP] = useState('')

  // Auto-marque en retard
  const processedTasks = useMemo(() => tasks.map((t): Record<string, unknown> => ({
    ...t,
    status: t.status !== 'termine' && t.due_date && new Date(String(t.due_date)) < new Date()
      ? 'en_retard'
      : t.status,
  })), [tasks])

  const filtered = useMemo(() => processedTasks.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  }), [processedTasks, filterStatus, filterPriority])

  const overdue = processedTasks.filter(t => t.status === 'en_retard')
  const today   = processedTasks.filter(t =>
    t.due_date && t.status !== 'termine' &&
    new Date(String(t.due_date)).toDateString() === new Date().toDateString()
  )

  const columns: Column<Record<string,unknown>>[] = [
    { key:'priority', header:'', render:row => {
      const p = PRIORITY_CONFIG[String(row.priority) as keyof typeof PRIORITY_CONFIG]
      return <span className={`badge text-xs font-bold ${p?.color}`}>{p?.icon}</span>
    }},
    { key:'title', header:'Tâche', sortable:true, render:row => {
      const s = String(row.status)
      const isDone = s === 'termine'
      const StatusIcon = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.icon ?? Circle
      return (
        <div className="flex items-start gap-2.5">
          <button onClick={async e => {
            e.stopPropagation()
            if (!isDone) {
              await markTaskDoneAction(String(row.id))
              toast.success('Tâche terminée ✓')
              router.refresh()
            }
          }} className="mt-0.5 flex-shrink-0">
            <StatusIcon className={cn('w-4 h-4', isDone ? 'text-green-500' : 'text-gray-300 hover:text-green-400 transition-colors')} />
          </button>
          <div>
            <div className={cn('text-sm font-medium', isDone && 'line-through text-gray-400')}>
              {String(row.title)}
            </div>
            {Boolean(row.description) && (
              <div className="text-xs text-gray-400 truncate max-w-[300px]">{String(row.description)}</div>
            )}
          </div>
        </div>
      )
    }},
    { key:'status', header:'Statut', render:row => {
      const s = String(row.status) as keyof typeof STATUS_CONFIG
      return <StatusBadge label={STATUS_CONFIG[s]?.label ?? s} color={STATUS_CONFIG[s]?.color} />
    }},
    { key:'due_date', header:'Échéance', sortable:true, render:row => {
      const isLate = row.status === 'en_retard'
      const isToday = row.due_date && new Date(String(row.due_date)).toDateString() === new Date().toDateString()
      return row.due_date
        ? <span className={cn('text-xs', isLate?'text-red-600 font-semibold':isToday?'text-amber-600 font-medium':'text-gray-500')}>
            {isToday ? '⏰ Aujourd\'hui' : formatDate(String(row.due_date))}
          </span>
        : <span className="text-gray-300">—</span>
    }},
    { key:'assigned_to', header:'Assigné à', render:row => {
      const u = row.users_profiles as Record<string,unknown>|null
      return <span className="text-xs text-gray-500">{u?.full_name as string ?? '—'}</span>
    }},
    { key:'client', header:'Lié à', render:row => {
      const c = row.clients as Record<string,unknown>|null
      const p = row.projets_v2 as Record<string,unknown>|null
      const q = row.quotations_v2 as Record<string,unknown>|null
      const l = row.website_leads as Record<string,unknown>|null
      return (
        <div className="text-xs text-gray-500">
          {c?.company_name as string ?? l?.company as string ?? l?.full_name as string ?? p?.reference as string ?? q?.number as string ?? '—'}
        </div>
      )
    }},
  ]

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const r = await deleteTaskAction(String(deleteTarget.id))
    setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Tâche supprimée')
    setDelete(null)
    router.refresh()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tâches & Relances</h1>
          <p className="page-subtitle">{filtered.length} tâche{filtered.length>1?'s':''}</p>
        </div>
        <button onClick={() => { setEditTask(null); setModalOpen(true) }} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
        </button>
      </div>

      {/* Alertes */}
      {overdue.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-800 font-medium">
            {overdue.length} tâche{overdue.length>1?'s':''} en retard
          </span>
        </div>
      )}
      {today.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-800 font-medium">
            {today.length} tâche{today.length>1?'s':''} à faire aujourd'hui
          </span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'À faire',   value:processedTasks.filter(t=>t.status==='a_faire').length,   color:'text-gray-700' },
          { label:'En cours',  value:processedTasks.filter(t=>t.status==='en_cours').length,  color:'text-blue-700' },
          { label:'En retard', value:overdue.length,                                          color:'text-red-600' },
          { label:'Terminées', value:processedTasks.filter(t=>t.status==='termine').length,   color:'text-green-700' },
        ].map(({label,value,color}) => (
          <div key={label} className="card p-4">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className={`text-2xl font-semibold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3">
        <select className="input w-auto text-sm h-9" value={filterStatus} onChange={e=>setFilter(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterPriority} onChange={e=>setFilterP(e.target.value)}>
          <option value="">Toutes priorités</option>
          {Object.entries(PRIORITY_CONFIG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
        </select>
        {(filterStatus||filterPriority)&&<button onClick={()=>{setFilter('');setFilterP('')}} className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>}
      </div>

      {/* Table */}
      <div className="card">
        <DataTable data={filtered} columns={columns}
          searchable searchPlaceholder="Rechercher une tâche..."
          searchKeys={['title','description']} pageSize={25}
          emptyMessage="Aucune tâche" emptySubtext="Créez votre première tâche ou relance"
          onRowClick={row => { setEditTask(row); setModalOpen(true) }}
          actions={row=>(
            <div className="flex gap-1">
              <button onClick={()=>{setEditTask(row);setModalOpen(true)}} className="btn-icon p-1.5">
                <Edit className="w-3.5 h-3.5"/>
              </button>
              <button onClick={()=>setDelete(row)} className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5"/>
              </button>
            </div>
          )}
        />
      </div>

      <TaskModal open={modalOpen} onClose={()=>{setModalOpen(false);setEditTask(null)}}
        task={editTask} users={users} clients={clients} leads={leads} projects={projects}
        currentUserId={currentUserId}/>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDelete(null)} onConfirm={handleDelete}
        title="Supprimer cette tâche ?" message={`"${deleteTarget?.title}" sera supprimée.`}
        confirmLabel="Supprimer" loading={deleting} danger/>
    </div>
  )
}

// ── Task Modal ────────────────────────────────────────────────────
function TaskModal({ open, onClose, task, users, clients, leads, projects, currentUserId }: {
  open:boolean; onClose:()=>void; task?:Record<string,unknown>|null;
  users:{id:string;full_name:string}[];
  clients:{id:string;company_name:string}[];
  leads:{id:string;full_name:string|null;company:string|null}[];
  projects:{id:string;reference:string;name:string}[];
  currentUserId:string;
}) {
  const router = useRouter()
  const isEdit = !!task
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    title:       String(task?.title??''),
    description: String(task?.description??''),
    status:      String(task?.status??'a_faire'),
    priority:    String(task?.priority??'normale'),
    due_date:    String(task?.due_date??''),
    assigned_to: String(task?.assigned_to??currentUserId),
    client_id:   String(task?.client_id??''),
    website_lead_id: String(task?.website_lead_id??''),
    project_id:  String(task?.project_id??''),
    notes:       String(task?.notes??''),
  })
  const up = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(p=>({...p,[k]:e.target.value}))

  async function handleSave() {
    if (!f.title) { toast.error('Le titre est requis'); return }
    setSaving(true)
    const payload: TaskPayload = {
      title:f.title, description:f.description||undefined,
      status:f.status as TaskPayload['status'], priority:f.priority as TaskPayload['priority'],
      due_date:f.due_date||undefined, assigned_to:f.assigned_to||undefined,
      client_id:f.client_id||undefined, website_lead_id:f.website_lead_id||undefined, project_id:f.project_id||undefined, notes:f.notes||undefined,
    }
    const r = isEdit
      ? await updateTaskAction(String(task!.id), payload)
      : await createTaskAction(payload)
    setSaving(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(isEdit ? 'Tâche mise à jour' : 'Tâche créée')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit?'Modifier la tâche':'Nouvelle tâche'} size="md">
      <div className="p-6 space-y-4">
        <div><label className="label">Titre <span className="text-red-400">*</span></label>
          <input className="input" value={f.title} onChange={up('title')} placeholder="ex: Relancer Banque Abidjan — quotation Q0042"/></div>
        <div><label className="label">Description</label>
          <textarea className="input min-h-[60px] resize-none text-sm" value={f.description} onChange={up('description')}/></div>
        <FormGrid cols={2}>
          <div><label className="label">Priorité</label>
            <select className="input" value={f.priority} onChange={up('priority')}>
              {Object.entries(PRIORITY_CONFIG).map(([v,c])=><option key={v} value={v}>{c.icon} {c.label}</option>)}
            </select></div>
          <div><label className="label">Statut</label>
            <select className="input" value={f.status} onChange={up('status')}>
              {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
            </select></div>
        </FormGrid>
        <FormGrid cols={2}>
          <div><label className="label">Date limite</label>
            <input type="date" className="input" value={f.due_date} onChange={up('due_date')}/></div>
          <div><label className="label">Assigné à</label>
            <select className="input" value={f.assigned_to} onChange={up('assigned_to')}>
              {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select></div>
        </FormGrid>
        <FormGrid cols={2}>
          <div><label className="label">Client lié</label>
            <select className="input" value={f.client_id} onChange={(event) => setF(current => ({ ...current, client_id: event.target.value, website_lead_id: event.target.value ? '' : current.website_lead_id }))}>
              <option value="">— Aucun —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select></div>
          <div><label className="label">Lead lié</label>
            <select className="input" value={f.website_lead_id} onChange={(event) => setF(current => ({ ...current, website_lead_id: event.target.value, client_id: event.target.value ? '' : current.client_id }))}>
              <option value="">— Aucun —</option>
              {leads.map(lead=><option key={lead.id} value={lead.id}>{lead.company || lead.full_name || 'Lead'}</option>)}
            </select></div>
        </FormGrid>
        <FormGrid cols={2}>
          <div><label className="label">Projet lié</label>
            <select className="input" value={f.project_id} onChange={up('project_id')}>
              <option value="">— Aucun —</option>
              {projects.map(p=><option key={p.id} value={p.id}>{p.reference}</option>)}
            </select></div>
        </FormGrid>
        <div><label className="label">Notes</label>
          <textarea className="input min-h-[50px] resize-none text-sm" value={f.notes} onChange={up('notes')}/></div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving?'Enregistrement...':isEdit?'Mettre à jour':'Créer la tâche'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
