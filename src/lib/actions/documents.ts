'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { LineItem, QuotationStatus, ProformaPaymentStatus } from '@/types/sprint3'

// ── Schémas ───────────────────────────────────────────────────────

const lineItemSchema = z.object({
  sort_order:      z.number().default(0),
  description:     z.string().min(1),
  detail:          z.string().optional(),
  reference:       z.string().optional(),
  quantity:        z.number().min(0.001),
  unit:            z.string().default('unité'),
  unit_sell_price: z.number().min(0),
  discount_pct:    z.number().min(0).max(100).default(0),
  line_total_sell: z.number(),
  unit_buy_price:  z.number().optional(),
  margin_pct:      z.number().optional(),
  line_total_buy:  z.number().optional(),
  notes:           z.string().optional(),
})

const quotationSchema = z.object({
  client_id:       z.string().uuid(),
  opportunity_id:  z.string().uuid().optional().or(z.literal('')),
  assigned_to:     z.string().uuid().optional().or(z.literal('')),
  status_v3:       z.string().default('brouillon'),
  issued_date:     z.string(),
  valid_until:     z.string(),
  currency:        z.string().default('USD'),
  incoterm:        z.string().optional(),
  delivery_delay:  z.string().optional(),
  warranty_terms:  z.string().optional(),
  payment_terms:   z.string().optional(),
  intro_text:      z.string().optional(),
  technical_notes: z.string().optional(),
  notes:           z.string().optional(),
  internal_notes:  z.string().optional(),
  discount_pct:    z.number().default(0),
  items:           z.array(lineItemSchema),
})

const proformaSchema = z.object({
  client_id:         z.string().uuid(),
  quotation_id:      z.string().uuid().optional().or(z.literal('')),
  assigned_to:       z.string().uuid().optional().or(z.literal('')),
  status_v3:         z.string().default('en_attente'),
  issued_date:       z.string(),
  valid_until:       z.string(),
  currency:          z.string().default('USD'),
  incoterm:          z.string().optional(),
  delivery_delay:    z.string().optional(),
  port_destination:  z.string().optional(),
  warranty_terms:    z.string().optional(),
  payment_terms:     z.string().optional(),
  intro_text:        z.string().optional(),
  technical_notes:   z.string().optional(),
  notes:             z.string().optional(),
  internal_notes:    z.string().optional(),
  discount_pct:      z.number().default(0),
  acompte_pct:       z.number().default(30),
  bank_name:         z.string().optional(),
  bank_account:      z.string().optional(),
  bank_swift:        z.string().optional(),
  bank_iban:         z.string().optional(),
  bank_address:      z.string().optional(),
  has_signature:     z.boolean().default(false),
  has_stamp:         z.boolean().default(false),
  items:             z.array(lineItemSchema),
})

// ── Calcul des totaux ─────────────────────────────────────────────
function computeTotals(items: LineItem[], discountPct: number) {
  const subtotal      = items.reduce((s, i) => s + i.line_total_sell, 0)
  const discountAmt   = subtotal * discountPct / 100
  const totalSell     = subtotal - discountAmt
  const totalBuy      = items.reduce((s, i) => s + (i.line_total_buy ?? 0), 0)
  const totalMargin   = totalSell > 0 ? ((totalSell - totalBuy) / totalSell) * 100 : 0
  return { subtotal, discountAmt, totalSell, totalBuy, totalMargin }
}

// ── QUOTATIONS ────────────────────────────────────────────────────

export async function createQuotationAction(data: z.infer<typeof quotationSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = quotationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { items, discount_pct, ...doc } = parsed.data

  // Numéro automatique
  const { data: numberData, error: numErr } = await supabase.rpc('next_quotation_number')
  if (numErr) return { error: 'Erreur numérotation: ' + numErr.message }

  const { subtotal, discountAmt, totalSell, totalBuy, totalMargin } = computeTotals(items as LineItem[], discount_pct)

  const year = new Date().getFullYear()

  const { data: quotation, error: qErr } = await supabase
    .from('quotations')
    .insert({
      ...doc,
      number:         numberData,
      year,
      sequence:       parseInt(numberData.split('-').pop() ?? '1'),
      status:         'brouillon' as const,       // champ original
      status_v3:      doc.status_v3 as QuotationStatus,
      subtotal,
      discount_amount: discountAmt,
      discount_pct,
      total_sell:     totalSell,
      total_buy:      totalBuy,
      total_margin:   totalMargin,
      created_by:     user.id,
      assigned_to:    doc.assigned_to || null,
      opportunity_id: doc.opportunity_id || null,
    })
    .select()
    .single()

  if (qErr) return { error: qErr.message }

  // Insérer les lignes
  if (items.length > 0) {
    const { error: iErr } = await supabase
      .from('quotation_items')
      .insert(items.map((item, idx) => ({
        quotation_id:    quotation.id,
        sort_order:      idx,
        description:     item.description,
        reference:       item.reference || null,
        quantity:        item.quantity,
        unit:            item.unit,
        unit_sell_price: item.unit_sell_price,
        unit_buy_price:  item.unit_buy_price ?? null,
        margin_pct:      item.margin_pct ?? null,
        discount_pct:    item.discount_pct,
        line_total_sell: item.line_total_sell,
        line_total_buy:  item.line_total_buy ?? null,
        notes:           item.notes || null,
        specs:           item.detail ? { detail: item.detail } : {},
      })))
    if (iErr) return { error: iErr.message }
  }

  revalidatePath('/quotations')
  return { data: quotation }
}

