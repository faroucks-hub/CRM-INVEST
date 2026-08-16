'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, CircleDollarSign, FileCheck2, Filter, GitCompareArrows, PackageCheck, Search, ShieldAlert, Truck } from 'lucide-react'

type Row = Record<string, unknown>
type AlertLevel = 'critical'|'warning'|'info'
type AlertItem = { level: AlertLevel; label: string }

type Props = {
  role:string
  projects:Row[]
  quotations:Row[]
  proformas:Row[]
  orders:Row[]
  supplierQuotes:Row[]
  supplierProformas:Row[]
  execution:Row[]
  controls:Row[]
  checklist:Row[]
  documents:Row[]
  customerPayments:Row[]
  supplierInvoices:Row[]
  supplierPayments:Row[]
}

const money=(v:number,c:string)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:c||'USD',maximumFractionDigits:0}).format(Number(v)||0)
const text=(v:unknown)=>String(v??'')
const num=(v:unknown)=>Number(v??0)
const statusLabel:Record<string,string>={
  open:'Ouvert',ready_for_closure:'Prêt à clôturer',closed_with_reservations:'Clôturé avec réserves',closed:'Clôturé',
  not_started:'Non démarré',engineering:'Engineering',in_production:'Production',completed:'Terminé',blocked:'Bloqué',
  not_planned:'Non planifié',planned:'Planifié',ready:'Prêt',passed:'Réussi',passed_with_reservations:'Réussi avec réserves',failed:'Échoué',waived:'Dispensé',
  not_ready:'Non prêt',partial:'Partiel',ready_for_shipment:'Prêt à expédier',booking:'Booking',packed:'Packing',dispatched:'Expédié',in_transit:'Transit',arrived:'Arrivé',delivered:'Livré',
}

export default function BusinessConsolidationClient(props:Props){
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState<'all'|'critical'|'warning'|'ready'|'closed'>('all')
  const rows=useMemo(()=>buildRows(props),[props])
  const filtered=useMemo(()=>rows.filter(r=>{
    const q=query.trim().toLowerCase()
    const matches=!q||[r.reference,r.name,r.clientName].some(v=>v.toLowerCase().includes(q))
    if(!matches)return false
    if(filter==='critical')return r.alerts.some(a=>a.level==='critical')
    if(filter==='warning')return !r.alerts.some(a=>a.level==='critical')&&r.alerts.some(a=>a.level==='warning')
    if(filter==='ready')return r.shipmentReady
    if(filter==='closed')return r.exec?.project_closure_status==='closed'||r.project.status==='cloture'
    return true
  }),[rows,query,filter])
  const critical=rows.filter(r=>r.alerts.some(a=>a.level==='critical')).length
  const ready=rows.filter(r=>r.shipmentReady).length
  const incomplete=rows.filter(r=>r.finalCompletion<100).length
  const cashRisk=rows.filter(r=>r.cashExposure>0).length

  return <div className="max-w-7xl mx-auto space-y-4">
    <div className="page-header"><div><h1 className="page-title">Consolidation des affaires</h1><p className="page-subtitle">Contrôle transversal Quotation → Proforma → PO partenaire → exécution → Commercial Invoice → livraison → clôture.</p></div></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric icon={ShieldAlert} label="Affaires critiques" value={critical} tone={critical?'text-red-600':'text-green-700'}/>
      <Metric icon={PackageCheck} label="Prêtes à expédier" value={ready} tone="text-green-700"/>
      <Metric icon={FileCheck2} label="Dossiers incomplets" value={incomplete} tone={incomplete?'text-amber-600':'text-green-700'}/>
      <Metric icon={CircleDollarSign} label="Exposition de trésorerie" value={cashRisk} tone={cashRisk?'text-amber-600':'text-green-700'}/>
    </div>
    <div className="card p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
      <div className="relative flex-1 max-w-xl"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input value={query} onChange={e=>setQuery(e.target.value)} className="input pl-9 h-10" placeholder="Référence, projet ou client…"/></div>
      <div className="flex items-center gap-2 flex-wrap"><Filter className="w-4 h-4 text-gray-400"/>{[['all','Toutes'],['critical','Critiques'],['warning','À surveiller'],['ready','Prêtes expédition'],['closed','Clôturées']].map(([v,l])=><button key={v} onClick={()=>setFilter(v as typeof filter)} className={`px-3 py-1.5 rounded-md text-xs border ${filter===v?'bg-navy-900 text-white border-navy-900':'bg-white text-gray-600 border-gray-200'}`}>{l}</button>)}</div>
    </div>
    <div className="space-y-3">{filtered.map(r=><DealRow key={r.id} r={r}/>)}</div>
    {!filtered.length&&<div className="card p-10 text-center text-sm text-gray-400">Aucune affaire ne correspond au filtre.</div>}
  </div>
}

