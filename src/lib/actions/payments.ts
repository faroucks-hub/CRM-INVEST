'use server'
import { revalidatePath } from 'next/cache'
import { getActionContext as getBaseActionContext, roleDenied, type ActionResult } from '@/lib/auth/action-context'

const getActionContext = () => getBaseActionContext('payments')

export interface PaymentPayload {
  client_id:string; project_id?:string; proforma_id?:string; assigned_to?:string;
  total_amount:number; deposit_expected:number; deposit_received:number;
  currency:string; due_date?:string; received_date?:string; status:string;
  bank_reference?:string; notes?:string;
}

function validatePayment(data: Pick<PaymentPayload, 'total_amount' | 'deposit_expected' | 'deposit_received'>) {
  if (!Number.isFinite(data.total_amount) || data.total_amount <= 0) {
    return 'Le montant total doit être supérieur à zéro'
  }
  if (!Number.isFinite(data.deposit_expected) || data.deposit_expected < 0) {
    return 'L’acompte prévu ne peut pas être négatif'
  }
  if (!Number.isFinite(data.deposit_received) || data.deposit_received < 0) {
    return 'L’acompte reçu ne peut pas être négatif'
  }
  if (data.deposit_expected > data.total_amount || data.deposit_received > data.total_amount) {
    return 'Un acompte ne peut pas dépasser le montant total'
  }
  return null
}

export async function createPaymentAction(data: PaymentPayload): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase, user } = ctx
  const invalid = validatePayment(data)
  if (invalid) return { error: invalid }

  const { data: ref, error: refError } = await supabase.rpc('generate_payment_reference')
  if (refError || !ref) return { error: refError?.message ?? 'Référence de paiement non générée' }
  const balance = data.total_amount - data.deposit_received

  const { data: payment, error } = await supabase
    .from('paiements')
    .insert({
      reference:        ref,
      client_id:        data.client_id,
      project_id:       data.project_id || null,
      proforma_id:      data.proforma_id || null,
      assigned_to:      data.assigned_to || null,
      total_amount:     data.total_amount,
      deposit_expected: data.deposit_expected,
      deposit_received: data.deposit_received,
      balance_remaining:balance,
      currency:         data.currency,
      due_date:         data.due_date || null,
      received_date:    data.received_date || null,
      status:           data.status,
      bank_reference:   data.bank_reference || null,
      notes:            data.notes || null,
      created_by:       user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/paiements')
  return { data: payment }
}

export async function updatePaymentAction(id: string, data: Partial<PaymentPayload>): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const { data: current, error: currentError } = await supabase
    .from('paiements')
    .select('total_amount, deposit_expected, deposit_received')
    .eq('id', id)
    .single()
  if (currentError || !current) return { error: currentError?.message ?? 'Paiement introuvable' }

  const amounts = {
    total_amount: data.total_amount ?? Number(current.total_amount),
    deposit_expected: data.deposit_expected ?? Number(current.deposit_expected),
    deposit_received: data.deposit_received ?? Number(current.deposit_received),
  }
  const invalid = validatePayment(amounts)
  if (invalid) return { error: invalid }
  const balance = amounts.total_amount - amounts.deposit_received

  const { data: updated, error } = await supabase
    .from('paiements')
    .update({
      ...data,
      balance_remaining: balance,
      ...(data.project_id !== undefined ? { project_id: data.project_id || null } : {}),
      ...(data.proforma_id !== undefined ? { proforma_id: data.proforma_id || null } : {}),
      ...(data.assigned_to !== undefined ? { assigned_to: data.assigned_to || null } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/paiements')
  return { data: updated }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Seul un administrateur peut supprimer un paiement' }
  const { supabase } = ctx
  const { error } = await supabase.from('paiements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/paiements')
  return { success: true }
}
