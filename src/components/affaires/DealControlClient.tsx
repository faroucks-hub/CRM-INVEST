'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, CircleDollarSign, Clock3, Landmark, Scale, ShieldCheck, Truck, WalletCards } from 'lucide-react'
import Modal from '@/components/ui/modal/Modal'
import { saveDealControlAction } from '@/app/(dashboard)/controle-affaires/actions'

type Row = Record<string, any>
type Risk = { level: 'critical'|'warning'|'info'; label: string }

const money=(v:number,c:string)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:c||'USD',maximumFractionDigits:0}).format(Number(v)||0)
const date=(v:any)=>v?new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v))):'—'
const days=(a:any,b:any)=>a&&b?Math.max(0,Math.ceil((new Date(String(b)).getTime()-new Date(String(a)).getTime())/86400000)):null
const statusLabel:Record<string,string>={a_revoir:'À revoir',revue:'Revue',validee_avec_reserves:'Validée avec réserves',validee:'Validée'}

export default function DealControlClient({role,projects,orders,supplierQuotes,expenses,supplierPayments,customerPayments,controls,suppliers}:{role:string;projects:Row[];orders:Row[];supplierQuotes:Row[];expenses:Row[];supplierPayments:Row[];customerPayments:Row[];controls:Row[];suppliers:Row[]}){
 const [selectedId,setSelectedId]=useState<string|null>(projects[0]?.id??null)
 const [edit,setEdit]=useState(false)
 const sm=useMemo(()=>new Map(suppliers.map(s=>[String(s.id),String(s.company_name)])),[suppliers])
 const controlMap=useMemo(()=>new Map(controls.map(c=>[String(c.project_id),c])),[controls])
 const rows=useMemo(()=>projects.map(project=>buildProject(project,orders,supplierQuotes,expenses,supplierPayments,customerPayments,controlMap.get(String(project.id)),sm)),[projects,orders,supplierQuotes,expenses,supplierPayments,customerPayments,controlMap,sm])
 const selected=rows.find(r=>String(r.project.id)===String(selectedId))??rows[0]
 const atRisk=rows.filter(r=>r.risks.some((x:Risk)=>x.level==='critical')).length
 const unreviewed=rows.filter(r=>(r.control?.review_status??'a_revoir')==='a_revoir').length
 const negativeMargin=rows.filter(r=>r.marginExpected!==null&&r.marginExpected<0).length
 return <div className="max-w-7xl mx-auto space-y-4">
  <div className="page-header"><div><h1 className="page-title">Contrôle d’affaires</h1><p className="page-subtitle">Confronte les engagements Client ↔ Partenaire avant qu’un écart de prix, délai, garantie ou logistique ne devienne un risque.</p></div></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
   <Metric label="Affaires analysées" value={rows.length} icon={Scale}/><Metric label="Risques critiques" value={atRisk} icon={AlertTriangle} tone={atRisk?'text-red-600':'text-green-700'}/><Metric label="À revoir" value={unreviewed} icon={Clock3}/><Metric label="Marge négative" value={negativeMargin} icon={CircleDollarSign} tone={negativeMargin?'text-red-600':'text-green-700'}/>
  </div>
  <div className="grid lg:grid-cols-[390px_1fr] gap-4 items-start">
   <div className="card overflow-hidden"><div className="p-4 border-b"><div className="text-sm font-semibold text-navy-900">Portefeuille d’affaires</div><div className="text-xs text-gray-400 mt-1">Sélectionnez une affaire pour ouvrir son contrôle.</div></div><div className="divide-y max-h-[680px] overflow-y-auto">{rows.map(r=><button key={String(r.project.id)} onClick={()=>setSelectedId(String(r.project.id))} className={`w-full p-4 text-left hover:bg-gray-50 ${String(selected?.project.id)===String(r.project.id)?'bg-gold-50/60':''}`}><div className="flex justify-between gap-3"><div><div className="text-xs font-semibold text-navy-900">{r.project.reference}</div><div className="text-sm text-gray-700 mt-0.5 line-clamp-1">{r.project.name}</div><div className="text-xs text-gray-400 mt-1">{r.clientName}</div></div><RiskDot risks={r.risks}/></div><div className="flex justify-between mt-3 text-xs"><span className="text-gray-400">Vente {r.saleValue!==null?money(r.saleValue,r.saleCurrency):'—'}</span><span className={r.marginExpected!==null&&r.marginExpected<0?'text-red-600 font-semibold':'text-gray-600'}>{r.marginExpected!==null?`Marge ${money(r.marginExpected,r.saleCurrency)}`:'Marge —'}</span></div></button>)}</div></div>
   {selected?<Detail r={selected} canEdit={['admin','lead_team'].includes(role)} onEdit={()=>setEdit(true)}/>:<div className="card p-8 text-sm text-gray-400">Aucune affaire disponible.</div>}
  </div>
  {selected&&<Modal open={edit} onClose={()=>setEdit(false)} title={`Revue · ${selected.project.reference}`} size="lg"><ReviewForm r={selected}/></Modal>}
 </div>
}

