import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SuppliersClient from '@/components/fournisseurs/SuppliersClient'

export const metadata: Metadata = { title: 'Partenaires' }

function fmtDate(v: string | null | undefined) {
  if (!v) return null
  return new Intl.DateTimeFormat('fr-FR', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(v))
}

export default async function PartenairesPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users_profiles').select('id, role').eq('id', user.id).single()
  const role = profile?.role ?? 'commercial'
  if (role === 'commercial') redirect('/dashboard')

  const { data: suppliers } = await supabase.from('suppliers').select('*').order('company_name')
  const { data: invoices } = await supabase.from('supplier_invoices')
    .select('id,supplier_id,project_id,status,due_date,currency,total_amount')
    .is('voided_at', null)
  const { data: payments } = await supabase.from('supplier_payments')
    .select('id,supplier_id,supplier_invoice_id,currency,amount,transaction_type')
    .is('voided_at', null)

  const invoicePaid = new Map<string, number>()
  for (const p of payments ?? []) {
    if (!p.supplier_invoice_id) continue
    const signed = p.transaction_type === 'remboursement' ? -Number(p.amount ?? 0) : Number(p.amount ?? 0)
    invoicePaid.set(p.supplier_invoice_id, (invoicePaid.get(p.supplier_invoice_id) ?? 0) + signed)
  }

  const enriched = (suppliers ?? []).map(s => {
    const sInvoices = (invoices ?? []).filter(i => i.supplier_id === s.id && !['payee','annulee'].includes(String(i.status)))
      .map(i => ({ ...i, balance: Math.max(0, Number(i.total_amount ?? 0) - (invoicePaid.get(i.id) ?? 0)) }))
      .filter(i => i.balance > 0.001)
    const currencies = new Map<string, number>()
    sInvoices.forEach(i => currencies.set(i.currency, (currencies.get(i.currency) ?? 0) + i.balance))
    const outstanding_label = [...currencies.entries()].map(([c,v])=>`${v.toLocaleString('fr-FR')} ${c}`).join(' · ') || '—'
    const projectIds = new Set(sInvoices.map(i => i.project_id).filter(Boolean))
    const financialDue = sInvoices.map(i=>i.due_date).filter(Boolean).sort()[0] as string|undefined
    const contractDue = s.contract_expiry as string|undefined
    const nextDates = [financialDue, contractDue].filter(Boolean).sort()
    const next = nextDates[0]
    const next_due_label = next ? `${next===contractDue?'Contrat':'Paiement'} · ${fmtDate(next)}` : null
    return { ...s, active_projects_count: projectIds.size, outstanding_label, next_due_date: next ?? null, next_due_label, _open_invoices: sInvoices }
  })

  return <SuppliersClient suppliers={enriched as unknown as Record<string, unknown>[]} role={role}/>
}
