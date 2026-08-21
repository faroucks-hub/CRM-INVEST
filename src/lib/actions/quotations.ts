'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { QuotationLine } from '@/types/sprint3'
import { getActionContext as getBaseActionContext, roleDenied, type ActionResult } from '@/lib/auth/action-context'

const getActionContext = () => getBaseActionContext('quotations')

export interface QuotationPayload {
  client_id: string
  opportunity_id?: string
  assigned_to?: string
  template_id?: string

  quotation_type?: 'quick' | 'industrial' | 'full_proposal'

  issued_date: string
  valid_until: string
  validity_days?: number

  currency: string
  incoterm?: string
  delivery_delay?: string
  warranty?: string
  payment_terms?: string
  commercial_role?: 'facilitation' | 'resale' | 'distribution'
  terms_profile_id?: string

  client_contact_name?: string
  scope_of_supply?: string
  exclusions?: string

  intro_text?: string
  technical_notes?: string
  notes?: string
  internal_notes?: string

  discount_global: number

  lines: Omit<QuotationLine, 'id' | 'quotation_id' | 'created_at'>[]
}

function calcTotals(
  lines: {
    unit_price_sell: number
    quantity: number
    discount_pct: number
  }[],
  discGlobal: number
) {
  const subtotal = lines.reduce((sum, line) => {
    const lineTotal =
      Math.round(
        line.quantity *
          line.unit_price_sell *
          (1 - line.discount_pct / 100) *
          100
      ) / 100

    return sum + lineTotal
  }, 0)

  const total =
    Math.round(subtotal * (1 - discGlobal / 100) * 100) / 100

  return { subtotal, total }
}

async function resolveCustomerTerms(supabase: any, profileId?: string) {
  if (!profileId) return { commercial_role:null, terms_profile_id:null, terms_code:null, terms_version:null, terms_snapshot:null }
  const { data, error } = await supabase.from('commercial_terms_profiles')
    .select('id,code,version,commercial_role,audience,status,terms_text')
    .eq('id', profileId).single()
  if (error || !data || data.audience !== 'customer') throw new Error('Profil de conditions commerciales invalide')
  return {
    commercial_role: data.commercial_role,
    terms_profile_id: data.id,
    terms_code: data.code,
    terms_version: data.version,
    terms_snapshot: data.terms_text,
  }
}