function buildProject(project:Row,orders:Row[],quotes:Row[],expenses:Row[],supplierPayments:Row[],customerPayments:Row[],control:Row|undefined,sm:Map<string,string>){
 const po=orders.find(o=>String(o.project_id)===String(project.id))
 const quote=quotes.find(q=>String(q.project_id)===String(project.id))
 const supplierId=po?.supplier_id??quote?.supplier_id
 const purchase=po??quote
 const saleValue=project.contract_value==null?null:Number(project.contract_value)
 const saleCurrency=String(project.currency??'USD')
 const purchaseAmount=purchase?.amount==null?null:Number(purchase.amount)
 const purchaseCurrency=String(purchase?.currency??saleCurrency)
 const exp=expenses.filter(e=>String(e.project_id)===String(project.id))
 const sameCurrencyExpenses=exp.filter(e=>String(e.currency)===saleCurrency).reduce((s,e)=>s+Number(e.amount||0),0)
 const mixedExpenseCurrencies=[...new Set(exp.map(e=>String(e.currency)).filter(c=>c!==saleCurrency))]
 const budgetCurrency=String(control?.budget_currency??saleCurrency)
 const budgets=Number(control?.logistics_budget||0)+Number(control?.bank_fees_budget||0)+Number(control?.inspection_budget||0)+Number(control?.other_cost_budget||0)
 const canCompute=saleValue!==null&&purchaseAmount!==null&&purchaseCurrency===saleCurrency&&budgetCurrency===saleCurrency&&mixedExpenseCurrencies.length===0
 const totalCostExpected=canCompute?purchaseAmount+sameCurrencyExpenses+budgets:null
 const marginExpected=canCompute&&saleValue!==null&&totalCostExpected!==null?saleValue-totalCostExpected:null
 const marginPct=marginExpected!==null&&saleValue?marginExpected/saleValue*100:null
 const supplierPaid=supplierPayments.filter(p=>String(p.project_id)===String(project.id)&&String(p.currency)===saleCurrency).reduce((s,p)=>s+(p.transaction_type==='remboursement'?-1:1)*Number(p.amount||0),0)
 const customerReceived=customerPayments.filter(p=>String(p.project_id)===String(project.id)&&String(p.currency)===saleCurrency).reduce((s,p)=>s+Number(p.deposit_received||0),0)
 const cashExposure=supplierPaid-customerReceived
 const clientLeadDays=days(project.order_date,project.expected_delivery)
 const supplierLeadDays=quote?.lead_time_days==null?days(po?.issued_date,po?.expected_delivery):Number(quote.lead_time_days)
 const clientWarranty=project.warranty_months==null?null:Number(project.warranty_months)
 const supplierWarranty=purchase?.warranty_months==null?null:Number(purchase.warranty_months)
 const clientIncoterm=String(project.incoterm??'').trim()
 const supplierIncoterm=String(purchase?.delivery_terms??purchase?.incoterm??'').trim()
 const risks:Risk[]=[]
 if(!purchase) risks.push({level:'critical',label:'Aucun achat / partenaire sélectionné pour cette affaire.'})
 if(saleValue===null) risks.push({level:'warning',label:'Valeur de vente client non renseignée.'})
 if(purchaseAmount!==null&&purchaseCurrency!==saleCurrency) risks.push({level:'critical',label:`Devise vente ${saleCurrency} ≠ achat ${purchaseCurrency} : marge non calculable sans taux de conversion validé.`})
 if(mixedExpenseCurrencies.length) risks.push({level:'warning',label:`Dépenses dans d’autres devises (${mixedExpenseCurrencies.join(', ')}) exclues de la marge.`})
 if(budgetCurrency!==saleCurrency&&budgets>0) risks.push({level:'warning',label:`Budget de coûts en ${budgetCurrency}, différent de la devise de vente ${saleCurrency}.`})
 if(marginExpected!==null&&marginExpected<0) risks.push({level:'critical',label:'Marge prévisionnelle négative.'})
 if(marginPct!==null&&marginPct<10&&marginPct>=0) risks.push({level:'warning',label:`Marge prévisionnelle faible (${marginPct.toFixed(1)}%).`})
 if(clientLeadDays!==null&&supplierLeadDays!==null&&supplierLeadDays>clientLeadDays) risks.push({level:'critical',label:`Délai partenaire ${supplierLeadDays} j > engagement client ${clientLeadDays} j.`})
 if(clientWarranty!==null&&supplierWarranty!==null&&clientWarranty>supplierWarranty) risks.push({level:'critical',label:`Garantie client ${clientWarranty} mois > garantie partenaire ${supplierWarranty} mois.`})
 if(clientIncoterm&&supplierIncoterm&&clientIncoterm!==supplierIncoterm) risks.push({level:'warning',label:`Incoterm client ${clientIncoterm} ≠ partenaire ${supplierIncoterm} : couverture logistique à confirmer.`})
 if(!project.commercial_role||!project.terms_code) risks.push({level:'warning',label:'Cadre contractuel client non rattaché à l’affaire.'})
 if(cashExposure>0) risks.push({level:'info',label:`Décaissement partenaire supérieur aux encaissements client de ${money(cashExposure,saleCurrency)}.`})
 return {project,control,po,quote,purchase,supplierName:supplierId?sm.get(String(supplierId))??'Partenaire':'—',clientName:project.client?.company_name??'Client',saleValue,saleCurrency,purchaseAmount,purchaseCurrency,sameCurrencyExpenses,budgets,totalCostExpected,marginExpected,marginPct,supplierPaid,customerReceived,cashExposure,clientLeadDays,supplierLeadDays,clientWarranty,supplierWarranty,clientIncoterm,supplierIncoterm,risks}
}

