'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CalendarClock, Download, ExternalLink, FileText, Mail, MapPin, Phone, Star, AlertTriangle, Building2, Receipt, CreditCard, FolderKanban, Activity, Pencil, Printer } from 'lucide-react'
import SupplierModal from './SupplierModal'
import { SUPPLIER_TYPE_LABELS } from '@/types/sprint2'

interface Props {
  partner: Record<string, unknown>
  invoices: Record<string, unknown>[]
  payments: Record<string, unknown>[]
  projects: Record<string, unknown>[]
  products: Record<string, unknown>[]
  role: string
}

type Tab = 'overview'|'info'|'projects'|'contracts'|'purchases'|'invoices'|'payments'|'documents'|'performance'|'activity'

function fmtDate(value: unknown) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(value)))
}
function fmtMoney(value: number, currency: string) { return `${value.toLocaleString('fr-FR',{maximumFractionDigits:2})} ${currency}` }
function byCurrency(rows: Record<string,unknown>[], key:string, signKey?:string) {
  const map = new Map<string,number>()
  rows.forEach(r=>{ const c=String(r.currency??'USD'); let v=Number(r[key]??0); if(signKey && r[signKey]==='remboursement')v=-v; map.set(c,(map.get(c)??0)+v) })
  return map
}
function mapLabel(m:Map<string,number>){return [...m.entries()].map(([c,v])=>fmtMoney(v,c)).join(' · ')||'—'}

