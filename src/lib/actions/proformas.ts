'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProformaLine } from '@/types/sprint3'
import { getActionContext, roleDenied, type ActionResult } from '@/lib/auth/action-context'

export interface ProformaPayload {
  client_id:string; quotation_id?:string; opportunity_id?:string; assigned_to?:string;
  issued_date:string; valid_until:string; currency:string;
  incoterm?:string; port_destination?:string; delivery_delay?:string;
  warranty?:string; payment_terms?:string;
  commercial_role?:'facilitation'|'resale'|'distribution'; terms_profile_id?:string;
  bank_name?:string; bank_iban?:string; bank_swift?:string;
  bank_account?:string; bank_address?:string; bank_currency?:string;
  intro_text?:string; technical_notes?:string; notes?:string; internal_notes?:string;
  has_signature?:boolean; signature_name?:string;
  discount_global:number; amount_received?:number;
  lines: Omit<ProformaLine,'id'|'proforma_id'|'created_at'>[];
}

function calcTotals(lines:{unit_price_sell:number;quantity:number;discount_pct:number}[], discGlobal:number) {
  const subtotal = lines.reduce((s,l) =>
    s + Math.round(l.quantity * l.unit_price_sell * (1-l.discount_pct/100) * 100)/100, 0)
  const total = Math.round(subtotal * (1-discGlobal/100) * 100)/100
  return { subtotal, total }
}

async function resolveCustomerTerms(supabase:any, profileId?:string) {
  if (!profileId) return { commercial_role:null, terms_profile_id:null, terms_code:null, terms_version:null, terms_snapshot:null }
  const {data,error}=await supabase.from('commercial_terms_profiles').select('id,code,version,commercial_role,audience,terms_text').eq('id',profileId).single()
  if(error||!data||data.audience!=='customer') throw new Error('Profil de conditions commerciales invalide')
  return {commercial_role:data.commercial_role,terms_profile_id:data.id,terms_code:data.code,terms_version:data.version,terms_snapshot:data.terms_text}
}

export async function createProformaAction(data: ProformaPayload): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase, user } = ctx

  const { data: number, error: numErr } = await supabase
    .rpc('get_next_doc_number', { p_type: 'proforma', p_prefix: 'F' })
  if (numErr) return { error: numErr.message }

  const linesWithTotals = data.lines.map(l => ({
    ...l, line_total_sell: Math.round(l.quantity * l.unit_price_sell * (1-l.discount_pct/100) * 100)/100,
  }))
  const { subtotal, total } = calcTotals(data.lines, data.discount_global)
  const received = data.amount_received ?? 0
  const balance  = total - received
  let termsFields
  try { termsFields = await resolveCustomerTerms(supabase, data.terms_profile_id) }
  catch(e){ return { error:e instanceof Error?e.message:'Conditions commerciales invalides' } }

  const { data: prof, error } = await supabase
    .from('proformas_v2')
    .insert({
      number, payment_status: 'en_attente',
      client_id:       data.client_id,
      quotation_id:    data.quotation_id || null,
      opportunity_id:  data.opportunity_id || null,
      assigned_to:     data.assigned_to || null,
      issued_date:     data.issued_date,
      valid_until:     data.valid_until,
      currency:        data.currency,
      incoterm:        data.incoterm || 'DAP',
      port_destination:data.port_destination || null,
      delivery_delay:  data.delivery_delay || '6 à 8 semaines',
      warranty:        data.warranty || 'Garantie fabricant 2 ans',
      payment_terms:   data.payment_terms || "Acompte 30% à la commande, solde avant expédition",
      bank_name:       data.bank_name || null,
      bank_iban:       data.bank_iban || null,
      bank_swift:      data.bank_swift || null,
      bank_account:    data.bank_account || null,
      bank_address:    data.bank_address || null,
      bank_currency:   data.bank_currency || null,
      intro_text:      data.intro_text || null,
      technical_notes: data.technical_notes || null,
      notes:           data.notes || null,
      internal_notes:  data.internal_notes || null,
      has_signature:   data.has_signature ?? false,
      signature_name:  data.signature_name || null,
      discount_global: data.discount_global,
      subtotal, total_sell: total,
      amount_received: received,
      balance_due:     balance,
      ...termsFields,
      created_by: user.id,
    })
    .select().single()
  if (error) return { error: error.message }

  if (linesWithTotals.length) {
    const { error: lErr } = await supabase.from('proforma_lines')
      .insert(linesWithTotals.map((l,i) => ({ ...l, proforma_id: prof.id, sort_order: i })))
    if (lErr) {
      await createAdminClient().from('proformas_v2').delete().eq('id', prof.id)
      return { error: lErr.message }
    }
  }

  revalidatePath('/proformas')
  return { data: prof }
}