function Detail({r,canEdit,onEdit}:{r:any;canEdit:boolean;onEdit:()=>void}){return <div className="space-y-4">
 <div className="card p-5"><div className="flex flex-wrap justify-between gap-4"><div><div className="text-xs text-gray-400">{r.project.reference}</div><h2 className="text-lg font-semibold text-navy-900 mt-1">{r.project.name}</h2><div className="text-sm text-gray-500 mt-1">{r.clientName} ↔ {r.supplierName}</div></div><div className="flex items-start gap-2"><ReviewBadge status={r.control?.review_status}/>{canEdit&&<button className="btn btn-primary btn-sm" onClick={onEdit}>Revoir l’affaire</button>}</div></div></div>
 <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Mini icon={WalletCards} label="Vente client" value={r.saleValue!==null?money(r.saleValue,r.saleCurrency):'—'}/><Mini icon={Landmark} label="Achat partenaire" value={r.purchaseAmount!==null?money(r.purchaseAmount,r.purchaseCurrency):'—'}/><Mini icon={Truck} label="Autres coûts + budgets" value={money(r.sameCurrencyExpenses+r.budgets,r.saleCurrency)}/><Mini icon={CircleDollarSign} label="Marge prévisionnelle" value={r.marginExpected!==null?`${money(r.marginExpected,r.saleCurrency)}${r.marginPct!==null?` · ${r.marginPct.toFixed(1)}%`:''}`:'Non calculable'} tone={r.marginExpected!==null&&r.marginExpected<0?'text-red-600':'text-navy-900'}/></div>
 <div className="card p-5"><h3 className="text-sm font-semibold text-navy-900">Engagements croisés</h3><div className="mt-4 overflow-x-auto"><table className="w-full text-xs"><thead><tr className="border-b"><Th>Contrôle</Th><Th>Client</Th><Th>Partenaire</Th><Th>Lecture</Th></tr></thead><tbody className="divide-y"><Compare label="Prix" a={r.saleValue!==null?money(r.saleValue,r.saleCurrency):'—'} b={r.purchaseAmount!==null?money(r.purchaseAmount,r.purchaseCurrency):'—'} ok={r.purchaseCurrency===r.saleCurrency}/><Compare label="Délai" a={r.clientLeadDays!==null?`${r.clientLeadDays} jours`:'—'} b={r.supplierLeadDays!==null?`${r.supplierLeadDays} jours`:'—'} ok={r.clientLeadDays===null||r.supplierLeadDays===null||r.supplierLeadDays<=r.clientLeadDays}/><Compare label="Garantie" a={r.clientWarranty!==null?`${r.clientWarranty} mois`:'—'} b={r.supplierWarranty!==null?`${r.supplierWarranty} mois`:'—'} ok={r.clientWarranty===null||r.supplierWarranty===null||r.clientWarranty<=r.supplierWarranty}/><Compare label="Incoterm" a={r.clientIncoterm||'—'} b={r.supplierIncoterm||'—'} ok={!r.clientIncoterm||!r.supplierIncoterm||r.clientIncoterm===r.supplierIncoterm}/><Compare label="Paiements" a={`Reçu ${money(r.customerReceived,r.saleCurrency)}`} b={`Payé ${money(r.supplierPaid,r.saleCurrency)}`} ok={r.cashExposure<=0}/><Compare label="Conditions" a={r.project.terms_code?`${r.project.terms_code} ${r.project.terms_version??''}`:'Non rattachées'} b={r.po?.purchase_terms_code?`${r.po.purchase_terms_code} ${r.po.purchase_terms_version??''}`:'—'} ok={!!r.project.terms_code&&!!r.po?.purchase_terms_code}/></tbody></table></div></div>
 <div className="card p-5"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/><h3 className="text-sm font-semibold text-navy-900">Risques et contrôles</h3></div><div className="mt-3 space-y-2">{r.risks.length?r.risks.map((x:Risk,i:number)=><div key={i} className={`rounded-lg border px-3 py-2 text-xs ${x.level==='critical'?'border-red-200 bg-red-50 text-red-800':x.level==='warning'?'border-amber-200 bg-amber-50 text-amber-800':'border-blue-100 bg-blue-50 text-blue-800'}`}>{x.label}</div>):<div className="rounded-lg bg-green-50 border border-green-100 px-3 py-3 text-xs text-green-800 flex gap-2"><BadgeCheck className="w-4 h-4"/>Aucune incohérence automatique détectée sur les données disponibles.</div>}</div>{r.control?.reviewer_notes&&<div className="mt-4 border-t pt-3"><div className="text-xs font-medium text-gray-500">Note de revue</div><div className="text-sm text-gray-700 mt-1">{r.control.reviewer_notes}</div></div>}</div>
 </div>}

