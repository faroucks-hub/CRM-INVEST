'use client'

import { useState } from 'react'
import { saveExecutionControlAction } from '@/lib/actions/execution-control'
import { toast } from 'sonner'
import { Factory, FlaskConical, PackageCheck, Ship, Truck, CircleDollarSign, CheckCircle2, AlertTriangle } from 'lucide-react'

type Row = Record<string, any>

type Props = {
  projectId: string
  control: Row | null
  clientFinancial: { invoiced:number; received:number; currency:string }
  supplierFinancial: { invoiced:number; paid:number; currency:string }
  completionPct: number
}

const fmt = (n:number, c:string) => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n) + ' ' + c

export default function ExecutionControlClient({projectId,control,clientFinancial,supplierFinancial,completionPct}:Props){
  const [open,setOpen] = useState(false)
  const [saving,setSaving] = useState(false)
  const clientBalance = Math.max(clientFinancial.invoiced-clientFinancial.received,0)
  const supplierBalance = Math.max(supplierFinancial.invoiced-supplierFinancial.paid,0)
  const readyToClose = completionPct===100 && clientBalance===0 && supplierBalance===0

  async function submit(formData:FormData){
    setSaving(true)
    try { await saveExecutionControlAction(formData); toast.success('Exécution mise à jour'); setOpen(false) }
    catch(e){ toast.error(e instanceof Error ? e.message : 'Erreur') }
    finally { setSaving(false) }
  }

  const cards = [
    ['Production', control?.production_status ?? 'not_started', Factory],
    ['FAT', control?.fat_status ?? 'not_planned', FlaskConical],
    ['Readiness', control?.readiness_status ?? 'not_ready', PackageCheck],
    ['Expédition', control?.shipment_status ?? 'not_started', Ship],
    ['Livraison', control?.delivery_status ?? 'not_delivered', Truck],
    ['Clôture', control?.project_closure_status ?? 'open', CheckCircle2],
  ] as const

  return <div className="card p-6 space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div><h2 className="text-lg font-semibold text-navy-900">Exécution & clôture</h2><p className="text-sm text-gray-500 mt-1">Production, FAT, disponibilité, expédition, livraison et clôture financière.</p></div>
      <button className="btn btn-primary btn-sm" onClick={()=>setOpen(v=>!v)}>{open?'Fermer':'Mettre à jour'}</button>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(([label,value,Icon])=><div key={label} className="rounded-xl border border-gray-200 p-3 bg-white">
        <Icon className="w-4 h-4 text-navy-700 mb-2"/><div className="text-2xs uppercase tracking-wide text-gray-400">{label}</div><div className="text-xs font-semibold text-gray-800 mt-1 break-words">{String(value).replaceAll('_',' ')}</div>
      </div>)}
    </div>

    <div className="grid md:grid-cols-3 gap-3">
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="text-xs text-gray-500">Dossier final</div><div className="text-xl font-semibold mt-1">{completionPct}%</div></div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs text-gray-500"><CircleDollarSign className="w-4 h-4"/>Solde client</div><div className="text-xl font-semibold mt-1">{fmt(clientBalance,clientFinancial.currency)}</div></div>
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center gap-2 text-xs text-gray-500"><CircleDollarSign className="w-4 h-4"/>Solde partenaire</div><div className="text-xl font-semibold mt-1">{fmt(supplierBalance,supplierFinancial.currency)}</div></div>
    </div>

    <div className={`rounded-lg border p-3 text-sm flex gap-2 ${readyToClose?'border-green-200 bg-green-50 text-green-800':'border-amber-200 bg-amber-50 text-amber-800'}`}>
      {readyToClose?<CheckCircle2 className="w-4 h-4 mt-0.5"/>:<AlertTriangle className="w-4 h-4 mt-0.5"/>}
      <span>{readyToClose?'Le projet est financièrement et documentairement prêt à être clôturé.':'Clôture à contrôler : dossier final, solde client et solde partenaire doivent être vérifiés avant fermeture.'}</span>
    </div>

    {open && <form action={submit} className="border-t pt-5 space-y-5">
      <input type="hidden" name="project_id" value={projectId}/>
      <Section title="Production">
        <Select name="production_status" label="Statut" value={control?.production_status} options={['not_started','engineering','in_production','completed','blocked']}/>
        <Input name="production_start_date" label="Début réel" type="date" value={control?.production_start_date}/>
        <Input name="production_expected_end" label="Fin prévue" type="date" value={control?.production_expected_end}/>
        <Input name="production_actual_end" label="Fin réelle" type="date" value={control?.production_actual_end}/>
      </Section>
      <Section title="FAT & readiness">
        <Select name="fat_status" label="FAT" value={control?.fat_status} options={['not_planned','planned','ready','passed','passed_with_reservations','failed','waived']}/>
        <Input name="fat_planned_date" label="FAT prévu" type="date" value={control?.fat_planned_date}/>
        <Input name="fat_actual_date" label="FAT réel" type="date" value={control?.fat_actual_date}/>
        <Select name="readiness_status" label="Readiness" value={control?.readiness_status} options={['not_ready','partial','ready_for_shipment','blocked']}/>
        <Input name="readiness_date" label="Date readiness" type="date" value={control?.readiness_date}/>
        <Input name="fat_reservations" label="Réserves FAT" value={control?.fat_reservations}/>
      </Section>
      <Section title="Expédition & livraison">
        <Select name="shipment_status" label="Expédition" value={control?.shipment_status} options={['not_started','booking','packed','dispatched','in_transit','arrived','delivered','blocked']}/>
        <Input name="shipment_method" label="Mode transport" value={control?.shipment_method}/>
        <Input name="shipment_reference" label="Référence / tracking" value={control?.shipment_reference}/>
        <Input name="shipment_date" label="Date expédition" type="date" value={control?.shipment_date}/>
        <Input name="eta_date" label="ETA" type="date" value={control?.eta_date}/>
        <Input name="actual_arrival_date" label="Arrivée réelle" type="date" value={control?.actual_arrival_date}/>
        <Select name="delivery_status" label="Livraison" value={control?.delivery_status} options={['not_delivered','partial','delivered','accepted','with_reservations']}/>
        <Input name="delivery_date" label="Date livraison" type="date" value={control?.delivery_date}/>
        <Input name="delivery_reservations" label="Réserves livraison" value={control?.delivery_reservations}/>
      </Section>
      <Section title="Clôture">
        <Select name="financial_closure_status" label="Clôture financière" value={control?.financial_closure_status} options={['open','pending_client','pending_supplier','balanced','closed']}/>
        <Select name="project_closure_status" label="Clôture projet" value={control?.project_closure_status} options={['open','ready_for_closure','closed_with_reservations','closed']}/>
        <Input name="closure_date" label="Date clôture" type="date" value={control?.closure_date}/>
        <Input name="closure_notes" label="Notes clôture" value={control?.closure_notes}/>
      </Section>
      <div className="flex justify-end"><button disabled={saving} className="btn btn-primary">{saving?'Enregistrement…':'Enregistrer'}</button></div>
    </form>}
  </div>
}

function Section({title,children}:{title:string;children:React.ReactNode}){return <div><h3 className="text-sm font-semibold text-navy-900 mb-3">{title}</h3><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div></div>}
function Input({name,label,type='text',value}:{name:string;label:string;type?:string;value?:any}){return <label className="text-xs text-gray-600">{label}<input name={name} type={type} defaultValue={value ?? ''} className="input mt-1 text-sm"/></label>}
function Select({name,label,value,options}:{name:string;label:string;value?:any;options:string[]}){return <label className="text-xs text-gray-600">{label}<select name={name} defaultValue={value ?? options[0]} className="input mt-1 text-sm">{options.map(o=><option key={o} value={o}>{o.replaceAll('_',' ')}</option>)}</select></label>}
