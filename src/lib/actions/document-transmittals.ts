'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function generateDocumentTransmittal(projectId: string) {
  const supabase = await createClient()

  if (!projectId) {
    return { error: 'Missing project ID' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { data: project, error: projectError } = await supabase
    .from('projets_v2')
    .select('id, reference, name, client_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    return { error: `Project query error: ${projectError.message}` }
  }

  if (!project) {
    return { error: `Project not found for ID: ${projectId}` }
  }

  let clientName = ''
  let clientEmail = ''

  if (project.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('company_name, email')
      .eq('id', project.client_id)
      .maybeSingle()

    clientName = client?.company_name || ''
    clientEmail = client?.email || ''
  }

  const { data: approvedDocuments, error: docsError } = await supabase
    .from('project_documents')
    .select('*')
    .eq('project_id', projectId)
    .eq('document_status', 'approved')
    .order('document_type', { ascending: true })

  if (docsError) return { error: docsError.message }

  if (!approvedDocuments || approvedDocuments.length === 0) {
    return { error: 'No approved documents found for this project' }
  }

  const { data: transmittalNumber, error: numberError } = await supabase
    .rpc('generate_transmittal_number')
  if (numberError || !transmittalNumber) {
    return { error: numberError?.message || 'Transmittal numbering failed' }
  }

  const { data: transmittal, error: transmittalError } = await supabase
    .from('document_transmittals')
    .insert({
      project_id: projectId,
      client_id: project.client_id,
      transmittal_number: transmittalNumber,
      generated_by: user.id,
      status: 'draft',
      subject: project.name || project.reference,
      client_name: clientName,
      client_email: clientEmail,
      comments: `Document transmittal generated for project ${project.reference}`,
    })
    .select()
    .single()

  if (transmittalError) return { error: transmittalError.message }

  const items = approvedDocuments.map((doc) => ({
    transmittal_id: transmittal.id,
    project_document_id: doc.id,
    file_name: doc.file_name,
    document_type: doc.document_type,
    revision: doc.revision,
    document_status: doc.document_status,
    file_path: doc.file_path,
  }))

  const { error: itemsError } = await supabase
    .from('document_transmittal_items')
    .insert(items)

  if (itemsError) {
    // Avoid leaving an empty/orphan transmittal when item creation fails.
    await supabase.from('document_transmittals').delete().eq('id', transmittal.id)
    return { error: itemsError.message }
  }

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    activity_type: 'document_transmittal_generated',
    title: 'Document Transmittal generated',
    description: transmittalNumber,
    new_value: `${approvedDocuments.length} approved document(s)`,
    created_by: user.id,
  })

  revalidatePath(`/projets/${projectId}`)

  return {
    success: true,
    transmittal,
  }
}