export default function PartnerDetailClient({ partner, invoices, payments, projects, products, role }: Props) {
  const [tab,setTab]=useState<Tab>('overview')
  const [edit,setEdit]=useState(false)
  const canManage=role==='admin'||role==='lead_team'

  const paidByInvoice=useMemo(()=>{const m=new Map<string,number>();payments.forEach(p=>{if(!p.supplier_invoice_id)return;const v=p.transaction_type==='remboursement'?-Number(p.amount??0):Number(p.amount??0);m.set(String(p.supplier_invoice_id),(m.get(String(p.supplier_invoice_id))??0)+v)});return m},[payments])
  const invoiced=byCurrency(invoices.filter(i=>i.status!=='annulee'),'total_amount')
  const paid=byCurrency(payments,'amount','transaction_type')
  const balance=new Map<string,number>(invoiced)
  paid.forEach((v,c)=>balance.set(c,(balance.get(c)??0)-v))
  const activeProjects=projects.filter(p=>!['cloture','annule','livre'].includes(String(p.status)))
  const openInvoices=invoices.filter(i=>!['payee','annulee'].includes(String(i.status)))
  const nextInvoice=openInvoices.filter(i=>i.due_date).sort((a,b)=>String(a.due_date).localeCompare(String(b.due_date)))[0]
  const alerts=[
    nextInvoice ? {title:'Paiement fournisseur',detail:`${String(nextInvoice.reference)} · ${fmtMoney(Math.max(0,Number(nextInvoice.total_amount??0)-(paidByInvoice.get(String(nextInvoice.id))??0)),String(nextInvoice.currency??'USD'))}`,date:fmtDate(nextInvoice.due_date)}:null,
    partner.contract_expiry ? {title:'Contrat / accord',detail:String(partner.contract_name??'Contrat partenaire'),date:`Expiration ${fmtDate(partner.contract_expiry)}`}:null,
    ...activeProjects.filter(p=>p.expected_delivery).slice(0,2).map(p=>({title:'Projet en cours',detail:`${String(p.reference)} · ${String(p.name)}`,date:`Livraison ${fmtDate(p.expected_delivery)}`}))
  ].filter(Boolean) as {title:string;detail:string;date:string}[]

  const tabs:{id:Tab;label:string}[]=[
    {id:'overview',label:'Vue d’ensemble'},{id:'info',label:'Informations'},{id:'projects',label:'Projets'},
    {id:'contracts',label:'Contrats'},{id:'purchases',label:'Achats & commandes'},{id:'invoices',label:'Factures'},
    {id:'payments',label:'Paiements'},{id:'documents',label:'Documents'},{id:'performance',label:'Performance'},{id:'activity',label:'Activité'},
  ]

  return <div className="max-w-7xl mx-auto space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <Link href="/partenaires" className="text-xs text-gray-500 hover:text-navy-900 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5"/>Retour aux partenaires</Link>
      <div className="flex items-center gap-2">
        <button onClick={()=>window.print()} className="btn btn-outline btn-sm"><Printer className="w-3.5 h-3.5"/>Rapport d’activité</button>
        {canManage&&<button onClick={()=>setEdit(true)} className="btn btn-primary btn-sm"><Pencil className="w-3.5 h-3.5"/>Modifier</button>}
      </div>
    </div>

    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 font-bold text-lg">{String(partner.company_name??'').slice(0,2).toUpperCase()}</div>
          <div>
            <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold text-navy-900">{String(partner.company_name)}</h1>{Boolean(partner.is_preferred)&&<Star className="w-4 h-4 text-gold-400 fill-gold-400"/>}</div>
            <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-500">
              <span className="px-2 py-1 rounded-full bg-navy-900/5 text-navy-900">{SUPPLIER_TYPE_LABELS[String(partner.supplier_type) as keyof typeof SUPPLIER_TYPE_LABELS]??String(partner.supplier_type)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{String(partner.city??'')}{partner.city?', ':''}{String(partner.country??'')}</span>
              <span className={Boolean(partner.is_active)?'text-green-700':'text-gray-400'}>{partner.is_active?'● Partenaire actif':'● Inactif'}</span>
            </div>
            {Boolean(partner.products_supplied)&&<p className="mt-2 text-sm text-gray-600">{String(partner.products_supplied)}</p>}
          </div>
        </div>
        <div className="text-right text-xs text-gray-400"><div>{String(partner.reference??'')}</div><div>Relation depuis {fmtDate(partner.relationship_start??partner.created_at)}</div></div>
      </div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {[
        ['Projets actifs',activeProjects.length,'text-navy-900'],['Commandes / dossiers',projects.length,'text-blue-700'],
        ['Facturé',mapLabel(invoiced),'text-violet-700'],['Payé',mapLabel(paid),'text-green-700'],['Solde',mapLabel(balance),'text-amber-700'],['Échéances',alerts.length,alerts.length?'text-red-600':'text-green-700']
      ].map(([l,v,c])=><div key={String(l)} className="card p-4"><div className="text-xs text-gray-400 mb-1">{l}</div><div className={`text-lg font-semibold ${c}`}>{String(v)}</div></div>)}
    </div>

    <div className="border-b border-gray-200 overflow-x-auto"><div className="flex min-w-max gap-1">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2.5 text-xs font-medium border-b-2 ${tab===t.id?'border-gold-400 text-navy-900':'border-transparent text-gray-400 hover:text-gray-700'}`}>{t.label}</button>)}</div></div>

    {tab==='overview'&&<div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <Section title="À surveiller" icon={<AlertTriangle className="w-4 h-4 text-amber-600"/>}>
          {alerts.length?alerts.map((a,i)=><div key={i} className="flex justify-between gap-3 py-3 border-b border-gray-100 last:border-0"><div><div className="text-sm font-medium text-navy-900">{a.title}</div><div className="text-xs text-gray-500 mt-0.5">{a.detail}</div></div><div className="text-xs text-amber-700 whitespace-nowrap">{a.date}</div></div>):<Empty text="Aucune échéance critique actuellement"/>}
        </Section>
        <Section title="Projets actifs" icon={<FolderKanban className="w-4 h-4"/>}>
          {activeProjects.length?activeProjects.slice(0,5).map(p=><Link key={String(p.id)} href={`/projets/${p.id}`} className="block py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-medium text-navy-900">{String(p.reference)} · {String(p.name)}</div><div className="text-xs text-gray-400">{String(p.workflow_stage??p.status??'')}</div></div><div className="text-xs text-gray-500">{Number(p.progress_pct??0)}%</div></div></Link>):<Empty text="Aucun projet actif relié aux factures de ce partenaire"/>}
        </Section>
      </div>
      <div className="space-y-4">
        <Section title="Contact principal" icon={<Building2 className="w-4 h-4"/>}><InfoLine label="Responsable" value={partner.contact_name}/><InfoLine label="Fonction" value={partner.contact_role}/><InfoLine label="Email" value={partner.contact_email} icon={<Mail className="w-3 h-3"/>}/><InfoLine label="Téléphone" value={partner.contact_phone??partner.phone} icon={<Phone className="w-3 h-3"/>}/></Section>
        <Section title="Situation financière" icon={<CreditCard className="w-4 h-4"/>}><InfoLine label="Facturé" value={mapLabel(invoiced)}/><InfoLine label="Payé" value={mapLabel(paid)}/><InfoLine label="Solde" value={mapLabel(balance)} strong/></Section>
      </div>
    </div>}

    {tab==='info'&&<Section title="Informations partenaire" icon={<Building2 className="w-4 h-4"/>}><div className="grid md:grid-cols-2 gap-x-8"><div><InfoLine label="Entreprise" value={partner.company_name}/><InfoLine label="Type" value={SUPPLIER_TYPE_LABELS[String(partner.supplier_type) as keyof typeof SUPPLIER_TYPE_LABELS]}/><InfoLine label="Pays" value={partner.country}/><InfoLine label="Ville" value={partner.city}/><InfoLine label="Site web" value={partner.website}/></div><div><InfoLine label="Contact" value={partner.contact_name}/><InfoLine label="Fonction" value={partner.contact_role}/><InfoLine label="Email" value={partner.contact_email}/><InfoLine label="Téléphone" value={partner.contact_phone??partner.phone}/><InfoLine label="Début de relation" value={fmtDate(partner.relationship_start??partner.created_at)}/></div></div>{Boolean(partner.notes)&&<div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">{String(partner.notes)}</div>}</Section>}

    {tab==='projects'&&<TableSection title="Projets" icon={<FolderKanban className="w-4 h-4"/>} empty="Aucun projet relié à ce partenaire"><table className="table"><thead><tr><th>Référence</th><th>Projet</th><th>Statut</th><th>Avancement</th><th>Livraison</th></tr></thead><tbody>{projects.map(p=><tr key={String(p.id)}><td><Link className="font-medium text-navy-900 hover:text-blue-600" href={`/projets/${p.id}`}>{String(p.reference)}</Link></td><td>{String(p.name)}</td><td>{String(p.status)}</td><td>{Number(p.progress_pct??0)}%</td><td>{fmtDate(p.expected_delivery)}</td></tr>)}</tbody></table></TableSection>}

    {tab==='contracts'&&<Section title="Contrats & accords" icon={<FileText className="w-4 h-4"/>}>{Boolean(partner.contract_name||partner.contract_document_url)?<div className="rounded-lg border border-gray-200 p-4"><div className="flex justify-between gap-3"><div><div className="text-sm font-semibold text-navy-900">{String(partner.contract_name??'Contrat principal')}</div><div className="text-xs text-gray-400 mt-1">Expiration : {fmtDate(partner.contract_expiry)}</div></div>{Boolean(partner.contract_document_url)&&<a href={String(partner.contract_document_url)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="w-3.5 h-3.5"/>Ouvrir</a>}</div></div>:<Empty text="Aucun contrat principal enregistré"/>}</Section>}

    {tab==='purchases'&&<Section title="Achats & commandes" icon={<Receipt className="w-4 h-4"/>}><div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-900"><div className="font-semibold">Cycle Achats opérationnel — Phase 1</div><p className="mt-1 text-xs text-blue-700">RFQ → offre partenaire → comparaison → sélection → Purchase Order → Proforma partenaire.</p><Link href="/achats" className="btn btn-outline btn-sm mt-3">Ouvrir Achats & Commandes</Link></div></Section>}

    {tab==='invoices'&&<TableSection title="Factures fournisseurs" icon={<Receipt className="w-4 h-4"/>} empty="Aucune facture fournisseur"><table className="table"><thead><tr><th>Référence</th><th>N° fournisseur</th><th>Date</th><th>Échéance</th><th>Montant</th><th>Statut</th></tr></thead><tbody>{invoices.map(i=><tr key={String(i.id)}><td className="font-medium text-navy-900">{String(i.reference)}</td><td>{String(i.supplier_document_number??'—')}</td><td>{fmtDate(i.issue_date)}</td><td>{fmtDate(i.due_date)}</td><td className="font-medium">{fmtMoney(Number(i.total_amount??0),String(i.currency??'USD'))}</td><td>{String(i.status)}</td></tr>)}</tbody></table></TableSection>}

    {tab==='payments'&&<TableSection title="Paiements fournisseurs" icon={<CreditCard className="w-4 h-4"/>} empty="Aucun paiement fournisseur"><table className="table"><thead><tr><th>Référence</th><th>Date</th><th>Montant</th><th>Méthode</th><th>Référence banque</th></tr></thead><tbody>{payments.map(p=><tr key={String(p.id)}><td className="font-medium text-navy-900">{String(p.reference)}</td><td>{fmtDate(p.payment_date)}</td><td className="font-medium">{fmtMoney(Number(p.amount??0),String(p.currency??'USD'))}</td><td>{String(p.payment_method??'—')}</td><td>{String(p.bank_reference??'—')}</td></tr>)}</tbody></table></TableSection>}

    {tab==='documents'&&<Section title="Documents partenaire" icon={<FileText className="w-4 h-4"/>}><div className="grid md:grid-cols-2 gap-3"><DocCard title="Contrat / accord principal" value={partner.contract_name} url={partner.contract_document_url}/><DocCard title="Certifications" value={Array.isArray(partner.certifications)?(partner.certifications as string[]).join(', '):'—'}/></div></Section>}

    {tab==='performance'&&<Section title="Performance partenaire" icon={<Activity className="w-4 h-4"/>}><div className="grid sm:grid-cols-4 gap-3">{[['Projets suivis',projects.length],['Factures',invoices.length],['Paiements',payments.length],['Délai standard',partner.lead_time_days?`${partner.lead_time_days} j`:'—']].map(([l,v])=><div key={String(l)} className="rounded-lg border border-gray-200 p-4"><div className="text-xs text-gray-400">{l}</div><div className="mt-1 text-xl font-semibold text-navy-900">{String(v)}</div></div>)}</div><p className="mt-4 text-xs text-gray-400">La notation qualité, respect des délais, réactivité et non-conformités sera alimentée par le futur workflow Achats / FAT / NCR.</p></Section>}

    {tab==='activity'&&<Section title="Rapport d’activité" icon={<Activity className="w-4 h-4"/>}><div className="flex justify-between items-center gap-3 mb-4"><p className="text-sm text-gray-600">Synthèse chronologique des opérations enregistrées pour ce partenaire.</p><button onClick={()=>window.print()} className="btn btn-outline btn-sm"><Download className="w-3.5 h-3.5"/>Exporter / Imprimer</button></div><div className="space-y-1">{[...invoices.map(i=>({date:i.issue_date,title:`Facture ${i.reference}`,detail:`${fmtMoney(Number(i.total_amount??0),String(i.currency??'USD'))} · ${i.status}`})),...payments.map(p=>({date:p.payment_date,title:`Paiement ${p.reference}`,detail:fmtMoney(Number(p.amount??0),String(p.currency??'USD'))})),...projects.map(p=>({date:p.updated_at??p.created_at,title:`Projet ${p.reference}`,detail:String(p.name)}))].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,30).map((x,i)=><div key={i} className="flex gap-4 py-3 border-b border-gray-100 last:border-0"><div className="w-24 text-xs text-gray-400">{fmtDate(x.date)}</div><div><div className="text-sm font-medium text-navy-900">{x.title}</div><div className="text-xs text-gray-500 mt-0.5">{x.detail}</div></div></div>)}</div></Section>}

    <SupplierModal open={edit} onClose={()=>setEdit(false)} supplier={partner}/>
  </div>
}

function Section({title,icon,children}:{title:string;icon?:React.ReactNode;children:React.ReactNode}){return <div className="card p-5"><div className="flex items-center gap-2 mb-3"><span className="text-navy-900">{icon}</span><h2 className="text-sm font-semibold text-navy-900">{title}</h2></div>{children}</div>}
function TableSection({title,icon,children}:{title:string;icon?:React.ReactNode;empty?:string;children:React.ReactNode}){return <Section title={title} icon={icon}><div className="table-wrapper">{children}</div></Section>}
function Empty({text}:{text:string}){return <div className="py-8 text-center text-sm text-gray-400">{text}</div>}
function InfoLine({label,value,icon,strong}:{label:string;value:unknown;icon?:React.ReactNode;strong?:boolean}){return <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0"><span className="text-xs text-gray-400">{label}</span><span className={`text-xs text-right flex items-center gap-1 ${strong?'font-semibold text-navy-900':'text-gray-700'}`}>{icon}{value?String(value):'—'}</span></div>}
function DocCard({title,value,url}:{title:string;value:unknown;url?:unknown}){return <div className="rounded-lg border border-gray-200 p-4"><div className="text-xs text-gray-400">{title}</div><div className="text-sm font-medium text-navy-900 mt-1">{value?String(value):'Non renseigné'}</div>{Boolean(url)&&<a href={String(url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600">Ouvrir le document <ExternalLink className="w-3 h-3"/></a>}</div>}
