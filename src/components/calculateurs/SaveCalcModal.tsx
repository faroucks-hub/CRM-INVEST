'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, BookOpen } from 'lucide-react'
import Modal from '@/components/ui/modal/Modal'
import { saveCalculationAction } from '@/lib/actions/calculators'
import type { CalcType } from '@/types/sprint5'
import { CALC_LABELS } from '@/types/sprint5'

interface Props {
  open:     boolean
  onClose:  () => void
  calcType: CalcType
  inputs:   Record<string, unknown>
  outputs:  Record<string, unknown>
  clients:  { id: string; company_name: string }[]
  projects: { id: string; reference: string; name: string }[]
  quotations:{ id: string; number: string }[]
}

export default function SaveCalcModal({
  open, onClose, calcType, inputs, outputs, clients, projects, quotations
}: Props) {
  const [name,        setName]        = useState('')
  const [clientId,    setClientId]    = useState('')
  const [projectId,   setProjectId]   = useState('')
  const [quotationId, setQuotationId] = useState('')
  const [saving,      setSaving]      = useState(false)

  async function handleSave() {
    setSaving(true)
    const r = await saveCalculationAction({
      calc_type:   calcType,
      name:        name || `${CALC_LABELS[calcType]} — ${new Date().toLocaleDateString('fr-FR')}`,
      inputs,
      outputs,
      client_id:    clientId    || undefined,
      project_id:   projectId   || undefined,
      quotation_id: quotationId || undefined,
    })
    setSaving(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Calcul sauvegardé dans l\'historique')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Sauvegarder ce calcul" size="sm">
      <div className="p-6 space-y-4">
        <div>
          <label className="label">Nom du calcul</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)}
            placeholder={`${CALC_LABELS[calcType]} — ${new Date().toLocaleDateString('fr-FR')}`} />
        </div>

        <div>
          <label className="label">Client lié (optionnel)</label>
          <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— Aucun —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Projet lié (optionnel)</label>
          <select className="input" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">— Aucun —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Quotation liée (optionnel)</label>
          <select className="input" value={quotationId} onChange={e => setQuotationId(e.target.value)}>
            <option value="">— Aucune —</option>
            {quotations.map(q => <option key={q.id} value={q.id}>{q.number}</option>)}
          </select>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          Le calcul sera sauvegardé avec tous ses paramètres. Vous pourrez le retrouver et le dupliquer dans l'historique.
        </p>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="btn btn-outline btn-sm">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
