'use client'

import { useState, useMemo } from 'react'
import { Plus, Download, Copy, FileDown, MoreVertical, CheckCircle, XCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import QuotationForm from './QuotationForm'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { changeQuotationStatusAction, duplicateQuotationAction, deleteQuotationAction } from '@/lib/actions/quotations'
import { createProformaFromQuotationAction } from '@/lib/actions/proformas'
import { exportToCSV } from '@/lib/utils/export'
import { formatCurrency, formatDate, sumByCurrency } from '@/lib/utils'
import { CurrencyBreakdown } from '@/components/ui/CurrencyBreakdown'
import { QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS, type QuotationStatus, type Quotation } from '@/types/sprint3'
import { useRouter } from 'next/navigation'


interface Props {
  quotations:Record<string,unknown>[]; clients:{id:string;company_name:string;country:string}[];
  opportunities:{id:string;name:string;client_id:string}[]; users:{id:string;full_name:string}[];
  role:string; isAdminOrLead:boolean; canSeeCosts:boolean; currentUserId:string;
  termsProfiles:{id:string;code:string;name:string;version:string;commercial_role:string;status:string;role_summary?:string|null}[];
}

const STATUS_FLOW:Record<QuotationStatus,QuotationStatus[]> = {
  brouillon:['envoyee'], envoyee:['revisee','approuvee','perdue'],
  revisee:['envoyee','approuvee','perdue'], approuvee:['annulee'],
  perdue:['brouillon'], annulee:[],
}

export default function QuotationsClient({ quotations, clients, opportunities, users, role, isAdminOrLead, canSeeCosts, currentUserId, termsProfiles }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editQuot, setEditQuot] = useState<Quotation | null>(null)
  const [deleteTarget, setDelete] = useState<Record<string,unknown>|null>(null)
  const [deleting, setDeleting] = useState(false)
  const [actionMenu, setActionMenu] = useState<string|null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterAssigned, setFilterAssigned] = useState('')
  const [filterCurrency, setFilterCurrency] = useState('')

  const filtered = useMemo(() => quotations.filter(q => {
    if (filterStatus   && q.status      !== filterStatus)   return false
    if (filterClient   && q.client_id   !== filterClient)   return false
    if (filterAssigned && q.assigned_to !== filterAssigned) return false
    if (filterCurrency && q.currency    !== filterCurrency) return false
    return true
  }), [quotations, filterStatus, filterClient, filterAssigned, filterCurrency])

  const approved   = filtered.filter(q => q.status === 'approuvee')
  const totalSellByCurrency = sumByCurrency(
    filtered,
    q => Number(q.total_sell) || 0,
    q => String(q.currency ?? 'USD')
  )
  const approvedAmountByCurrency = sumByCurrency(
    approved,
    q => Number(q.total_sell) || 0,
    q => String(q.currency ?? 'USD')
  )

  const columns: Column<Record<string,unknown>>[] = [
    { key:'number', header:'Numéro', sortable:true, render:row => (
      <div><div className="text-sm font-semibold text-navy-900">{String(row.number)}</div>
      <div className="text-2xs text-gray-400">{formatDate(String(row.issued_date??row.created_at))}</div></div>
    )},
    { key:'client', header:'Client', render:row => {
      const c=row.clients as Record<string,unknown>|null
      return <div><div className="text-sm font-medium">{c?.company_name as string??'—'}</div>
      <div className="text-xs text-gray-400">{c?.country as string??''}</div></div>
    }},
    { key:'status', header:'Statut', render:row => {
      const s=String(row.status) as QuotationStatus
      return <StatusBadge label={QUOTATION_STATUS_LABELS[s]??s} color={QUOTATION_STATUS_COLORS[s]} />
    }},
    { key:'currency', header:'Devise', render:row => <span className="text-xs font-medium text-gray-600">{String(row.currency)}</span> },
    { key:'total_sell', header:'Montant HT', sortable:true, render:row => (
      <span className="text-sm font-semibold text-navy-900">
        {formatCurrency(Number(row.total_sell), String(row.currency??'USD') as 'USD')}
      </span>
    )},
    { key:'assigned_to', header:'Commercial', render:row => {
      const u=row.users_profiles as Record<string,unknown>|null
      return <span className="text-xs text-gray-500">{u?.full_name as string??'—'}</span>
    }},
    { key:'valid_until', header:'Validité', sortable:true, render:row => {
      const expired=new Date(String(row.valid_until))<new Date()&&!['approuvee','annulee','perdue'].includes(String(row.status))
      return <span className={`text-xs ${expired?'text-red-500 font-medium':'text-gray-400'}`}>{formatDate(String(row.valid_until))}</span>
    }},
  ]

  async function handleDuplicate(id:string) {
    const r=await duplicateQuotationAction(id); if(r.error){toast.error(r.error);return}
    toast.success('Quotation dupliquée'); setActionMenu(null)
  }
  async function handleStatusChange(id:string, status:QuotationStatus) {
    const r=await changeQuotationStatusAction(id,status); if(r.error){toast.error(r.error);return}
    toast.success(`Statut → ${QUOTATION_STATUS_LABELS[status]}`); setActionMenu(null)
  }
