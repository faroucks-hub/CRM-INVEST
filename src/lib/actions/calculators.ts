'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CalcType } from '@/types/sprint5'

export interface SaveCalcPayload {
  calc_type:     CalcType
  name?:         string
  inputs:        Record<string, unknown>
  outputs:       Record<string, unknown>
  client_id?:    string
  project_id?:   string
  quotation_id?: string
}

export async function saveCalculationAction(data: SaveCalcPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: calc, error } = await supabase
    .from('calc_history')
    .insert({
      calc_type:   data.calc_type,
      name:        data.name || null,
      inputs:      data.inputs,
      outputs:     data.outputs,
      client_id:   data.client_id || null,
      project_id:  data.project_id || null,
      quotation_id:data.quotation_id || null,
      created_by:  user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/calculateurs/historique')
  return { data: calc }
}

export async function deleteCalculationAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('calc_history').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/calculateurs/historique')
  return { success: true }
}

export async function getCalcHistory() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [] }

  const { data: profile } = await supabase
    .from('users_profiles').select('role').eq('id', user.id).single()
  const isAdminOrLead = ['admin','lead_team'].includes(profile?.role ?? '')

  let q = supabase.from('calc_history')
    .select(`id, calc_type, name, inputs, outputs, client_id, project_id, quotation_id, created_at,
      clients!calc_history_client_id_fkey(id, company_name),
      projets_v2!calc_history_project_id_fkey(id, reference, name),
      quotations_v2!calc_history_quotation_id_fkey(id, number),
      users_profiles!calc_history_created_by_fkey(id, full_name)`)
    .order('created_at', { ascending: false })

  if (!isAdminOrLead) q = q.eq('created_by', user.id)

  const { data } = await q
  return { data: data ?? [] }
}