export async function updateQuotationAction(
  id: string,
  data: z.infer<typeof quotationSchema>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { items, discount_pct, ...doc } = data
  const { subtotal, discountAmt, totalSell, totalBuy, totalMargin } = computeTotals(items as LineItem[], discount_pct)

  const { error: qErr } = await supabase
    .from('quotations')
    .update({
      ...doc,
      status_v3:       doc.status_v3 as QuotationStatus,
      subtotal,
      discount_amount: discountAmt,
      discount_pct,
      total_sell:      totalSell,
      total_buy:       totalBuy,
      total_margin:    totalMargin,
      assigned_to:     doc.assigned_to || null,
      opportunity_id:  doc.opportunity_id || null,
    })
    .eq('id', id)

  if (qErr) return { error: qErr.message }

  // Remplace toutes les lignes
  await supabase.from('quotation_items').delete().eq('quotation_id', id)
  if (items.length > 0) {
    const { error: iErr } = await supabase
      .from('quotation_items')
      .insert(items.map((item, idx) => ({
        quotation_id:    id,
        sort_order:      idx,
        description:     item.description,
        reference:       item.reference || null,
        quantity:        item.quantity,
        unit:            item.unit,
        unit_sell_price: item.unit_sell_price,
        unit_buy_price:  item.unit_buy_price ?? null,
        margin_pct:      item.margin_pct ?? null,
        discount_pct:    item.discount_pct,
        line_total_sell: item.line_total_sell,
        line_total_buy:  item.line_total_buy ?? null,
        specs:           item.detail ? { detail: item.detail } : {},
      })))
    if (iErr) return { error: iErr.message }
  }

  revalidatePath('/quotations')
  revalidatePath(`/quotations/${id}`)
  return { success: true }
}

export async function updateQuotationStatusAction(id: string, status: QuotationStatus) {
  const supabase = await createClient()
  const extras: Record<string, string> = {}
  if (status === 'approuvee') extras.accepted_at = new Date().toISOString()
  if (status === 'envoyee')   extras.sent_at     = new Date().toISOString()

  const { error } = await supabase
    .from('quotations')
    .update({ status_v3: status, ...extras })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/quotations')
  return { success: true }
}

export async function duplicateQuotationAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Récupère la quotation originale avec ses lignes
  const { data: orig, error: oErr } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', id)
    .single()

  if (oErr || !orig) return { error: 'Quotation introuvable' }

  const { data: newNumber } = await supabase.rpc('next_quotation_number')

  const { id: _id, created_at, updated_at, sent_at, accepted_at, rejected_at,
          quotation_items, number, sequence, ...rest } = orig as Record<string, unknown>

  const { data: newQuot, error: nErr } = await supabase
    .from('quotations')
    .insert({
      ...rest,
      number:     newNumber,
      sequence:   parseInt((newNumber as string).split('-').pop() ?? '1'),
      year:       new Date().getFullYear(),
      status:     'brouillon',
      status_v3:  'brouillon',
      issued_date: new Date().toISOString().split('T')[0],
      created_by: user.id,
    })
    .select()
    .single()

  if (nErr) return { error: nErr.message }

  // Duplique les lignes
  if ((quotation_items as unknown[]).length > 0) {
    const newItems = (quotation_items as Record<string, unknown>[]).map(({ id: _iid, quotation_id, created_at: _ca, ...item }) => ({
      ...item,
      quotation_id: (newQuot as Record<string, unknown>).id,
    }))
    await supabase.from('quotation_items').insert(newItems)
  }

  revalidatePath('/quotations')
  return { data: newQuot }
}

export async function deleteQuotationAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('quotations')
    .update({ status_v3: 'annulee' as QuotationStatus })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/quotations')
  return { success: true }
}

