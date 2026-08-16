'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const oppSchema = z.object({
  name:             z.string().min(1, 'Nom requis'),
  client_id:        z.string().uuid('Client requis'),
  assigned_to:      z.string().optional(),
  pipeline_stage:   z.string().default('nouveau_lead'),
  estimated_sell:   z.number().optional(),
  currency:         z.string().default('USD'),
  sector:           z.string().optional(),
  product_type:     z.string().optional(),
  description:      z.string().optional(),
  technical_specs:  z.string().optional(),
  probability:      z.number().min(0).max(100).default(20),
  expected_close:   z.string().optional(),
  next_followup:    z.string().optional(),
  lead_source:      z.string().optional(),
  notes:            z.string().optional(),
})

export type OppFormData = z.infer<typeof oppSchema>

export async function createOpportunityAction(data: OppFormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const parsed = oppSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data: created, error } = await supabase
    .from('opportunities')
    .insert({
      ...parsed.data,
      stage:       'prospect',
      created_by:  user.id,
      assigned_to: parsed.data.assigned_to || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/opportunites')
  return { data: created }
}

export async function updateOpportunityAction(id: string, data: Partial<OppFormData & { pipeline_stage: string }>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: updated, error } = await supabase
    .from('opportunities')
    .update({ ...data, assigned_to: data.assigned_to || null })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/opportunites')
  return { data: updated }
}

export async function deleteOpportunityAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update({ pipeline_stage: 'perdu_annule' })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/opportunites')
  return { success: true }
}

export async function movePipelineStageAction(id: string, stage: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('opportunities')
    .update({ pipeline_stage: stage })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/opportunites')
  return { success: true }
}