function ReviewForm({r}:{r:any}){const c=r.control??{};return <form action={saveDealControlAction} className="p-6 space-y-5"><input type="hidden" name="project_id" value={r.project.id}/><div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">Ces budgets servent à estimer la marge avant que les dépenses réelles soient toutes enregistrées. Ils ne remplacent pas les écritures financières.</div><div className="grid md:grid-cols-2 gap-4"><Field name="logistics_budget" label="Budget transport / logistique" value={c.logistics_budget}/><Field name="bank_fees_budget" label="Budget frais bancaires" value={c.bank_fees_budget}/><Field name="inspection_budget" label="Budget inspection / FAT" value={c.inspection_budget}/><Field name="other_cost_budget" label="Autres coûts prévisionnels" value={c.other_cost_budget}/></div><label><span className="text-xs font-medium text-gray-600 block mb-1">Devise des budgets</span><select name="budget_currency" defaultValue={c.budget_currency??r.saleCurrency} className="input h-10"><option>USD</option><option>EUR</option><option>TRY</option><option>GBP</option></select></label><label><span className="text-xs font-medium text-gray-600 block mb-1">Statut de revue</span><select name="review_status" defaultValue={c.review_status??'a_revoir'} className="input h-10"><option value="a_revoir">À revoir</option><option value="revue">Revue</option><option value="validee_avec_reserves">Validée avec réserves</option><option value="validee">Validée</option></select></label><label><span className="text-xs font-medium text-gray-600 block mb-1">Notes de revue</span><textarea name="reviewer_notes" defaultValue={c.reviewer_notes??''} className="input min-h-24"/></label><label><span className="text-xs font-medium text-gray-600 block mb-1">Justification des risques acceptés</span><textarea name="risk_override_reason" defaultValue={c.risk_override_reason??''} className="input min-h-20" placeholder="Obligatoire en pratique lorsqu’un engagement non couvert est volontairement accepté."/></label><div className="flex justify-end border-t pt-4"><button className="btn btn-primary" type="submit">Enregistrer la revue</button></div></form>}
function Field({name,label,value}:{name:string;label:string;value:any}){return <label><span className="text-xs font-medium text-gray-600 block mb-1">{label}</span><input name={name} type="number" min="0" step="0.01" defaultValue={Number(value??0)} className="input h-10"/></label>}
function Metric({label,value,icon:Icon,tone='text-navy-900'}:{label:string;value:any;icon:any;tone?:string}){return <div className="card p-4 flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center"><Icon className="w-4 h-4 text-gray-500"/></div><div><div className="text-xs text-gray-400">{label}</div><div className={`text-xl font-semibold mt-0.5 ${tone}`}>{value}</div></div></div>}
function Mini({label,value,icon:Icon,tone='text-navy-900'}:{label:string;value:string;icon:any;tone?:string}){return <div className="card p-4"><Icon className="w-4 h-4 text-gray-400"/><div className="text-xs text-gray-400 mt-3">{label}</div><div className={`text-sm font-semibold mt-1 ${tone}`}>{value}</div></div>}
function RiskDot({risks}:{risks:Risk[]}){const level=risks.some(r=>r.level==='critical')?'critical':risks.some(r=>r.level==='warning')?'warning':'ok';return <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${level==='critical'?'bg-red-500':level==='warning'?'bg-amber-400':'bg-green-500'}`}/>} 
function ReviewBadge({status}:{status:any}){const s=String(status??'a_revoir');return <span className={`rounded-full px-3 py-1 text-xs ${s==='validee'?'bg-green-50 text-green-700':s==='validee_avec_reserves'?'bg-amber-50 text-amber-700':s==='revue'?'bg-blue-50 text-blue-700':'bg-gray-100 text-gray-600'}`}>{statusLabel[s]??s}</span>}
function Compare({label,a,b,ok}:{label:string;a:string;b:string;ok:boolean}){return <tr><td className="py-3 px-2 font-medium text-gray-600">{label}</td><td className="py-3 px-2 text-navy-900">{a}</td><td className="py-3 px-2 text-navy-900">{b}</td><td className="py-3 px-2">{ok?<span className="text-green-700">✓ Cohérent</span>:<span className="text-amber-700">⚠ À contrôler</span>}</td></tr>}
function Th({children}:{children:any}){return <th className="text-left py-2 px-2 font-medium text-gray-400">{children}</th>}
