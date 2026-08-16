'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const text = (formData: FormData, key: string) => {
  const value = String(formData.get(key) ?? '').trim()
  return value || null
}

async function context(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const { data: project } = await supabase.from('projets_v2').select('id, assigned_to').eq('id', projectId).single()
  if (!project) throw new Error('Projet introuvable')
  return { supabase, user }
}

export async function saveExecutionControlAction(formData: FormData) {
  const projectId = String(formData.get('project_id') ?? '')
  if (!projectId) throw new Error('Projet manquant')
  const { supabase, user } = await context(projectId)
  const payload = {
    project_id: projectId,
    production_status: text(formData,'production_status') ?? 'not_started',
    production_start_date: text(formData,'production_start_date'),
    production_expected_end: text(formData,'production_expected_end'),
    production_actual_end: text(formData,'production_actual_end'),
    fat_status: text(formData,'fat_status') ?? 'not_planned',
    fat_planned_date: text(formData,'fat_planned_date'),
    fat_actual_date: text(formData,'fat_actual_date'),
    fat_reservations: text(formData,'fat_reservations'),
    readiness_status: text(formData,'readiness_status') ?? 'not_ready',
    readiness_date: text(formData,'readiness_date'),
    shipment_status: text(formData,'shipment_status') ?? 'not_started',
    shipment_method: text(formData,'shipment_method'),
    shipment_reference: text(formData,'shipment_reference'),
    shipment_date: text(formData,'shipment_date'),
    eta_date: text(formData,'eta_date'),
    actual_arrival_date: text(formData,'actual_arrival_date'),
    delivery_status: text(formData,'delivery_status') ?? 'not_delivered',
    delivery_date: text(formData,'delivery_date'),
    delivery_reservations: text(formData,'delivery_reservations'),
    financial_closure_status: text(formData,'financial_closure_status') ?? 'open',
    project_closure_status: text(formData,'project_closure_status') ?? 'open',
    closure_date: text(formData,'closure_date'),
    closure_notes: text(formData,'closure_notes'),
    updated_by: user.id,
  }
  // Une clôture définitive ne peut pas contourner les contrôles documentaire et financier.
  // Le statut avec réserves reste disponible lorsqu'une clôture exceptionnelle doit être tracée.
  if (payload.project_closure_status === 'closed') {
    const [checklistResult, customerResult, supplierInvoicesResult, supplierPaymentsResult] = await Promise.all([
      supabase.from('project_completion_checklist').select('required,status').eq('project_id', projectId),
      supabase.from('paiements').select('total_amount,deposit_received,currency').eq('project_id', projectId),
      supabase.from('supplier_invoices').select('total_amount,currency,voided_at').eq('project_id', projectId),
      supabase.from('supplier_payments').select('amount,currency,transaction_type,voided_at').eq('project_id', projectId),
    ])
    const required = (checklistResult.data ?? []).filter((x:any) => x.required)
    const incomplete = required.filter((x:any) => !['approved','not_applicable'].includes(x.status))
    if (incomplete.length) throw new Error(`Clôture impossible : ${incomplete.length} élément(s) obligatoire(s) du dossier final restent à valider.`)

    const customerRows = customerResult.data ?? []
    const customerCurrencies = new Set(customerRows.map((x:any)=>x.currency).filter(Boolean))
    if (customerCurrencies.size > 1) throw new Error('Clôture impossible : plusieurs devises client sont présentes. Vérifiez le rapprochement financier manuellement.')
    const customerBalance = customerRows.reduce((sum:number,x:any)=>sum + Number(x.total_amount||0) - Number(x.deposit_received||0),0)
    if (Math.abs(customerBalance) > 0.01) throw new Error(`Clôture impossible : solde client restant ${customerBalance.toFixed(2)} ${customerRows[0]?.currency ?? ''}.`)

    const supplierInvoices = (supplierInvoicesResult.data ?? []).filter((x:any)=>!x.voided_at)
    const supplierPayments = (supplierPaymentsResult.data ?? []).filter((x:any)=>!x.voided_at)
    const supplierCurrencies = new Set([...supplierInvoices.map((x:any)=>x.currency),...supplierPayments.map((x:any)=>x.currency)].filter(Boolean))
    if (supplierCurrencies.size > 1) throw new Error('Clôture impossible : plusieurs devises partenaire sont présentes. Vérifiez le rapprochement financier manuellement.')
    const supplierInvoiced = supplierInvoices.reduce((sum:number,x:any)=>sum+Number(x.total_amount||0),0)
    const supplierPaid = supplierPayments.reduce((sum:number,x:any)=>sum+(x.transaction_type==='remboursement'?-1:1)*Number(x.amount||0),0)
    const supplierBalance = supplierInvoiced - supplierPaid
    if (Math.abs(supplierBalance) > 0.01) throw new Error(`Clôture impossible : solde partenaire restant ${supplierBalance.toFixed(2)} ${supplierInvoices[0]?.currency ?? supplierPayments[0]?.currency ?? ''}.`)
    if (!['delivered','accepted'].includes(payload.delivery_status ?? '')) throw new Error('Clôture impossible : la livraison doit être enregistrée comme livrée ou acceptée.')
  }

  const { error } = await supabase.from('project_execution_control').upsert(payload, { onConflict: 'project_id' })
  if (error) throw new Error(error.message)

  const stageMap: Record<string,string> = {
    engineering:'engineering', in_production:'assembly', completed:'testing',
  }
  let workflowStage: string | null = stageMap[payload.production_status] ?? null
  if (['planned','ready','passed','passed_with_reservations','failed'].includes(payload.fat_status)) workflowStage = 'testing'
  if (payload.readiness_status === 'ready_for_shipment') workflowStage = 'packing'
  if (['booking','packed'].includes(payload.shipment_status)) workflowStage = 'packing'
  if (['dispatched','in_transit','arrived'].includes(payload.shipment_status)) workflowStage = 'shipping'
  if (['delivered','accepted','with_reservations'].includes(payload.delivery_status)) workflowStage = 'completed'

  const projectPatch: Record<string, unknown> = {}
  if (workflowStage) projectPatch.workflow_stage = workflowStage
  if (payload.delivery_date) projectPatch.actual_delivery = payload.delivery_date
  if (payload.project_closure_status === 'closed') {
    projectPatch.status = 'cloture'
    projectPatch.progress_pct = 100
  } else if (payload.delivery_status === 'delivered' || payload.delivery_status === 'accepted') {
    projectPatch.status = 'livre'
    projectPatch.progress_pct = 95
  } else if (payload.production_status !== 'not_started') {
    projectPatch.status = 'en_cours'
  }
  if (Object.keys(projectPatch).length) await supabase.from('projets_v2').update(projectPatch).eq('id', projectId)

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    title: 'Contrôle d’exécution mis à jour',
    description: `Production: ${payload.production_status} · FAT: ${payload.fat_status} · Expédition: ${payload.shipment_status} · Clôture: ${payload.project_closure_status}`,
    new_value: payload.project_closure_status,
    created_by: user.id,
  })
  revalidatePath(`/projets/${projectId}`)
}