function buildRows(p:Props){
  const quotationMap=new Map(p.quotations.map(x=>[text(x.id),x]))
  const proformaMap=new Map(p.proformas.map(x=>[text(x.id),x]))
  const orderByProject=new Map<string,Row>();p.orders.forEach(x=>{if(x.project_id)orderByProject.set(text(x.project_id),x)})
  const sqByProject=new Map<string,Row>();p.supplierQuotes.forEach(x=>{if(x.project_id)sqByProject.set(text(x.project_id),x)})
  const spiByProject=new Map<string,Row>();p.supplierProformas.forEach(x=>{if(x.project_id)spiByProject.set(text(x.project_id),x)})
  const execMap=new Map(p.execution.map(x=>[text(x.project_id),x]))
  const controlMap=new Map(p.controls.map(x=>[text(x.project_id),x]))

  return p.projects.map(project=>{
    const id=text(project.id), q=quotationMap.get(text(project.quotation_id)), pi=proformaMap.get(text(project.proforma_id)), po=orderByProject.get(id), sq=sqByProject.get(id), spi=spiByProject.get(id), exec=execMap.get(id), control=controlMap.get(id)
    const docs=p.documents.filter(x=>text(x.project_id)===id)
    const types=new Set(docs.map(x=>text(x.document_type)))
    const checklist=p.checklist.filter(x=>text(x.project_id)===id&&Boolean(x.required))
    const finalCompletion=checklist.length?Math.round(checklist.filter(x=>['approved','not_applicable'].includes(text(x.status))).length/checklist.length*100):0
    const cp=p.customerPayments.filter(x=>text(x.project_id)===id)
    const saleCurrency=text(project.currency)||text(q?.currency)||'USD'
    const clientInvoiced=cp.reduce((s,x)=>s+num(x.total_amount),0)
    const clientReceived=cp.reduce((s,x)=>s+num(x.deposit_received),0)
    const si=p.supplierInvoices.filter(x=>text(x.project_id)===id&&!x.voided_at)
    const sp=p.supplierPayments.filter(x=>text(x.project_id)===id&&!x.voided_at)
    const supplierInvoiced=si.filter(x=>text(x.currency)===saleCurrency).reduce((s,x)=>s+num(x.total_amount),0)
    const supplierPaid=sp.filter(x=>text(x.currency)===saleCurrency).reduce((s,x)=>s+(text(x.transaction_type)==='remboursement'?-1:1)*num(x.amount),0)
    const cashExposure=Math.max(supplierPaid-clientReceived,0)
    const alerts:AlertItem[]=[]
    if(!q)alerts.push({level:'warning',label:'Quotation client non reliée au projet.'})
    if(!pi)alerts.push({level:'warning',label:'Proforma client non reliée au projet.'})
    if(!sq)alerts.push({level:'warning',label:'Aucune offre partenaire sélectionnée.'})
    if(!po)alerts.push({level:'critical',label:'Aucun Purchase Order partenaire pour cette affaire.'})
    if(po&&!spi)alerts.push({level:'warning',label:'PO créé mais aucune Proforma partenaire enregistrée.'})
    if(q&&pi&&text(q.currency)!==text(pi.currency))alerts.push({level:'critical',label:`Devise Quotation ${text(q.currency)} ≠ Proforma ${text(pi.currency)}.`})
    if(q&&pi&&Math.abs(num(q.total_sell)-num(pi.total_sell))>0.01)alerts.push({level:'warning',label:'Montant Proforma différent de la Quotation approuvée.'})
    if(q&&project.contract_value&&Math.abs(num(q.total_sell)-num(project.contract_value))>0.01)alerts.push({level:'warning',label:'Valeur projet différente de la Quotation rattachée.'})
    if(text(project.commercial_role)&&q&&text(q.commercial_role)&&text(project.commercial_role)!==text(q.commercial_role))alerts.push({level:'critical',label:'Régime contractuel du projet différent de la Quotation.'})
    if(q&&pi&&text(q.terms_code)&&text(pi.terms_code)&&text(q.terms_code)!==text(pi.terms_code))alerts.push({level:'critical',label:'Conditions contractuelles différentes entre Quotation et Proforma.'})
    if(!project.terms_code)alerts.push({level:'warning',label:'Aucune version de Customer Terms figée sur le projet.'})
    if(po&&!po.purchase_terms_code)alerts.push({level:'warning',label:'Purchase Terms absentes du PO partenaire.'})
    if(control&&['a_revoir',''].includes(text(control.review_status)))alerts.push({level:'warning',label:'Contrôle d’affaire non validé.'})
    if(exec&&text(exec.fat_status)==='failed')alerts.push({level:'critical',label:'FAT échoué : expédition à bloquer.'})
    if(exec&&text(exec.readiness_status)==='ready_for_shipment'&&!['passed','passed_with_reservations','waived'].includes(text(exec.fat_status)))alerts.push({level:'critical',label:'Readiness “prêt à expédier” sans FAT validé/dispensé.'})
    const shippingStarted=exec&&['booking','packed','dispatched','in_transit','arrived','delivered'].includes(text(exec.shipment_status))
    if(shippingStarted&&!types.has('commercial_invoice')&&!types.has('invoice'))alerts.push({level:'critical',label:'Expédition engagée sans Commercial Invoice archivée.'})
    if(shippingStarted&&!types.has('packing_list'))alerts.push({level:'critical',label:'Expédition engagée sans Packing List archivée.'})
    if(exec&&['delivered','accepted','with_reservations'].includes(text(exec.delivery_status))&&!types.has('delivery_note'))alerts.push({level:'warning',label:'Livraison enregistrée sans Delivery Note archivée.'})
    if(exec&&text(exec.project_closure_status)==='closed'&&finalCompletion<100)alerts.push({level:'critical',label:`Projet clôturé avec dossier final incomplet (${finalCompletion}%).`})
    if(exec&&text(exec.project_closure_status)==='closed'&&(Math.max(clientInvoiced-clientReceived,0)>0||Math.max(supplierInvoiced-supplierPaid,0)>0))alerts.push({level:'critical',label:'Projet clôturé alors qu’un solde financier reste ouvert.'})
    if(cashExposure>0)alerts.push({level:'info',label:`Exposition de trésorerie ${money(cashExposure,saleCurrency)}.`})
    const shipmentReady=!!exec&&text(exec.readiness_status)==='ready_for_shipment'&&['passed','passed_with_reservations','waived'].includes(text(exec.fat_status))&&finalCompletion>=50
    return {id,project,reference:text(project.reference),name:text(project.name),clientName:text((project.client as Row|undefined)?.company_name)||'Client',q,pi,po,sq,spi,exec,control,types,finalCompletion,clientInvoiced,clientReceived,supplierInvoiced,supplierPaid,cashExposure,saleCurrency,alerts,shipmentReady}
  })
}

