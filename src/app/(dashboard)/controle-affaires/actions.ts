'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'lead_team'].includes(profile.role)) throw new Error('Accès non autorisé')
  return { supabase, user }
}

const num = (f: FormData, key: string) => {
  const value = Number(String(f.get(key) ?? '0').replace(',', '.'))
  return Number.isFinite(value) && value >= 0 ? value : 0
}

export async function saveDealControlAction(formData: FormData) {
  const { supabase, user } = await context()
  const projectId = String(formData.get('project_id') ?? '')
  if (!projectId) throw new Error('Projet manquant')
  const payload = {
    project_id: projectId,
    logistics_budget: num(formData, 'logistics_budget'),
    bank_fees_budget: num(formData, 'bank_fees_budget'),
    inspection_budget: num(formData, 'inspection_budget'),
    other_cost_budget: num(formData, 'other_cost_budget'),
    budget_currency: String(formData.get('budget_currency') ?? '').trim() || null,
    reviewer_notes: String(formData.get('reviewer_notes') ?? '').trim() || null,
    review_status: String(formData.get('review_status') ?? 'a_revoir'),
    risk_override_reason: String(formData.get('risk_override_reason') ?? '').trim() || null,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    created_by: user.id,
  }
  const { error } = await supabase.from('project_deal_controls').upsert(payload, { onConflict: 'project_id' })
  if (error) throw new Error(error.message)
  revalidatePath('/controle-affaires')
}
