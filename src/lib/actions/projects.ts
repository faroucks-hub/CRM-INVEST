'use server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { WORKFLOW_STEPS } from '@/types/sprint4'
import { getActionContext, roleDenied, type ActionResult } from '@/lib/auth/action-context'

export interface ProjectPayload {
  name:string; client_id:string; assigned_to?:string;
  quotation_id?:string; proforma_id?:string;
  status?:string; contract_value?:number; currency?:string;
  order_date?:string; expected_delivery?:string;
  incoterm?:string; port_destination?:string; country?:string;
  shipper?:string; tracking_number?:string;
  warranty_months?:number; warranty_start?:string; warranty_end?:string;
  notes?:string; internal_notes?:string;
  commercial_role?:'facilitation'|'resale'|'distribution'; terms_profile_id?:string; terms_code?:string; terms_version?:string; terms_snapshot?:string;
}

export async function createProjectAction(data: ProjectPayload): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase, user } = ctx

  // Génère référence
  const { data: ref } = await supabase.rpc('generate_project_reference_v2')

  const { data: project, error } = await supabase
    .from('projets_v2')
    .insert({
      reference:        ref,
      name:             data.name,
      client_id:        data.client_id,
      assigned_to:      data.assigned_to || null,
      quotation_id:     data.quotation_id || null,
      proforma_id:      data.proforma_id || null,
      status:           data.status || 'en_attente',
      contract_value:   data.contract_value || null,
      currency:         data.currency || 'USD',
      order_date:       data.order_date || null,
      expected_delivery:data.expected_delivery || null,
      incoterm:         data.incoterm || 'DAP',
      port_destination: data.port_destination || null,
      country:          data.country || null,
      warranty_months:  data.warranty_months || 24,
      commercial_role:  data.commercial_role || null,
      terms_profile_id: data.terms_profile_id || null,
      terms_code:       data.terms_code || null,
      terms_version:    data.terms_version || null,
      terms_snapshot:   data.terms_snapshot || null,
      notes:            data.notes || null,
      internal_notes:   data.internal_notes || null,
      created_by:       user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Crée les 15 étapes workflow automatiquement
  const steps = WORKFLOW_STEPS.map(s => ({
    project_id:   project.id,
    step_key:     s.key,
    step_label:   s.label,
    step_order:   s.order,
    status:       'non_commence' as const,
    is_blocked:   false,
  }))
  const { error: stepsError } = await supabase.from('project_workflow_steps').insert(steps)
  if (stepsError) {
    await createAdminClient().from('projets_v2').delete().eq('id', project.id)
    return { error: stepsError.message }
  }

  revalidatePath('/projets')
  return { data: project }
}

export async function updateProjectAction(id: string, data: Partial<ProjectPayload> & { status?: string; progress_pct?: number }): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const { data: updated, error } = await supabase
    .from('projets_v2')
    .update({
      ...data,
      assigned_to:   data.assigned_to || null,
      quotation_id:  data.quotation_id || null,
      proforma_id:   data.proforma_id || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/projets')
  revalidatePath('/projets/' + id)
  return { data: updated }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isAdmin) return { error: 'Seul un administrateur peut supprimer un projet' }
  const { supabase } = ctx
  await supabase.from('project_workflow_steps').delete().eq('project_id', id)
  const { error } = await supabase.from('projets_v2').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/projets')
  return { success: true }
}

export async function updateWorkflowStepAction(stepId: string, data: {
  status?:string; deadline?:string; completed_at?:string;
  responsible_id?:string; comment?:string; is_blocked?:boolean; block_reason?:string;
}): Promise<ActionResult> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  const { supabase, user } = ctx

  if (ctx.role === 'commercial') {
    const { data: ownedStep } = await supabase
      .from('project_workflow_steps')
      .select('project:project_id(assigned_to)')
      .eq('id', stepId)
      .single()
    const project = Array.isArray(ownedStep?.project) ? ownedStep.project[0] : ownedStep?.project
    if (!project || project.assigned_to !== user.id) return roleDenied()
  }

  const updateData: Record<string,unknown> = { ...data }
  if (data.status === 'termine' && !data.completed_at) {
    updateData.completed_at = new Date().toISOString().split('T')[0]
  }
  if (data.status !== 'bloque') {
    updateData.is_blocked = false
    updateData.block_reason = null
  }

  const { data: step, error } = await supabase
    .from('project_workflow_steps')
    .update(updateData)
    .eq('id', stepId)
    .select('project_id')
    .single()

  if (error) return { error: error.message }

  // Recalcule le progrès du projet
  const { data: allSteps } = await supabase
    .from('project_workflow_steps')
    .select('status')
    .eq('project_id', step.project_id)

  const done  = (allSteps ?? []).filter(s => s.status === 'termine').length
  const total = (allSteps ?? []).length
  const pct   = total > 0 ? Math.round(done / total * 100) : 0

  // Détermine statut général
  const hasBlocked = (allSteps ?? []).some(s => s.status === 'bloque')
  let projStatus = 'en_cours'
  if (pct === 100) projStatus = 'cloture'
  else if (hasBlocked) projStatus = 'en_retard'

  await supabase.from('projets_v2')
    .update({ progress_pct: pct, status: projStatus })
    .eq('id', step.project_id)

  revalidatePath('/projets/' + step.project_id)
  return { success: true }
}

export async function createProjectFromProformaAction(proformaId: string): Promise<ActionResult<any>> {
  const ctx = await getActionContext()
  if (!ctx.ok) return { error: ctx.error }
  if (!ctx.isPrivileged) return roleDenied()
  const { supabase } = ctx

  const { data: prof } = await supabase
    .from('proformas_v2').select('*').eq('id', proformaId).single()
  if (!prof) return { error: 'Proforma introuvable' }

const { data: existingProject } = await supabase
  .from('projets_v2')
  .select('id, reference')
  .eq('proforma_id', proformaId)
  .maybeSingle()

if (existingProject) {
  return {
    error: `Projet déjà créé : ${existingProject.reference}`,
  }
}

  return createProjectAction({
    name:           `Projet — ${prof.number}`,
    client_id:      prof.client_id,
    assigned_to:    prof.assigned_to,
    proforma_id:    proformaId,
    quotation_id:   prof.quotation_id,
    contract_value: prof.total_sell,
    currency:       prof.currency,
    incoterm:       prof.incoterm,
    port_destination: prof.port_destination,
    commercial_role: prof.commercial_role,
    terms_profile_id: prof.terms_profile_id,
    terms_code: prof.terms_code,
    terms_version: prof.terms_version,
    terms_snapshot: prof.terms_snapshot,
  })
}