function DealRow({r}:{r:ReturnType<typeof buildRows>[number]}){
  const critical=r.alerts.filter(a=>a.level==='critical').length, warning=r.alerts.filter(a=>a.level==='warning').length
  const chain=[['Quotation',!!r.q],['Proforma',!!r.pi],['Supplier Quote',!!r.sq],['PO',!!r.po],['Supplier PI',!!r.spi],['FAT',!!r.exec&&['passed','passed_with_reservations','waived'].includes(text(r.exec.fat_status))],['CI',r.types.has('commercial_invoice')||r.types.has('invoice')],['Livraison',!!r.exec&&['delivered','accepted','with_reservations'].includes(text(r.exec.delivery_status))]] as const
  return <div className="card p-5">
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
      <div><div className="flex items-center gap-2 flex-wrap"><Link href={`/projets/${r.id}`} className="text-sm font-semibold text-navy-900 hover:underline">{r.reference}</Link>{critical>0?<Badge tone="red">{critical} critique{critical>1?'s':''}</Badge>:warning>0?<Badge tone="amber">{warning} à surveiller</Badge>:<Badge tone="green">Cohérent</Badge>}</div><div className="text-sm text-gray-700 mt-1">{r.name}</div><div className="text-xs text-gray-400 mt-1">{r.clientName}</div></div>
      <div className="flex gap-2"><Link href={`/controle-affaires`} className="btn btn-outline btn-sm"><GitCompareArrows className="w-3.5 h-3.5"/>Contrôle</Link><Link href={`/projets/${r.id}`} className="btn btn-primary btn-sm">Ouvrir projet</Link></div>
    </div>
    <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mt-4">{chain.map(([label,done])=><div key={label} className={`rounded-md border px-2 py-2 text-center text-[10px] ${done?'border-green-100 bg-green-50 text-green-700':'border-gray-200 bg-gray-50 text-gray-400'}`}><div className="font-semibold">{done?'✓':'—'}</div><div className="mt-0.5">{label}</div></div>)}</div>
    <div className="grid sm:grid-cols-4 gap-3 mt-4 text-xs"><Info label="Dossier final" value={`${r.finalCompletion}%`}/><Info label="Encaissements client" value={money(r.clientReceived,r.saleCurrency)}/><Info label="Paiements partenaire" value={money(r.supplierPaid,r.saleCurrency)}/><Info label="Exécution" value={r.exec?`${statusLabel[text(r.exec.production_status)]??text(r.exec.production_status)} · ${statusLabel[text(r.exec.shipment_status)]??text(r.exec.shipment_status)}`:'Non initialisée'}/></div>
    {r.alerts.length>0&&<div className="mt-4 grid lg:grid-cols-2 gap-2">{r.alerts.slice(0,6).map((a,i)=><div key={i} className={`flex gap-2 rounded-md border px-3 py-2 text-xs ${a.level==='critical'?'border-red-200 bg-red-50 text-red-800':a.level==='warning'?'border-amber-200 bg-amber-50 text-amber-800':'border-blue-100 bg-blue-50 text-blue-800'}`}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-none"/><span>{a.label}</span></div>)}</div>}
  </div>
}

function Metric({icon:Icon,label,value,tone}:{icon:React.ElementType;label:string;value:number;tone:string}){return <div className="card p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center"><Icon className="w-4 h-4 text-gray-500"/></div><div><div className="text-xs text-gray-400">{label}</div><div className={`text-xl font-semibold mt-0.5 ${tone}`}>{value}</div></div></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-md bg-gray-50 px-3 py-2"><div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div><div className="mt-1 font-medium text-navy-900">{value}</div></div>}
function Badge({children,tone}:{children:React.ReactNode;tone:'red'|'amber'|'green'}){const cls=tone==='red'?'bg-red-50 text-red-700':tone==='amber'?'bg-amber-50 text-amber-700':'bg-green-50 text-green-700';return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{children}</span>}