export async function updateProformaAction(id: string, data: Partial<ProformaPayload> & { payment_status?: string }): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const updateData: Record<string,unknown> = { ...data }
  let previousLines: Record<string, unknown>[] | null = null
  delete updateData.lines
  if (Object.prototype.hasOwnProperty.call(data,'terms_profile_id')) {
    try { Object.assign(updateData, await resolveCustomerTerms(supabase, data.terms_profile_id)) }
    catch(e){ return { error:e instanceof Error?e.message:'Conditions commerciales invalides' } }
  }

  if (data.lines) {
    const { data: previousData, error: previousError } = await supabase
      .from('proforma_lines').select('*').eq('proforma_id', id).order('sort_order')
    if (previousError) return { error: previousError.message }
    previousLines = previousData

    const linesWithTotals = data.lines.map(l => ({
      ...l, line_total_sell: Math.round(l.quantity * l.unit_price_sell * (1-l.discount_pct/100) * 100)/100,
    }))
    const { subtotal, total } = calcTotals(data.lines, data.discount_global ?? 0)
    const received = data.amount_received ?? 0
    updateData.subtotal        = subtotal
    updateData.total_sell      = total
    updateData.amount_received = received
    updateData.balance_due     = total - received

    const { error: deleteError } = await supabase.from('proforma_lines').delete().eq('proforma_id', id)
    if (deleteError) return { error: deleteError.message }
    if (linesWithTotals.length) {
      const { error: insertError } = await supabase.from('proforma_lines').insert(
        linesWithTotals.map((l,i) => ({ ...l, proforma_id: id, sort_order: i }))
      )
      if (insertError) {
        if (previousLines?.length) {
          await createAdminClient().from('proforma_lines').insert(previousLines)
        }
        return { error: insertError.message }
      }
    }
  }

  const { data: updated, error } = await supabase
    .from('proformas_v2').update(updateData).eq('id', id).select().single()
  if (error) {
    if (data.lines && previousLines) {
      const admin = createAdminClient()
      await admin.from('proforma_lines').delete().eq('proforma_id', id)
      if (previousLines.length) await admin.from('proforma_lines').insert(previousLines)
    }
    return { error: error.message }
  }

  revalidatePath('/proformas')
  revalidatePath(`/proformas/${id}`)
  return { data: updated }
}

export async function createProformaFromQuotationAction(quotationId: string): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const { data: quot } = await supabase
    .from('quotations_v2').select('*').eq('id', quotationId).single()
  if (!quot) return { error: 'Quotation introuvable' }

  const { data: lines } = await supabase
    .from('quotation_lines').select('*').eq('quotation_id', quotationId).order('sort_order')

  const proformaLines = (lines ?? []).map(({
    id:_, quotation_id:__, created_at:___, ...l
  }) => ({ ...l, hs_code: null, country_origin: 'Turquie' }))

  return createProformaAction({
    client_id:      quot.client_id,
    quotation_id:   quotationId,
    opportunity_id: quot.opportunity_id,
    assigned_to:    quot.assigned_to,
    issued_date:    new Date().toISOString().split('T')[0],
    valid_until:    new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    currency:       quot.currency,
    incoterm:       quot.incoterm,
    delivery_delay: quot.delivery_delay,
    warranty:       quot.warranty,
    payment_terms:  quot.payment_terms,
    commercial_role: quot.commercial_role,
    terms_profile_id: quot.terms_profile_id,
    technical_notes:quot.technical_notes,
    notes:          quot.notes,
    discount_global:quot.discount_global,
    has_signature:  false,
    amount_received: 0,
    lines: proformaLines,
  })
}

export async function deleteProformaAction(id: string): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Seul un administrateur peut supprimer une proforma' }
  const { supabase } = ctx
  await supabase.from('proforma_lines').delete().eq('proforma_id', id)
  const { error } = await supabase.from('proformas_v2').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/proformas')
  return { success: true }
}

export async function getProformaForPdfAction(id: string): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const { data: proforma, error } = await supabase
    .from('proformas_v2')
    .select(`
      *,
      clients(*),
      users_profiles!proformas_v2_assigned_to_fkey(id, full_name),
      quotations_v2(id, number)
    `)
    .eq('id', id)
    .single()

  if (error) {
    return { error: error.message }
  }

  const { data: lines, error: linesError } = await supabase
    .from('proforma_lines')
    .select('*')
    .eq('proforma_id', id)
    .order('sort_order')

  if (linesError) {
    return { error: linesError.message }
  }

  return {
    data: {
      ...proforma,
      client: proforma.clients,
      assigned_user: proforma.users_profiles,
      quotation: proforma.quotations_v2,
      lines: lines ?? [],
    },
  }
}
