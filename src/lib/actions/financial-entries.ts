'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  FINANCIAL_CURRENCIES,
  type FinancialEntryPayload,
} from '@/types/financial'

type Role = 'admin' | 'lead_team' | 'commercial'

async function getActor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null, role: null }

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, role: (profile?.role ?? null) as Role | null }
}

function validatePayload(data: FinancialEntryPayload) {
  if (!FINANCIAL_CURRENCIES.includes(data.currency)) return 'Devise non autorisée'
  if (!Number.isFinite(data.amount) || data.amount <= 0) return 'Le montant doit être supérieur à zéro'
  if ((data.paid_amount ?? 0) < 0) return 'Le montant réglé ne peut pas être négatif'
  if ((data.paid_amount ?? 0) > data.amount) return 'Le montant réglé ne peut pas dépasser le total'
  if (!data.issue_date) return 'La date est obligatoire'
  if (data.due_date && data.due_date < data.issue_date) {
    return 'La date d’échéance ne peut pas précéder la date d’origine'
  }
  return null
}

function refreshFinancialPages() {
  revalidatePath('/rapports')
  revalidatePath('/rapports/saisie-financiere')
  revalidatePath('/paiements')
}

export async function createFinancialEntryAction(data: FinancialEntryPayload) {
  const { supabase, user, role } = await getActor()
  if (!user) return { error: 'Non authentifié' }
  if (!role || role === 'commercial') return { error: 'Accès non autorisé' }
  if (['depense', 'dette'].includes(data.kind) && role !== 'admin') {
    return { error: 'Les coûts et dettes sont réservés à l’administrateur' }
  }

  const invalid = validatePayload(data)
  if (invalid) return { error: invalid }

  const base = {
    currency: data.currency,
    created_by: user.id,
    notes: data.notes?.trim() || null,
  }

  if (data.kind === 'vente' || data.kind === 'creance') {
    if (!data.client_id) return { error: 'Client requis' }

    const paid = data.kind === 'creance' ? 0 : Number(data.paid_amount ?? 0)
    const status = data.kind === 'creance'
      ? (data.due_date && data.due_date < new Date().toISOString().slice(0, 10) ? 'en_retard' : 'emise')
      : paid >= data.amount ? 'payee' : paid > 0 ? 'partiellement_payee' : 'emise'

    const { data: invoice, error } = await supabase
      .from('sales_invoices')
      .insert({
        ...base,
        client_id: data.client_id,
        project_id: data.project_id || null,
        assigned_to: data.assigned_to || user.id,
        status,
        issue_date: data.issue_date,
        due_date: data.due_date || null,
        subtotal: data.amount,
        tax_amount: 0,
        total_amount: data.amount,
        external_number: data.external_reference?.trim() || null,
        internal_notes: data.description?.trim() || null,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    if (paid > 0) {
      const { error: receiptError } = await supabase
        .from('payment_transactions')
        .insert({
          ...base,
          sales_invoice_id: invoice.id,
          client_id: data.client_id,
          project_id: data.project_id || null,
          assigned_to: data.assigned_to || user.id,
          transaction_type: 'encaissement',
          amount: paid,
          transaction_date: data.issue_date,
          payment_method: data.payment_method || null,
          bank_reference: data.bank_reference?.trim() || null,
          is_opening_balance: true,
        })
      if (receiptError) {
        await createAdminClient().from('sales_invoices').delete().eq('id', invoice.id)
        return { error: receiptError.message }
      }
    }
  }

  if (data.kind === 'recette') {
    if (!data.client_id) return { error: 'Client requis' }
    const { error } = await supabase.from('payment_transactions').insert({
      ...base,
      sales_invoice_id: data.sales_invoice_id || null,
      client_id: data.client_id,
      project_id: data.project_id || null,
      assigned_to: data.assigned_to || user.id,
      transaction_type: 'encaissement',
      amount: data.amount,
      transaction_date: data.issue_date,
      payment_method: data.payment_method || null,
      bank_reference: data.bank_reference?.trim() || null,
      is_opening_balance: !data.sales_invoice_id,
    })
    if (error) return { error: error.message }
  }

  if (data.kind === 'depense') {
    if (!data.description?.trim()) return { error: 'Description requise' }
    const status = data.status || 'payee'
    const { error } = await supabase.from('project_expenses').insert({
      ...base,
      project_id: data.project_id || null,
      supplier_id: data.supplier_id || null,
      category: data.category || 'autre',
      status,
      description: data.description.trim(),
      amount: data.amount,
      expense_date: data.issue_date,
      due_date: data.due_date || null,
      paid_date: status === 'payee' ? data.issue_date : null,
      external_reference: data.external_reference?.trim() || null,
    })
    if (error) return { error: error.message }
  }

  if (data.kind === 'dette') {
    if (!data.supplier_id) return { error: 'Fournisseur requis' }
    const paid = Number(data.paid_amount ?? 0)
    const status = paid >= data.amount ? 'payee' : paid > 0 ? 'partiellement_payee' : 'validee'
    const { data: invoice, error } = await supabase
      .from('supplier_invoices')
      .insert({
        ...base,
        supplier_id: data.supplier_id,
        project_id: data.project_id || null,
        supplier_document_number: data.external_reference?.trim() || null,
        status,
        issue_date: data.issue_date,
        due_date: data.due_date || null,
        subtotal: data.amount,
        tax_amount: 0,
        total_amount: data.amount,
        description: data.description?.trim() || null,
      })
      .select('id')
      .single()

    if (error) return { error: error.message }

    if (paid > 0) {
      const { error: paymentError } = await supabase.from('supplier_payments').insert({
        ...base,
        supplier_id: data.supplier_id,
        supplier_invoice_id: invoice.id,
        project_id: data.project_id || null,
        transaction_type: 'paiement',
        amount: paid,
        payment_date: data.issue_date,
        payment_method: data.payment_method || null,
        bank_reference: data.bank_reference?.trim() || null,
      })
      if (paymentError) {
        await createAdminClient().from('supplier_invoices').delete().eq('id', invoice.id)
        return { error: paymentError.message }
      }
    }
  }

  refreshFinancialPages()
  return { success: true }
}

export async function voidFinancialEntryAction(
  kind: FinancialEntryPayload['kind'],
  id: string,
  reason: string,
) {
  const { supabase, user, role } = await getActor()
  if (!user) return { error: 'Non authentifié' }
  if (role !== 'admin') return { error: 'Seul l’administrateur peut annuler une écriture' }
  if (!reason.trim()) return { error: 'Le motif d’annulation est obligatoire' }

  const table = kind === 'recette'
    ? 'payment_transactions'
    : kind === 'depense'
      ? 'project_expenses'
      : kind === 'dette'
        ? 'supplier_invoices'
        : 'sales_invoices'

  const update: Record<string, unknown> = {
    voided_at: new Date().toISOString(),
    voided_by: user.id,
    void_reason: reason.trim(),
  }
  if (table !== 'payment_transactions') update.status = 'annulee'

  if (table === 'sales_invoices') {
    const { error: linkedError } = await supabase
      .from('payment_transactions')
      .update({
        voided_at: update.voided_at,
        voided_by: user.id,
        void_reason: `Annulation de la vente : ${reason.trim()}`,
      })
      .eq('sales_invoice_id', id)
      .is('voided_at', null)
    if (linkedError) return { error: linkedError.message }
  }

  if (table === 'supplier_invoices') {
    const { error: linkedError } = await supabase
      .from('supplier_payments')
      .update({
        voided_at: update.voided_at,
        voided_by: user.id,
        void_reason: `Annulation de la dette : ${reason.trim()}`,
      })
      .eq('supplier_invoice_id', id)
      .is('voided_at', null)
    if (linkedError) return { error: linkedError.message }
  }

  const { error } = await supabase.from(table).update(update).eq('id', id)
  if (error) return { error: error.message }

  refreshFinancialPages()
  return { success: true }
}
