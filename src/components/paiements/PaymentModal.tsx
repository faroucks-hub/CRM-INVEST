'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Modal from '@/components/ui/modal/Modal'
import { FormGrid, FormSection } from '@/components/ui/form/Fields'
import { createPaymentAction, updatePaymentAction, type PaymentPayload } from '@/lib/actions/payments'
import { PAYMENT_STATUS_LABELS } from '@/types/sprint4'

interface Props {
  open:boolean; onClose:()=>void; payment?:Record<string,unknown>|null;
  clients:{id:string;company_name:string;country:string}[];
  projects:{id:string;reference:string;name:string;client_id:string}[];
  proformas:{id:string;number:string;client_id:string;total_sell:number;currency:string}[];
  users:{id:string;full_name:string}[];
  isAdminOrLead:boolean; currentUserId:string;
}

export default function PaymentModal({ open, onClose, payment, clients, projects, proformas, users, isAdminOrLead, currentUserId }: Props) {
  const router = useRouter()
  const isEdit = !!payment
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    client_id:        String(payment?.client_id??''),
    project_id:       String(payment?.project_id??''),
    proforma_id:      String(payment?.proforma_id??''),
    assigned_to:      String(payment?.assigned_to??currentUserId),
    total_amount:     String(payment?.total_amount??''),
    deposit_expected: String(payment?.deposit_expected??''),
    deposit_received: String(payment?.deposit_received??''),
    currency:         String(payment?.currency??'USD'),
    due_date:         String(payment?.due_date??''),
    received_date:    String(payment?.received_date??''),
    status:           String(payment?.status??'en_attente'),
    bank_reference:   String(payment?.bank_reference??''),
    notes:            String(payment?.notes??''),
  })

  const up = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF(prev=>({...prev,[k]:e.target.value}))

  const filtProjects = f.client_id ? projects.filter(p=>p.client_id===f.client_id) : projects
  const filtProformas = f.client_id ? proformas.filter(p=>p.client_id===f.client_id) : proformas

  const balance = (Number(f.total_amount)||0) - (Number(f.deposit_received)||0)

  async function handleSave() {
    if (!f.client_id) { toast.error('Client requis'); return }
    if (!f.total_amount) { toast.error('Montant requis'); return }
    setSaving(true)
    const payload: PaymentPayload = {
      client_id:f.client_id, project_id:f.project_id||undefined,
      proforma_id:f.proforma_id||undefined, assigned_to:f.assigned_to||undefined,
      total_amount:Number(f.total_amount), deposit_expected:Number(f.deposit_expected)||0,
      deposit_received:Number(f.deposit_received)||0,
      currency:f.currency, due_date:f.due_date||undefined, received_date:f.received_date||undefined,
      status:f.status, bank_reference:f.bank_reference||undefined, notes:f.notes||undefined,
    }
    const r = isEdit
      ? await updatePaymentAction(String(payment!.id), payload)
      : await createPaymentAction(payload)
    setSaving(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(isEdit?'Paiement mis à jour':'Paiement enregistré')
    onClose(); router.refresh()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit?'Modifier le paiement':'Nouveau suivi paiement'} size="md">
      <div className="p-6 space-y-5">
        <FormSection title="Relations">
          <div><label className="label">Client <span className="text-red-400">*</span></label>
            <select className="input" value={f.client_id} onChange={e=>{up('client_id')(e);setF(prev=>({...prev,project_id:'',proforma_id:''}))}}>
              <option value="">— Sélectionner —</option>
              {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select></div>
          <FormGrid cols={2}>
            <div><label className="label">Projet lié</label>
              <select className="input" value={f.project_id} onChange={up('project_id')}>
                <option value="">— Aucun —</option>
                {filtProjects.map(p=><option key={p.id} value={p.id}>{p.reference} — {p.name}</option>)}
              </select></div>
            <div><label className="label">Proforma liée</label>
              <select className="input" value={f.proforma_id} onChange={e=>{up('proforma_id')(e);const p=proformas.find(x=>x.id===e.target.value);if(p){setF(prev=>({...prev,total_amount:String(p.total_sell),currency:p.currency,deposit_expected:String(Math.round(p.total_sell*0.3))}))} }}>
                <option value="">— Aucune —</option>
                {filtProformas.map(p=><option key={p.id} value={p.id}>{p.number}</option>)}
              </select></div>
          </FormGrid>
        </FormSection>

        <FormSection title="Montants">
          <FormGrid cols={2}>
            <div><label className="label">Montant total <span className="text-red-400">*</span></label>
              <input type="number" min="0" step="0.01" className="input" value={f.total_amount} onChange={up('total_amount')}/></div>
            <div><label className="label">Devise</label>
              <select className="input" value={f.currency} onChange={up('currency')}>
                {['USD','EUR','TRY','XOF'].map(c=><option key={c}>{c}</option>)}
              </select></div>
          </FormGrid>
          <FormGrid cols={2}>
            <div><label className="label">Acompte attendu</label>
              <input type="number" min="0" step="0.01" className="input" value={f.deposit_expected} onChange={up('deposit_expected')}/></div>
            <div><label className="label">Acompte reçu</label>
              <input type="number" min="0" step="0.01" className="input" value={f.deposit_received} onChange={up('deposit_received')}/></div>
          </FormGrid>
          {balance > 0 && <div className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded">
            Solde restant : {balance.toLocaleString('fr-FR', {minimumFractionDigits:2})} {f.currency}
          </div>}
        </FormSection>

        <FormSection title="Suivi">
          <FormGrid cols={2}>
            <div><label className="label">Statut</label>
              <select className="input" value={f.status} onChange={up('status')}>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label className="label">Commercial</label>
              <select className="input" value={f.assigned_to} onChange={up('assigned_to')}>
                {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select></div>
          </FormGrid>
          <FormGrid cols={2}>
            <div><label className="label">Date d'échéance</label>
              <input type="date" className="input" value={f.due_date} onChange={up('due_date')}/></div>
            <div><label className="label">Date de réception</label>
              <input type="date" className="input" value={f.received_date} onChange={up('received_date')}/></div>
          </FormGrid>
          <div><label className="label">Référence bancaire / SWIFT</label>
            <input className="input" value={f.bank_reference} onChange={up('bank_reference')}/></div>
          <div><label className="label">Notes</label>
            <textarea className="input min-h-[60px] resize-none text-sm" value={f.notes} onChange={up('notes')}/></div>
        </FormSection>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn btn-outline">Annuler</button>
          <button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving?'Enregistrement...':isEdit?'Mettre à jour':'Enregistrer le paiement'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