export async function getQuotationTemplate(templateId: string): Promise<ActionResult<any>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('quotation_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function createQuotationAction(data: QuotationPayload): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  const { data: number, error: numErr } = await supabase.rpc(
    'get_next_doc_number',
    { p_type: 'quotation', p_prefix: 'Q' }
  )

  if (numErr) {
    return { error: numErr.message }
  }

  let template: any = null

  if (data.template_id) {
    const { data: templateData } = await supabase
      .from('quotation_templates')
      .select('*')
      .eq('id', data.template_id)
      .single()

    template = templateData
  }

  const linesWithTotals = data.lines.map((line) => ({
    ...line,
    line_total_sell:
      Math.round(
        line.quantity *
          line.unit_price_sell *
          (1 - line.discount_pct / 100) *
          100
      ) / 100,
  }))

  const { subtotal, total } = calcTotals(
    data.lines,
    data.discount_global
  )

  let termsFields
  try { termsFields = await resolveCustomerTerms(supabase, data.terms_profile_id) }
  catch (e) { return { error: e instanceof Error ? e.message : 'Conditions commerciales invalides' } }

  const { data: quotation, error } = await supabase
    .from('quotations_v2')
    .insert({
      number,
      status: 'brouillon',

      client_id: data.client_id,
      opportunity_id: data.opportunity_id || null,
      assigned_to: ctx.role === 'commercial' ? user.id : (data.assigned_to || user.id),

      template_id: data.template_id || null,
      quotation_type:
        data.quotation_type ||
        template?.quotation_type ||
        'industrial',

      issued_date: data.issued_date,
      valid_until: data.valid_until,
      validity_days:
        data.validity_days || template?.validity_days || 30,

      currency: data.currency || template?.currency || 'USD',

      incoterm:
        data.incoterm || template?.incoterm || 'EXW Istanbul',

      delivery_delay:
        data.delivery_delay ||
        template?.delivery_terms ||
        '6 à 8 semaines',

      warranty:
        data.warranty ||
        template?.warranty_terms ||
        'Garantie fabricant 2 ans',

      payment_terms:
        data.payment_terms ||
        template?.payment_terms ||
        'Acompte 30% à la commande, solde avant expédition',

      client_contact_name: data.client_contact_name || null,

      scope_of_supply:
        data.scope_of_supply || template?.scope_of_supply || null,

      exclusions:
        data.exclusions || template?.exclusions || null,

      intro_text: data.intro_text || null,
      technical_notes: data.technical_notes || null,
      notes: data.notes || template?.notes || null,
      internal_notes: data.internal_notes || null,

      discount_global: data.discount_global,
      subtotal,
      total_sell: total,
      ...termsFields,

      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  if (linesWithTotals.length) {
    const { error: lineError } = await supabase
      .from('quotation_lines')
      .insert(
        linesWithTotals.map((line, index) => ({
          ...line,
          quotation_id: quotation.id,
          sort_order: index,
        }))
      )

    if (lineError) {
      await createAdminClient().from('quotations_v2').delete().eq('id', quotation.id)
      return { error: lineError.message }
    }
  }

  revalidatePath('/quotations')

  return { data: quotation }
}

export async function updateQuotationAction(
  id: string,
  data: Partial<QuotationPayload> & { status?: string }
): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  if (ctx.role === 'commercial') {
    const { data: owned } = await supabase.from('quotations_v2')
      .select('assigned_to,status').eq('id', id).single()
    if (!owned || owned.assigned_to !== user.id || owned.status !== 'brouillon') return roleDenied()
    delete data.assigned_to
    delete data.internal_notes
  }

  const updateData: Record<string, unknown> = { ...data }
  let previousLines: Record<string, unknown>[] | null = null

  delete updateData.lines
  if (Object.prototype.hasOwnProperty.call(data, 'terms_profile_id')) {
    try { Object.assign(updateData, await resolveCustomerTerms(supabase, data.terms_profile_id)) }
    catch (e) { return { error: e instanceof Error ? e.message : 'Conditions commerciales invalides' } }
  }

  if (data.lines) {
    const { data: previousData, error: previousError } = await supabase
      .from('quotation_lines')
      .select('*')
      .eq('quotation_id', id)
      .order('sort_order')
    if (previousError) return { error: previousError.message }
    previousLines = previousData

    const linesWithTotals = data.lines.map((line) => ({
      ...line,
      line_total_sell:
        Math.round(
          line.quantity *
            line.unit_price_sell *
            (1 - line.discount_pct / 100) *
            100
        ) / 100,
    }))

    const { subtotal, total } = calcTotals(
      data.lines,
      data.discount_global ?? 0
    )

    updateData.subtotal = subtotal
    updateData.total_sell = total

    const { error: deleteError } = await supabase
      .from('quotation_lines')
      .delete()
      .eq('quotation_id', id)
    if (deleteError) return { error: deleteError.message }

    if (linesWithTotals.length) {
      const { error: insertError } = await supabase.from('quotation_lines').insert(
        linesWithTotals.map((line, index) => ({
          ...line,
          quotation_id: id,
          sort_order: index,
        }))
      )
      if (insertError) {
        if (previousLines?.length) {
          await createAdminClient().from('quotation_lines').insert(previousLines)
        }
        return { error: insertError.message }
      }
    }
  }

  const { data: updated, error } = await supabase
    .from('quotations_v2')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (data.lines && previousLines) {
      const admin = createAdminClient()
      await admin.from('quotation_lines').delete().eq('quotation_id', id)
      if (previousLines.length) await admin.from('quotation_lines').insert(previousLines)
    }
    return { error: error.message }
  }

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${id}`)

  return { data: updated }
}

export async function duplicateQuotationAction(id: string): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  const { data: original } = await supabase
    .from('quotations_v2')
    .select('*')
    .eq('id', id)
    .single()

  if (!original) {
    return { error: 'Quotation introuvable' }
  }
  if (ctx.role === 'commercial' && original.assigned_to !== user.id) return roleDenied()

  const { data: lines } = await supabase
    .from('quotation_lines')
    .select('*')
    .eq('quotation_id', id)
    .order('sort_order')

  const { data: number } = await supabase.rpc(
    'get_next_doc_number',
    { p_type: 'quotation', p_prefix: 'Q' }
  )

  const {
    id: _id,
    number: _number,
    created_at: _createdAt,
    updated_at: _updatedAt,
    sent_at: _sentAt,
    approved_at: _approvedAt,
    ...rest
  } = original

  const { data: newQuotation, error } = await supabase
    .from('quotations_v2')
    .insert({
      ...rest,
      number,
      status: 'brouillon',
      assigned_to: ctx.role === 'commercial' ? user.id : original.assigned_to,
      created_by: user.id,
      issued_date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  if (lines?.length) {
    await supabase.from('quotation_lines').insert(
      lines.map(
        ({
          id: _lineId,
          quotation_id: _quotationId,
          created_at: _createdAt,
          ...line
        }) => ({
          ...line,
          quotation_id: newQuotation.id,
        })
      )
    )
  }

  revalidatePath('/quotations')

  return { data: newQuotation }
}

export async function changeQuotationStatusAction(
  id: string,
  status: string,
  reason?: string
): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  const allowedStatuses = ctx.role === 'commercial'
    ? ['brouillon', 'envoyee', 'perdue']
    : ['brouillon', 'envoyee', 'approuvee', 'refusee', 'expiree', 'perdue']
  if (!allowedStatuses.includes(status)) return roleDenied()
  if (ctx.role === 'commercial') {
    const { data: owned } = await supabase.from('quotations_v2')
      .select('assigned_to').eq('id', id).single()
    if (!owned || owned.assigned_to !== user.id) return roleDenied()
  }

  const extra: Record<string, unknown> = { status }

  if (status === 'envoyee') {
    extra.sent_at = new Date().toISOString()
  }

  if (status === 'approuvee') {
    extra.approved_at = new Date().toISOString()
  }

  if (status === 'perdue') {
    extra.lost_at = new Date().toISOString()

    if (reason) {
      extra.lost_reason = reason
    }
  }

  const { error } = await supabase
    .from('quotations_v2')
    .update(extra)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${id}`)

  return { success: true }
}

export async function deleteQuotationAction(id: string): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Seul un administrateur peut supprimer un devis' }
  const { supabase } = ctx

  await supabase
    .from('quotation_lines')
    .delete()
    .eq('quotation_id', id)

  const { error } = await supabase
    .from('quotations_v2')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/quotations')

  return { success: true }
}

export async function getQuotationDetailsAction(id: string): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx
  const canSeeCosts = ctx.isPrivileged

  const quotationDb = supabase as any
  const { data, error } = await quotationDb
    .from('quotations_v2')
    .select(canSeeCosts
      ? '*, lines:quotation_lines(*)'
      : `id, number, status, issued_date, valid_until, currency,
         subtotal, discount_global, total_sell, payment_terms,
         delivery_delay, warranty, notes, client_id, opportunity_id,
         assigned_to,
         lines:quotation_lines(
           id, quotation_id, product_id, sort_order, designation,
           description, reference, quantity, unit, unit_price_sell,
           discount_pct, line_total_sell, notes
         )`)
    .eq('id', id)
    .single()

  if (error) {
    return { error: error.message }
  }
  if (ctx.role === 'commercial' && data.assigned_to !== user.id) return roleDenied()

  return { data }
}
