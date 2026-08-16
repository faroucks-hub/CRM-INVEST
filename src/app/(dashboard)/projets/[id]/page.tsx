import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProjectNotesSection from '@/components/projets/ProjectNotesSection'
import ProjectDocumentsSection from '@/components/projets/ProjectDocumentsSection'
import ProjectTransmittalsSection from '@/components/transmittals/ProjectTransmittalsSection'
import GenerateInvoiceButton from '@/components/projets/GenerateInvoiceButton'
import GeneratePackingListButton from '@/components/projets/GeneratePackingListButton'
import GenerateDeliveryNoteButton from '@/components/projets/GenerateDeliveryNoteButton'
import { PageHeader } from '@/components/ui/page-header'
import IndustrialDossierClient from '@/components/projets/IndustrialDossierClient'
import ExecutionControlClient from '@/components/projets/ExecutionControlClient'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectDetailPage({
  params,
}: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
  .from('projets_v2')
  .select('*, clients(company_name)')
  .eq('id', id)
  .single()

  if (!project) {
    notFound()
  }

  const { data: activities } = await supabase
  .from('project_activity_logs')
  .select('*, users_profiles(full_name)')
  .eq('project_id', id)
  .order('created_at', { ascending: false })
  .limit(8)

  const { data: notes } = await supabase
  .from('project_notes')
  .select('*, users_profiles(full_name)')
  .eq('project_id', id)
  .order('is_pinned', { ascending: false })
  .order('created_at', { ascending: false })

  const { data: documents } = await supabase
  .from('project_documents')
  .select('*')
  .eq('project_id', id)
  .order('created_at', { ascending: false })

  const [documentRegisterResult, equipmentResult, nameplatesResult, checklistResult, executionResult, clientPaymentsResult, supplierInvoicesResult, supplierPaymentsResult] = await Promise.all([
    supabase.from('project_document_register').select('*').eq('project_id', id).order('document_code'),
    supabase.from('project_equipment_items').select('*').eq('project_id', id).order('item_no'),
    supabase.from('project_nameplate_items').select('*').eq('project_id', id).order('tag_no'),
    supabase.from('project_completion_checklist').select('*').eq('project_id', id).order('category').order('label'),
    supabase.from('project_execution_control').select('*').eq('project_id', id).maybeSingle(),
    supabase.from('paiements').select('total_amount,deposit_received,currency,status').eq('project_id', id),
    supabase.from('supplier_invoices').select('total_amount,currency,status,voided_at').eq('project_id', id),
    supabase.from('supplier_payments').select('amount,currency,transaction_type,voided_at').eq('project_id', id),
  ])

 const { data: transmittals } = await supabase
  .from('document_transmittals')
  .select(`
    *,
    document_transmittal_items(*)
  `)
  .eq('project_id', id)
  .order('created_at', { ascending: false })

  return (
    <div className="mx-auto h-[calc(100dvh-10.25rem)] max-w-7xl space-y-6 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title={project.reference}
            description={project.name}
            backHref="/projets"
            backLabel="Retour aux projets"
          />

          <div className="text-right">
            <div className="text-sm text-gray-400">
              Workflow Stage
            </div>

            <div className="font-semibold text-navy-900 capitalize">
              {project.workflow_stage}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 items-start gap-6">

        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-end gap-2 flex-wrap">
          <GenerateInvoiceButton projectId={project.id} />
          <GeneratePackingListButton projectId={project.id} />
          <GenerateDeliveryNoteButton projectId={project.id} />
        </div>  
          <ExecutionControlClient
            projectId={project.id}
            control={executionResult.data ?? null}
            completionPct={(() => {
              const rows = checklistResult.data ?? []
              const required = rows.filter((x:any) => x.required)
              if (!required.length) return 0
              const done = required.filter((x:any) => ['approved','not_applicable'].includes(x.status)).length
              return Math.round((done / required.length) * 100)
            })()}
            clientFinancial={(() => {
              const rows = clientPaymentsResult.data ?? []
              const currency = rows[0]?.currency ?? project.currency ?? 'USD'
              return {
                invoiced: rows.reduce((s:number,x:any)=>s+Number(x.total_amount||0),0),
                received: rows.reduce((s:number,x:any)=>s+Number(x.deposit_received||0),0),
                currency,
              }
            })()}
            supplierFinancial={(() => {
              const inv = (supplierInvoicesResult.data ?? []).filter((x:any)=>!x.voided_at)
              const pay = (supplierPaymentsResult.data ?? []).filter((x:any)=>!x.voided_at)
              const currency = inv[0]?.currency ?? pay[0]?.currency ?? project.currency ?? 'USD'
              return {
                invoiced: inv.reduce((s:number,x:any)=>s+Number(x.total_amount||0),0),
                paid: pay.reduce((s:number,x:any)=>s+(x.transaction_type==='remboursement'?-1:1)*Number(x.amount||0),0),
                currency,
              }
            })()}
          />
          <IndustrialDossierClient
            projectId={project.id}
            projectReference={project.reference}
            documentRegister={documentRegisterResult.data ?? []}
            equipment={equipmentResult.data ?? []}
            nameplates={nameplatesResult.data ?? []}
            checklist={checklistResult.data ?? []}
          />
          <ProjectDocumentsSection
               projectId={project.id}
               documents={documents ?? []}
               /> 
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">
              Project Information
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">

              <div>
                <div className="text-gray-400">
                  Client
                </div>

                <div className="font-medium">
                  {project.clients?.company_name ?? '—'}
                </div>
              </div>

              <div>
                <div className="text-gray-400">
                  Country
                </div>

                <div className="font-medium">
                  {project.country ?? '—'}
                </div>
              </div>

              <div>
                <div className="text-gray-400">
                  Contract Value
                </div>

                <div className="font-medium">
                  {project.contract_value ?? 0} {project.currency}
                </div>
              </div>

              <div>
                <div className="text-gray-400">
                  Progress
                </div>

                <div className="font-medium">
                  {project.progress_pct ?? 0}%
                </div>
              </div>

            </div>
          </div>

        </div>

        <div className="space-y-6">

          {/* Timeline d’exécution — dérivée des données réelles, jamais codée en dur. */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            {(() => {
              const execution = executionResult.data as any
              const production = execution?.production_status ?? 'not_started'
              const fat = execution?.fat_status ?? 'not_planned'
              const shipment = execution?.shipment_status ?? 'not_started'
              const delivery = execution?.delivery_status ?? 'not_delivered'
              const rows = [
                { label: 'Engineering / Production', done: ['completed'].includes(production), active: ['engineering','in_production'].includes(production) },
                { label: 'FAT / Testing', done: ['passed','passed_with_reservations','waived'].includes(fat), active: ['planned','ready'].includes(fat) },
                { label: 'Expédition', done: ['delivered'].includes(shipment), active: ['booking','packed','dispatched','in_transit','arrived'].includes(shipment) },
                { label: 'Livraison', done: ['delivered','accepted'].includes(delivery), active: ['partial','with_reservations'].includes(delivery) },
              ]
              return <div className="space-y-3 text-sm">{rows.map(row => (
                <div key={row.label} className={`flex justify-between ${!row.done&&!row.active?'text-gray-300':''}`}>
                  <span>{row.label}</span><span>{row.done?'✓':row.active?'●':'○'}</span>
                </div>
              ))}</div>
            })()}
          </div>

          {/* Activity Timeline */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">
              Activity Timeline
            </h2>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">

              {activities?.length === 0 && (
                <div className="text-sm text-gray-400">
                  No activity yet
                </div>
              )}

              {activities?.map(activity => (
                <div
                  key={activity.id}
                  className="border-l-2 border-navy-100 pl-4 pb-4"
                >
                  <div className="text-sm font-medium text-navy-900">
                    {activity.title}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {activity.description}
                  </div>

                  {(activity.old_value || activity.new_value) && (
                    <div className="text-xs text-gray-400 mt-1">
                      {activity.old_value} → {activity.new_value}
                    </div>
                  )}

                  <div className="text-[11px] text-gray-300 mt-2">
                    {activity.users_profiles?.full_name ?? 'System'}
                  </div>
                </div>
              ))}

            </div>
          </div>

         <ProjectNotesSection
  projectId={project.id}
  notes={notes ?? []}
/>

<ProjectTransmittalsSection
  projectId={project.id}
  transmittals={transmittals ?? []}
/>

        </div>

      </div>
    </div>
  )
}
