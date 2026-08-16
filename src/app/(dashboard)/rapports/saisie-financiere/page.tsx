import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FinancialEntriesClient from '@/components/finance/FinancialEntriesClient'
import type { FinancialCurrency, ManualFinancialEntry } from '@/types/financial'

export const metadata: Metadata = { title: 'Saisie financière' }

type JoinedName = { company_name?: string; name?: string } | null

export default async function FinancialEntryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = String(profile?.role ?? 'commercial')
  if (role === 'commercial') redirect('/rapports')

  const [
    clientsResult,
    suppliersResult,
    projectsResult,
    usersResult,
    invoicesResult,
    receiptsResult,
    expensesResult,
    debtsResult,
    supplierPaymentsResult,
  ] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('is_archived', false).order('company_name'),
    role === 'admin'
      ? supabase.from('suppliers').select('id, company_name').eq('is_active', true).order('company_name')
      : Promise.resolve({ data: [] }),
    supabase.from('projets_v2').select('id, reference, name, client_id').order('reference'),
    supabase.from('users_profiles').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('sales_invoices')
      .select('id, reference, client_id, issue_date, due_date, total_amount, currency, status, external_number, clients(company_name)')
      .neq('status', 'annulee').order('issue_date', { ascending: false }).limit(100),
    supabase.from('payment_transactions')
      .select('id, reference, sales_invoice_id, client_id, transaction_date, amount, currency, transaction_type, bank_reference, is_opening_balance, clients(company_name)')
      .is('voided_at', null).order('transaction_date', { ascending: false }).limit(100),
    role === 'admin'
      ? supabase.from('project_expenses')
        .select('id, reference, description, expense_date, due_date, amount, currency, status, external_reference')
        .neq('status', 'annulee').order('expense_date', { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
    role === 'admin'
      ? supabase.from('supplier_invoices')
        .select('id, reference, issue_date, due_date, total_amount, currency, status, description, suppliers(company_name)')
        .neq('status', 'annulee').order('issue_date', { ascending: false }).limit(100)
      : Promise.resolve({ data: [] }),
    role === 'admin'
      ? supabase.from('supplier_payments')
        .select('supplier_invoice_id, amount, transaction_type, currency')
        .is('voided_at', null)
      : Promise.resolve({ data: [] }),
  ])

  const receiptByInvoice = new Map<string, number>()
  for (const row of receiptsResult.data ?? []) {
    const invoiceId = (row as Record<string, unknown>).sales_invoice_id
    if (!invoiceId) continue
    const sign = row.transaction_type === 'remboursement' ? -1 : 1
    receiptByInvoice.set(String(invoiceId), (receiptByInvoice.get(String(invoiceId)) ?? 0) + sign * Number(row.amount))
  }

  const paidBySupplierInvoice = new Map<string, number>()
  for (const row of supplierPaymentsResult.data ?? []) {
    if (!row.supplier_invoice_id) continue
    const sign = row.transaction_type === 'remboursement' ? -1 : 1
    paidBySupplierInvoice.set(
      row.supplier_invoice_id,
      (paidBySupplierInvoice.get(row.supplier_invoice_id) ?? 0) + sign * Number(row.amount),
    )
  }

  const invoices = (invoicesResult.data ?? []).map(row => ({
    id: row.id,
    label: `${row.reference} — ${((row.clients as JoinedName)?.company_name ?? 'Client')} — ${Number(row.total_amount).toLocaleString('fr-FR')} ${row.currency}`,
    client_id: row.client_id,
    currency: row.currency,
  }))

  const entries: ManualFinancialEntry[] = [
    ...(invoicesResult.data ?? []).map(row => {
      const paid = receiptByInvoice.get(row.id) ?? 0
      const outstanding = Math.max(Number(row.total_amount) - paid, 0)
      return {
        id: row.id,
        kind: outstanding > 0 ? 'creance' as const : 'vente' as const,
        reference: row.reference,
        third_party: (row.clients as JoinedName)?.company_name ?? '—',
        description: row.external_number,
        date: row.issue_date,
        due_date: row.due_date,
        amount: Number(row.total_amount),
        paid_amount: paid,
        currency: row.currency as FinancialCurrency,
        status: row.status,
      }
    }),
    ...(receiptsResult.data ?? []).map(row => ({
      id: row.id,
      kind: 'recette' as const,
      reference: row.reference,
      third_party: (row.clients as JoinedName)?.company_name ?? '—',
      description: row.bank_reference,
      date: row.transaction_date,
      due_date: null,
      amount: Number(row.amount),
      paid_amount: Number(row.amount),
      currency: row.currency as FinancialCurrency,
      status: row.transaction_type,
      is_opening_balance: row.is_opening_balance,
    })),
    ...(expensesResult.data ?? []).map(row => ({
      id: row.id,
      kind: 'depense' as const,
      reference: row.reference,
      third_party: 'Dépense',
      description: row.description ?? row.external_reference,
      date: row.expense_date,
      due_date: row.due_date,
      amount: Number(row.amount),
      paid_amount: row.status === 'payee' ? Number(row.amount) : 0,
      currency: row.currency as FinancialCurrency,
      status: row.status,
    })),
    ...(debtsResult.data ?? []).map(row => ({
      id: row.id,
      kind: 'dette' as const,
      reference: row.reference,
      third_party: (row.suppliers as JoinedName)?.company_name ?? '—',
      description: row.description,
      date: row.issue_date,
      due_date: row.due_date,
      amount: Number(row.total_amount),
      paid_amount: paidBySupplierInvoice.get(row.id) ?? 0,
      currency: row.currency as FinancialCurrency,
      status: row.status,
    })),
  ]

  return (
    <FinancialEntriesClient
      role={role as 'admin' | 'lead_team'}
      currentUserId={user.id}
      entries={entries}
      clients={(clientsResult.data ?? []).map(row => ({ id: row.id, label: row.company_name }))}
      suppliers={(suppliersResult.data ?? []).map(row => ({ id: row.id, label: row.company_name }))}
      projects={(projectsResult.data ?? []).map(row => ({
        id: row.id,
        label: `${row.reference} — ${row.name}`,
        client_id: row.client_id,
      }))}
      users={(usersResult.data ?? []).map(row => ({ id: row.id, label: row.full_name }))}
      invoices={invoices}
    />
  )
}