async function handleCreateProforma(quotId: string) {
  const r = await createProformaFromQuotationAction(quotId)

  if (r.error) {
    toast.error(r.error)
    return
  }

  toast.success('Proforma créée avec succès')

  setActionMenu(null)

  if ('data' in r && r.data?.id) {
    router.push('/proformas')
  }
}

  async function handleDelete() {
    if(!deleteTarget)return; setDeleting(true)
    const r=await deleteQuotationAction(String(deleteTarget.id)); setDeleting(false)
    if(r.error){toast.error(r.error);return}; toast.success('Quotation supprimée'); setDelete(null)
  }
  function handleExport() {
    exportToCSV(filtered,[
      {key:'number',header:'Numéro'},{key:'status',header:'Statut',format:v=>QUOTATION_STATUS_LABELS[v as QuotationStatus]??String(v)},
      {key:'issued_date',header:'Date',format:v=>formatDate(String(v))},{key:'currency',header:'Devise'},
      {key:'total_sell',header:'Montant HT'},
    ],'quotations_ime'); toast.success(`${filtered.length} quotation(s) exportée(s)`)
  }
const router = useRouter()

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div><h1 className="page-title">Quotations (Devis)</h1>
        <p className="page-subtitle">{filtered.length} document{filtered.length>1?'s':''}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm"><Download className="w-3.5 h-3.5"/> Export</button>
          <button onClick={()=>{setEditQuot(null);setFormOpen(true)}} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5"/> Nouvelle quotation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-400 mb-1">Total pipeline</div>
          <CurrencyBreakdown
            totals={totalSellByCurrency}
            className="text-lg font-semibold text-navy-900"
          />
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-400 mb-1">Approuvées</div>
          <div className="text-xl font-semibold text-green-700">{approved.length}</div>
          <CurrencyBreakdown
            totals={approvedAmountByCurrency}
            className="text-xs text-gray-400"
          />
        </div>
        <div className="card p-4"><div className="text-xs text-gray-400 mb-1">Brouillons</div><div className="text-xl font-semibold text-gray-700">{filtered.filter(q=>q.status==='brouillon').length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-400 mb-1">Taux de succès</div><div className="text-xl font-semibold text-navy-900">{quotations.length>0?Math.round(quotations.filter(q=>q.status==='approuvee').length/quotations.length*100):0}%</div></div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select className="input w-auto text-sm h-9" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(QUOTATION_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterClient} onChange={e=>setFilterClient(e.target.value)}>
          <option value="">Tous les clients</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        {isAdminOrLead&&<select className="input w-auto text-sm h-9" value={filterAssigned} onChange={e=>setFilterAssigned(e.target.value)}>
          <option value="">Tous les commerciaux</option>
          {users.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>}
        <select className="input w-auto text-sm h-9" value={filterCurrency} onChange={e=>setFilterCurrency(e.target.value)}>
          <option value="">Toutes devises</option>
          {['USD','EUR','TRY','XOF'].map(c=><option key={c}>{c}</option>)}
        </select>
        {(filterStatus||filterClient||filterAssigned||filterCurrency)&&
          <button onClick={()=>{setFilterStatus('');setFilterClient('');setFilterAssigned('');setFilterCurrency('')}} className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>}
      </div>

      <div className="card">
        <DataTable data={filtered} columns={columns} searchable searchPlaceholder="Rechercher..." searchKeys={['number']}
          pageSize={25} emptyMessage="Aucune quotation" emptySubtext="Créez votre premier devis"
          onRowClick={row => {
  router.push(`/quotations/${row.id}`)
}}
          actions={row=>(
            <div className="flex items-center gap-1 relative">
              <div className="relative">
                <button onClick={e=>{e.stopPropagation();setActionMenu(m=>m===String(row.id)?null:String(row.id))}} className="btn-icon p-1.5">
                  <MoreVertical className="w-3.5 h-3.5"/>
                </button>
                {actionMenu===String(row.id)&&(
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-100 rounded-lg shadow-lg z-20 py-1 animate-fade-up" onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>handleDuplicate(String(row.id))} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Copy className="w-4 h-4"/> Dupliquer</button>
                    {(STATUS_FLOW[String(row.status) as QuotationStatus]??[]).map(s=>(
                      <button key={s} onClick={()=>handleStatusChange(String(row.id),s)} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        {s==='approuvee'?<CheckCircle className="w-4 h-4 text-green-500"/>:s==='perdue'?<XCircle className="w-4 h-4 text-red-400"/>:<Send className="w-4 h-4 text-blue-500"/>}
                        → {QUOTATION_STATUS_LABELS[s]}
                      </button>
                    ))}
                    {String(row.status)==='approuvee'&&isAdminOrLead&&(
                      <button onClick={()=>handleCreateProforma(String(row.id))} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 border-t border-gray-100">
                        <Plus className="w-4 h-4"/> Créer proforma
                      </button>
                    )}
                    {isAdminOrLead&&<button onClick={()=>{setDelete(row);setActionMenu(null)}} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100"><XCircle className="w-4 h-4"/> Supprimer</button>}
                  </div>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {actionMenu&&<div className="fixed inset-0 z-10" onClick={()=>setActionMenu(null)}/>}

      <QuotationForm open={formOpen} onClose={()=>{setFormOpen(false);setEditQuot(null)}}
        quotation={editQuot} clients={clients} opportunities={opportunities} users={users}
        isAdminOrLead={isAdminOrLead} canSeeCosts={canSeeCosts} currentUserId={currentUserId}
        termsProfiles={termsProfiles}/>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDelete(null)} onConfirm={handleDelete}
        title="Supprimer cette quotation ?" message={`La quotation "${deleteTarget?.number}" sera supprimée définitivement.`}
        confirmLabel="Supprimer" loading={deleting} danger/>
    </div>
  )
}