// ── PROFORMAS ─────────────────────────────────────────────────────

export async function createProformaAction(data: z.infer<typeof proformaSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = proformaSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { items, discount_pct, ...doc } = parsed.data
  const { subtotal, discountAmt, totalSell, totalBuy, totalMargin } = computeTotals(items as LineItem[], discount_pct)

  const { data: numberData } = await supabase.rpc('next_proforma_number')
  const acompteAmount = totalSell * doc.acompte_pct / 100
  const year = new Date().getFullYear()

  const { data: proforma, error: pErr } = await supabase
    .from('proformas')
    .insert({
      ...doc,
      number:          numberData,
      year,
      sequence:        parseInt((numberData as string).split('-').pop() ?? '1'),
      status:          'brouillon' as const,
      payment_status:  doc.status_v3 as ProformaPaymentStatus,
      subtotal,
      discount_amount: discountAmt,
      total_sell:      totalSell,
      total_buy:       totalBuy,
      total_margin:    totalMargin,
      acompte_amount:  acompteAmount,
      created_by:      user.id,
      assigned_to:     doc.assigned_to || null,
      quotation_id:    doc.quotation_id || null,
    })
    .select()
    .single()

  if (pErr) return { error: pErr.message }

  // Lignes
  if (items.length > 0) {
    await supabase.from('proforma_items').insert(
      items.map((item, idx) => ({
        proforma_id:     (proforma as Record<string, unknown>).id,
        sort_order:      idx,
        description:     item.description,
        reference:       item.reference || null,
        quantity:        item.quantity,
        unit:            item.unit,
        unit_sell_price: item.unit_sell_price,
        unit_buy_price:  item.unit_buy_price ?? null,
        margin_pct:      item.margin_pct ?? null,
        discount_pct:    item.discount_pct,
        line_total_sell: item.line_total_sell,
        line_total_buy:  item.line_total_buy ?? null,
        country_origin:  'Turquie',
        specs:           item.detail ? { detail: item.detail } : {},
      }))
    )
  }

  revalidatePath('/proformas')
  return { data: proforma }
}

export async function updateProformaStatusAction(id: string, status: ProformaPaymentStatus) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('proformas')
    .update({ payment_status: status, status_v3: status })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/proformas')
  return { success: true }
}

export async function createProformaFromQuotationAction(quotationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: quot, error: qErr } = await supabase
    .from('quotations')
    .select('*, quotation_items(*)')
    .eq('id', quotationId)
    .single()

  if (qErr || !quot) return { error: 'Quotation introuvable' }

  const q = quot as Record<string, unknown>
  const qItems = q.quotation_items as Record<string, unknown>[]

  const { data: numberData } = await supabase.rpc('next_proforma_number')
  const year = new Date().getFullYear()
  const acompteAmount = (q.total_sell as number) * 0.3

  const { data: proforma, error: pErr } = await supabase
    .from('proformas')
    .insert({
      number:          numberData,
      year,
      sequence:        parseInt((numberData as string).split('-').pop() ?? '1'),
      client_id:       q.client_id,
      quotation_id:    quotationId,
      assigned_to:     q.assigned_to || null,
      status:          'brouillon',
      payment_status:  'en_attente',
      status_v3:       'en_attente',
      issued_date:     new Date().toISOString().split('T')[0],
      valid_until:     q.valid_until,
      currency:        q.currency,
      incoterm:        q.incoterm,
      delivery_delay:  q.delivery_delay,
      warranty_terms:  q.warranty_terms,
      payment_terms:   q.payment_terms,
      intro_text:      q.intro_text,
      notes:           q.notes,
      subtotal:        q.subtotal,
      discount_amount: q.discount_amount,
      total_sell:      q.total_sell,
      total_buy:       q.total_buy,
      total_margin:    q.total_margin,
      acompte_pct:     30,
      acompte_amount:  acompteAmount,
      paid_amount:     0,
      created_by:      user.id,
    })
    .select()
    .single()

  if (pErr) return { error: pErr.message }

  // Copie les lignes
  if (qItems.length > 0) {
    await supabase.from('proforma_items').insert(
      qItems.map(({ id: _id, quotation_id, created_at, ...item }) => ({
        ...item,
        proforma_id:    (proforma as Record<string, unknown>).id,
        country_origin: 'Turquie',
      }))
    )
  }

  revalidatePath('/proformas')
  return { data: proforma }
}

export async function deleteProformaAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('proformas')
    .update({ payment_status: 'annule' as ProformaPaymentStatus })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/proformas')
  return { success: true }
}
