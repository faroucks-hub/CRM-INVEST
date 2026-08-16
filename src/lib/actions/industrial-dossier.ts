'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function text(v: FormDataEntryValue | null) {
  const value = String(v ?? '').trim()
  return value || null
}

async function userAndProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Unauthorized' as const, user: null }
  const { data: project } = await supabase.from('projets_v2').select('id').eq('id', projectId).single()
  if (!project) return { supabase, error: 'Project not found' as const, user }
  return { supabase, error: null, user }
}

export async function createDocumentRegisterItem(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  const documentCode = String(formData.get('documentCode') ?? '').trim().toUpperCase()
  const title = String(formData.get('title') ?? '').trim()
  if (!projectId || !documentCode || !title) return { error: 'Project, document number and title are required.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_document_register').insert({
    project_id: projectId, document_code: documentCode, title,
    category: text(formData.get('category')) ?? 'general',
    current_revision: text(formData.get('revision')) ?? '00',
    status: text(formData.get('status')) ?? 'not_started',
    required: formData.get('required') !== 'false',
    planned_submission_date: text(formData.get('plannedDate')),
    responsible: text(formData.get('responsible')), remarks: text(formData.get('remarks')),
    created_by: ctx.user!.id,
  })
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function updateDocumentRegisterStatus(id: string, projectId: string, status: string) {
  const allowed = ['not_started','draft','submitted','commented','revise_resubmit','approved','final','waived']
  if (!allowed.includes(status)) return { error: 'Invalid document status.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const patch: Record<string, string | null> = { status }
  if (status === 'submitted') patch.actual_submission_date = new Date().toISOString().slice(0,10)
  if (status === 'approved' || status === 'final') patch.approval_date = new Date().toISOString().slice(0,10)
  const { error } = await ctx.supabase.from('project_document_register').update(patch).eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function deleteDocumentRegisterItem(id: string, projectId: string) {
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_document_register').delete().eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function createEquipmentItem(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  const description = String(formData.get('description') ?? '').trim()
  if (!projectId || !description) return { error: 'Project and equipment description are required.' }
  const quantity = Number(formData.get('quantity') ?? 1)
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Quantity must be greater than zero.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_equipment_items').insert({
    project_id: projectId, item_no: text(formData.get('itemNo')), tag_no: text(formData.get('tagNo')),
    description, manufacturer: text(formData.get('manufacturer')), model: text(formData.get('model')),
    quantity, rating: text(formData.get('rating')), input_spec: text(formData.get('inputSpec')),
    output_spec: text(formData.get('outputSpec')), serial_no: text(formData.get('serialNo')),
    equipment_status: text(formData.get('status')) ?? 'planned', remarks: text(formData.get('remarks')),
    created_by: ctx.user!.id,
  })
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function updateEquipmentStatus(id: string, projectId: string, status: string) {
  const allowed = ['planned','ordered','in_production','tested','ready','shipped','delivered','cancelled']
  if (!allowed.includes(status)) return { error: 'Invalid equipment status.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_equipment_items').update({equipment_status:status}).eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function deleteEquipmentItem(id: string, projectId: string) {
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_equipment_items').delete().eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function createNameplateItem(formData: FormData) {
  const projectId = String(formData.get('projectId') ?? '')
  const equipment = String(formData.get('equipment') ?? '').trim()
  if (!projectId || !equipment) return { error: 'Project and equipment are required.' }
  const yearRaw = text(formData.get('manufactureYear'))
  const manufactureYear = yearRaw ? Number(yearRaw) : null
  if (manufactureYear && (!Number.isInteger(manufactureYear) || manufactureYear < 2000 || manufactureYear > 2200)) return { error: 'Invalid manufacture year.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_nameplate_items').insert({
    project_id: projectId, equipment_item_id: text(formData.get('equipmentItemId')),
    tag_no: text(formData.get('tagNo')), equipment, manufacturer: text(formData.get('manufacturer')),
    model: text(formData.get('model')), serial_no: text(formData.get('serialNo')), rating: text(formData.get('rating')),
    input_data: text(formData.get('inputData')), output_data: text(formData.get('outputData')),
    protection_ip: text(formData.get('protectionIp')), frequency: text(formData.get('frequency')),
    manufacture_year: manufactureYear, verification_status: text(formData.get('status')) ?? 'pending',
    remarks: text(formData.get('remarks')), created_by: ctx.user!.id,
  })
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function updateNameplateStatus(id: string, projectId: string, status: string) {
  const allowed = ['pending','verified','non_conforming','not_applicable']
  if (!allowed.includes(status)) return { error: 'Invalid verification status.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_nameplate_items').update({verification_status:status}).eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function deleteNameplateItem(id: string, projectId: string) {
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_nameplate_items').delete().eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}

export async function updateCompletionItem(id: string, projectId: string, status: string) {
  const allowed = ['pending','available','approved','not_applicable']
  if (!allowed.includes(status)) return { error: 'Invalid checklist status.' }
  const ctx = await userAndProject(projectId); if (ctx.error) return { error: ctx.error }
  const { error } = await ctx.supabase.from('project_completion_checklist').update({status,updated_by:ctx.user!.id}).eq('id',id).eq('project_id',projectId)
  if (error) return { error: error.message }
  revalidatePath(`/projets/${projectId}`); return { success: true }
}
