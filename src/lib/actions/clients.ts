'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getActionContext as getBaseActionContext, roleDenied, type ActionResult } from '@/lib/auth/action-context'

const getActionContext = () => getBaseActionContext('clients')

const clientSchema = z.object({
  company_name:     z.string().min(1, 'Nom requis'),
  trade_name:       z.string().optional(),
  status:           z.string().default('prospect'),
  country:          z.string().min(1, 'Pays requis'),
  city:             z.string().optional(),
  website:          z.string().optional(),
  linkedin_url:     z.string().optional(),
  sector:           z.string().optional(),
  contact_name:     z.string().optional(),
  contact_title:    z.string().optional(),
  contact_email:    z.string().optional(),
  contact_phone:    z.string().optional(),
  contact_whatsapp: z.string().optional(),
  communication_language: z.enum(['fr', 'en', 'unknown']).default('unknown'),
  communication_market: z.enum(['africa', 'international', 'unknown']).default('unknown'),
  do_not_contact:    z.boolean().default(false),
  contact2_name:    z.string().optional(),
  contact2_email:   z.string().optional(),
  contact2_phone:   z.string().optional(),
  assigned_to:      z.string().optional(),
  lead_source:      z.string().optional(),
  currency_pref:    z.string().default('USD'),
  technical_notes:  z.string().optional(),
  notes:            z.string().optional(),
})

export type ClientFormData = z.infer<typeof clientSchema>

export async function createClientAction(data: ClientFormData): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  const parsed = clientSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data: refData, error: refError } = await supabase.rpc('generate_client_reference')

if (refError) {
  return { error: 'Erreur génération référence client: ' + refError.message }
}

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      ...parsed.data,
      reference:     refData ?? `CL-${Date.now()}`,
      created_by:    user.id,
      assigned_to:   ctx.role === 'commercial' ? user.id : (parsed.data.assigned_to || user.id),
      website:       parsed.data.website || null,
      contact_email: parsed.data.contact_email || null,
    })
    .select()
    .single()

  if (error) {
  console.error('CREATE CLIENT ERROR:', error)

  return {
    error: `${error.message} | ${error.details ?? ''} | ${error.hint ?? ''}`
  }
}
  revalidatePath('/clients')
  return { data: created }
}

export async function updateClientAction(id: string, data: Partial<ClientFormData>): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx
  if (ctx.role === 'commercial') {
    const { data: owned } = await supabase.from('clients').select('assigned_to').eq('id', id).single()
    if (!owned || owned.assigned_to !== user.id) return roleDenied()
    delete data.assigned_to
  }

  const { data: updated, error } = await supabase
    .from('clients')
    .update({ ...data, assigned_to: data.assigned_to || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/clients')
  revalidatePath('/clients/' + id)
  return { data: updated }
}

export async function archiveClientAction(id: string): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx
  if (ctx.role === 'commercial') {
    const { data: owned } = await supabase.from('clients').select('assigned_to').eq('id', id).single()
    if (!owned || owned.assigned_to !== user.id) return roleDenied()
  }
  const { error } = await supabase
    .from('clients')
    .update({ is_archived: true })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/clients')
  return { success: true }
}

export const deleteClientAction = archiveClientAction
