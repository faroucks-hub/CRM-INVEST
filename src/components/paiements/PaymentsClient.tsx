'use client'

import { useState, useMemo } from 'react'
import { Plus, Download, AlertTriangle, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import DataTable, { type Column } from '@/components/ui/table/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import PaymentModal from './PaymentModal'
import ConfirmDialog from '@/components/ui/modal/ConfirmDialog'
import { deletePaymentAction } from '@/lib/actions/payments'
import { exportToCSV } from '@/lib/utils/export'
import { formatCurrency, formatDate, sumByCurrency } from '@/lib/utils'
import { CurrencyBreakdown } from '@/components/ui/CurrencyBreakdown'
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS, type PaymentStatusV2, isPaymentLate } from '@/types/sprint4'

interface Props {
  payments:  Record<string,unknown>[]
  transactions: Record<string,unknown>[]
  clients:   {id:string;company_name:string;country:string}[]
  projects:  {id:string;reference:string;name:string;client_id:string}[]
  proformas: {id:string;number:string;client_id:string;total_sell:number;currency:string}[]
  users:     {id:string;full_name:string}[]
  role:string; isAdminOrLead:boolean; currentUserId:string;
}

export default function PaymentsClient({ payments, transactions, clients, projects, proformas, users, role, isAdminOrLead, currentUserId }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editPay,   setEditPay]   = useState<Record<string,unknown>|null>(null)
  const [deleteTarget, setDelete] = useState<Record<string,unknown>|null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClient, setFilterClient] = useState('')

  const filtered = useMemo(() => payments.filter(p => {
    if (filterStatus && p.status !== filterStatus) return false
    if (filterClient && p.client_id !== filterClient) return false
    return true
  }), [payments, filterStatus, filterClient])

  const late      = filtered.filter(p => isPaymentLate(p as never))
  const pending   = filtered.filter(p => !['paye','annule'].includes(String(p.status)))
  const filteredPaymentIds = new Set(filtered.map(payment => String(payment.id)))
  const filteredTransactions = transactions.filter(transaction =>
    filteredPaymentIds.has(String(transaction.payment_id))
  )
  const signedTransactionAmount = (transaction: Record<string,unknown>) =>
    String(transaction.transaction_type) === 'remboursement'
      ? -(Number(transaction.amount) || 0)
      : Number(transaction.amount) || 0

  const pendingByCurrency = sumByCurrency(
    pending,
    payment => Number(payment.balance_remaining) || 0,
    payment => String(payment.currency ?? 'USD')
  )
  const receivedByCurrency = sumByCurrency(
    filteredTransactions,
    signedTransactionAmount,
    transaction => String(transaction.currency ?? 'USD')
  )
  const lateByCurrency = sumByCurrency(
    late,
    payment => Number(payment.balance_remaining) || 0,
    payment => String(payment.currency ?? 'USD')
  )

  // Paiements reçus ce mois
  const thisMonth = new Date()
  thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
  const thisMonthReceivedByCurrency = sumByCurrency(
    filteredTransactions.filter(transaction =>
      transaction.transaction_date &&
      new Date(String(transaction.transaction_date)) >= thisMonth
    ),
    signedTransactionAmount,
    transaction => String(transaction.currency ?? 'USD')
  )

  const columns: Column<Record<string,unknown>>[] = [
    { key:'reference', header:'Référence', sortable:true, render:row=>(
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-navy-900">{String(row.reference)}</span>
          {isPaymentLate(row as never) && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
        </div>
        {Boolean((row.projets_v2 as Record<string,unknown>|null)?.reference)&&
          <div className="text-2xs text-gray-400">Proj: {(row.projets_v2 as Record<string,unknown>).reference as string}</div>}
      </div>
    )},
    { key:'client', header:'Client', render:row=>{
      const c=row.clients as Record<string,unknown>|null
      return <div><div className="text-sm font-medium">{c?.company_name as string??'—'}</div></div>
    }},
    { key:'status', header:'Statut', render:row=>{
      const s=String(row.status) as PaymentStatusV2
      return <StatusBadge label={PAYMENT_STATUS_LABELS[s]??s} color={PAYMENT_STATUS_COLORS[s]}/>
    }},
    { key:'total_amount', header:'Total', sortable:true, render:row=>(
      <div>
        <div className="text-sm font-semibold text-navy-900">{formatCurrency(Number(row.total_amount),String(row.currency??'USD') as 'USD')}</div>
        {Number(row.deposit_received)>0&&<div className="text-xs text-green-600">Reçu: {formatCurrency(Number(row.deposit_received),String(row.currency??'USD') as 'USD')}</div>}
        {Number(row.balance_remaining)>0&&<div className="text-xs text-red-500">Solde: {formatCurrency(Number(row.balance_remaining),String(row.currency??'USD') as 'USD')}</div>}
      </div>
    )},
    { key:'due_date', header:'Échéance', sortable:true, render:row=>{
      const late=isPaymentLate(row as never)
      return row.due_date
        ? <span className={`text-xs ${late?'text-red-500 font-medium':'text-gray-500'}`}>{formatDate(String(row.due_date))}</span>
        : <span className="text-gray-300">—</span>
    }},
    { key:'received_date', header:'Reçu le', render:row=>row.received_date
      ? <span className="text-xs text-green-600">{formatDate(String(row.received_date))}</span>
      : <span className="text-gray-300">—</span>
    },
    { key:'assigned_to', header:'Commercial', render:row=>{
      const u=row.users_profiles as Record<string,unknown>|null
      return <span className="text-xs text-gray-500">{u?.full_name as string??'—'}</span>
    }},
  ]

  async function handleDelete() {
    if (!deleteTarget) return; setDeleting(true)
    const r = await deletePaymentAction(String(deleteTarget.id)); setDeleting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Paiement supprimé'); setDelete(null)
  }

  function handleExport() {
    exportToCSV(filtered,[
      {key:'reference',header:'Référence'},{key:'status',header:'Statut',format:v=>PAYMENT_STATUS_LABELS[v as PaymentStatusV2]??String(v)},
      {key:'total_amount',header:'Total'},{key:'deposit_received',header:'Reçu'},{key:'balance_remaining',header:'Solde'},
      {key:'currency',header:'Devise'},{key:'due_date',header:'Échéance',format:v=>formatDate(String(v))},
      {key:'received_date',header:'Reçu le',format:v=>formatDate(String(v))},
    ],'paiements_ime'); toast.success(`${filtered.length} paiement(s) exporté(s)`)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="page-header">
        <div><h1 className="page-title">Paiements</h1>
        <p className="page-subtitle">{filtered.length} enregistrement{filtered.length>1?'s':''}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn btn-outline btn-sm"><Download className="w-3.5 h-3.5"/> Export</button>
          {isAdminOrLead&&<button onClick={()=>{setEditPay(null);setModalOpen(true)}} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5"/> Nouveau paiement
          </button>}
        </div>
      </div>

      {late.length>0&&(
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0"/>
          <div className="text-sm font-medium text-red-800">
            <span>{late.length} paiement{late.length>1?'s':''} en retard</span>
            <CurrencyBreakdown totals={lateByCurrency} className="mt-1 text-xs" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-gray-400 mb-1">Solde en attente</div>
          <CurrencyBreakdown totals={pendingByCurrency} className="text-lg font-semibold text-amber-600" />
        </div>
        <div className="card p-4"><div className="text-xs text-gray-400 mb-1">En retard</div><div className="text-xl font-semibold text-red-600">{late.length}</div></div>
        <div className="card p-4">
          <div className="text-xs text-gray-400 mb-1">Reçus ce mois</div>
          <CurrencyBreakdown totals={thisMonthReceivedByCurrency} className="text-lg font-semibold text-green-700" />
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-400 mb-1">Total reçu</div>
          <CurrencyBreakdown totals={receivedByCurrency} className="text-lg font-semibold text-navy-900" />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select className="input w-auto text-sm h-9" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto text-sm h-9" value={filterClient} onChange={e=>setFilterClient(e.target.value)}>
          <option value="">Tous les clients</option>
          {clients.map(c=><option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>
        {(filterStatus||filterClient)&&<button onClick={()=>{setFilterStatus('');setFilterClient('')}} className="text-xs text-gray-400 hover:text-gray-700">× Effacer</button>}
      </div>

      <div className="card">
        <DataTable data={filtered} columns={columns} searchable searchPlaceholder="Rechercher..." searchKeys={['reference']}
          pageSize={25} emptyMessage="Aucun paiement" emptySubtext="Créez votre premier suivi de paiement"
          actions={row=>(
            <div className="flex items-center gap-1">
              {isAdminOrLead&&<button onClick={()=>{setEditPay(row);setModalOpen(true)}} className="btn-icon p-1.5"><Edit className="w-3.5 h-3.5"/></button>}
              {role==='admin'&&<button onClick={()=>setDelete(row)} className="btn-icon p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>}
            </div>
          )}
        />
      </div>

      <PaymentModal open={modalOpen} onClose={()=>{setModalOpen(false);setEditPay(null)}}
        payment={editPay} clients={clients} projects={projects} proformas={proformas}
        users={users} isAdminOrLead={isAdminOrLead} currentUserId={currentUserId}/>

      <ConfirmDialog open={!!deleteTarget} onClose={()=>setDelete(null)} onConfirm={handleDelete}
        title="Supprimer ce paiement ?" message={`Le paiement "${deleteTarget?.reference}" sera supprimé.`}
        confirmLabel="Supprimer" loading={deleting} danger/>
    </div>
  )
}
