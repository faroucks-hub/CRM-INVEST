'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Circle, ChevronDown, ChevronUp, Calendar, User, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { updateWorkflowStepAction } from '@/lib/actions/projects'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import { STEP_STATUS_LABELS, STEP_STATUS_COLORS, type StepStatus, type WorkflowStep } from '@/types/sprint4'

interface Props {
  open:         boolean
  onClose:      () => void
  project:      Record<string,unknown>
  users:        {id:string;full_name:string}[]
  isAdminOrLead:boolean
}

const STATUS_ICONS: Record<StepStatus, React.ReactNode> = {
  non_commence: <Circle className="w-5 h-5 text-gray-300" />,
  en_cours:     <Clock className="w-5 h-5 text-blue-500 animate-pulse" />,
  termine:      <CheckCircle2 className="w-5 h-5 text-green-500" />,
  bloque:       <AlertTriangle className="w-5 h-5 text-red-500" />,
}

export default function ProjectWorkflow({ open, onClose, project, users, isAdminOrLead }: Props) {
  const [steps, setSteps]     = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [saving, setSaving]   = useState<string|null>(null)

  // Formulaire édition étape
  const [editData, setEditData] = useState<Record<string,string|boolean>>({})

  const client_name = (project.clients as Record<string,unknown>|null)?.company_name as string ?? ''

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('project_workflow_steps')
      .select(`*, users_profiles!project_workflow_steps_responsible_id_fkey(id, full_name)`)
      .eq('project_id', String(project.id))
      .order('step_order')
      .then(({ data }) => {
        setSteps(data as WorkflowStep[] ?? [])
        setLoading(false)
      })
  }, [open, project.id])

  async function handleStepUpdate(stepId: string) {
    setSaving(stepId)
    const data = editData as Record<string,unknown>
    const r = await updateWorkflowStepAction(stepId, {
      status:        data.status as string,
      deadline:      data.deadline as string || undefined,
      completed_at:  data.completed_at as string || undefined,
      responsible_id:data.responsible_id as string || undefined,
      comment:       data.comment as string || undefined,
      is_blocked:    data.is_blocked === true || data.is_blocked === 'true',
      block_reason:  data.block_reason as string || undefined,
    })
    setSaving(null)
    if (r.error) { toast.error(r.error); return }
    toast.success('Étape mise à jour')

    // Refresh steps
    const supabase = createClient()
    const { data: fresh } = await supabase.from('project_workflow_steps')
      .select(`*, users_profiles!project_workflow_steps_responsible_id_fkey(id, full_name)`)
      .eq('project_id', String(project.id))
      .order('step_order')
    setSteps(fresh as WorkflowStep[] ?? [])
    setExpanded(null)
  }

  function toggleExpand(stepId: string, step: WorkflowStep) {
    if (expanded === stepId) { setExpanded(null); return }
    setExpanded(stepId)
    setEditData({
      status:         step.status,
      deadline:       step.deadline ?? '',
      completed_at:   step.completed_at ?? '',
      responsible_id: step.responsible_id ?? '',
      comment:        step.comment ?? '',
      is_blocked:     step.is_blocked,
      block_reason:   step.block_reason ?? '',
    })
  }

  const done    = steps.filter(s => s.status === 'termine').length
  const blocked = steps.filter(s => s.status === 'bloque').length
  const progress = steps.length > 0 ? Math.round(done / steps.length * 100) : 0

  return (
    <Modal open={open} onClose={onClose}
      title={`Workflow — ${String(project.reference)}`}
      subtitle={`${String(project.name)} · ${client_name}`}
      size="xl">
      <div className="p-6">

        {/* Progress header */}
        <div className="flex items-center gap-4 mb-5 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-navy-900">Avancement global</span>
              <span className="text-sm font-semibold text-navy-900">{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-navy-900 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex gap-4 flex-shrink-0 text-center">
            <div><div className="text-lg font-semibold text-green-700">{done}</div><div className="text-2xs text-gray-400">Terminées</div></div>
            <div><div className="text-lg font-semibold text-blue-700">{steps.filter(s=>s.status==='en_cours').length}</div><div className="text-2xs text-gray-400">En cours</div></div>
            {blocked > 0 && <div><div className="text-lg font-semibold text-red-600">{blocked}</div><div className="text-2xs text-gray-400">Bloquées</div></div>}
          </div>
        </div>


        {/* Steps list */}
        {loading ? (
          <div className="space-y-2">{Array(5).fill(0).map((_,i) => (
            <div key={i} className="skeleton h-12 w-full rounded-lg" />
          ))}</div>
        ) : (
          <div className="space-y-1.5">
            {steps.map((step, idx) => {
              const isExp = expanded === step.id
              const isLate = step.deadline && step.status !== 'termine'
                && new Date(step.deadline) < new Date()

              return (
                <div key={step.id} className={`border rounded-lg overflow-hidden transition-all
                  ${step.status === 'bloque' ? 'border-red-200 bg-red-50/30'
                    : step.status === 'termine' ? 'border-green-100 bg-green-50/20'
                    : 'border-gray-200 bg-white'}`}>

                  {/* Step header */}
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => toggleExpand(step.id, step)}
                  >
                    {/* Number + icon */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="text-2xs text-gray-300 font-mono w-4 text-right">{idx+1}</span>
                      {STATUS_ICONS[step.status]}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${step.status === 'termine' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {step.step_label}
                      </span>
                      {step.is_blocked && step.block_reason && (
                        <span className="ml-2 text-xs text-red-500">— {step.block_reason}</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {step.deadline && (
                        <span className={`text-xs flex items-center gap-1 ${isLate ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          <Calendar className="w-3 h-3" />{formatDate(step.deadline)}
                        </span>
                      )}
                      {step.responsible && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 hidden sm:flex">
                          <User className="w-3 h-3" />{(step.responsible as Record<string,unknown>).full_name as string}
                        </span>
                      )}
                      {isAdminOrLead && (
                        isExp ? <ChevronUp className="w-4 h-4 text-gray-400" />
                              : <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Editable panel */}
                  {isExp && isAdminOrLead && (
                    <div className="px-4 pb-4 pt-2 border-t border-gray-100 animate-fade-in">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="label">Statut</label>
                          <select className="input text-sm"
                            value={String(editData.status)}
                            onChange={e => setEditData(d => ({ ...d, status: e.target.value, is_blocked: e.target.value === 'bloque' }))}>
                            {Object.entries(STEP_STATUS_LABELS).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label">Deadline</label>
                          <input type="date" className="input text-sm"
                            value={String(editData.deadline || '')}
                            onChange={e => setEditData(d => ({ ...d, deadline: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Date réelle fin</label>
                          <input type="date" className="input text-sm"
                            value={String(editData.completed_at || '')}
                            onChange={e => setEditData(d => ({ ...d, completed_at: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Responsable</label>
                          <select className="input text-sm"
                            value={String(editData.responsible_id || '')}
                            onChange={e => setEditData(d => ({ ...d, responsible_id: e.target.value }))}>
                            <option value="">— Non assigné —</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                          </select>
                        </div>
                        {String(editData.status) === 'bloque' && (
                          <div className="col-span-2">
                            <label className="label">Raison du blocage</label>
                            <input className="input text-sm"
                              value={String(editData.block_reason || '')}
                              onChange={e => setEditData(d => ({ ...d, block_reason: e.target.value }))}
                              placeholder="Décrire le problème..." />
                          </div>
                        )}
                      </div>
                      <div className="mb-3">
                        <label className="label">Commentaire</label>
                        <textarea className="input text-sm min-h-[60px] resize-none"
                          value={String(editData.comment || '')}
                          onChange={e => setEditData(d => ({ ...d, comment: e.target.value }))}
                          placeholder="Notes sur cette étape..." />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setExpanded(null)} className="btn btn-outline btn-sm">Annuler</button>
                        <button onClick={() => handleStepUpdate(step.id)}
                          disabled={saving === step.id} className="btn btn-primary btn-sm">
                          {saving === step.id ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Non-editable comment display */}
                  {!isAdminOrLead && step.comment && (
                    <div className="px-4 pb-3 text-xs text-gray-500 flex items-start gap-1.5 border-t border-gray-100 pt-2">
                      <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />{step.comment}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
