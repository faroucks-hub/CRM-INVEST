'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface CreateTransmittalInput {
  projectId: string
  subject: string
  clientName: string
  comments: string
  documentIds: string[]
}

export async function createTransmittal(input: CreateTransmittalInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Non authentifié' }

  const projectId = input.projectId?.trim()
  const documentIds = Array.from(new Set(input.documentIds ?? []))

  if (!projectId) return { error: 'Projet obligatoire' }
  if (!documentIds.length) {
    return { error: 'Sélectionnez au moins un document approuvé' }
  }

  const { data: project, error: projectError } = await supabase
    .from('projets_v2')
    .select('id, reference, name, client_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) return { error: projectError.message }
  if (!project) return { error: 'Projet introuvable' }

  const { data: documents, error: documentsError } = await supabase
    .from('project_documents')
    .select('id, file_name, document_type, revision, document_status, file_path')
    .eq('project_id', projectId)
    .eq('document_status', 'approved')
    .in('id', documentIds)

  if (documentsError) return { error: documentsError.message }
  if (!documents || documents.length !== documentIds.length) {
    return {
      error:
        'Un ou plusieurs documents sont introuvables, non approuvés ou rattachés à un autre projet',
    }
  }

  const { data: transmittalNumber, error: numberError } = await supabase
    .rpc('generate_transmittal_number')
  if (numberError || !transmittalNumber) {
    return { error: numberError?.message || 'Numérotation du bordereau impossible' }
  }

  const { data: transmittal, error: transmittalError } = await supabase
    .from('document_transmittals')
    .insert({
      project_id: projectId,
      client_id: project.client_id,
      transmittal_number: transmittalNumber,
      generated_by: user.id,
      status: 'draft',
      subject: input.subject.trim() || project.name || project.reference,
      client_name: input.clientName.trim(),
      comments: input.comments.trim() || null,
    })
    .select('id, transmittal_number')
    .single()

  if (transmittalError) return { error: transmittalError.message }

  const items = documents.map((document) => ({
    transmittal_id: transmittal.id,
    project_document_id: document.id,
    file_name: document.file_name,
    document_type: document.document_type,
    revision: document.revision,
    document_status: document.document_status,
    file_path: document.file_path,
  }))

  const { error: itemsError } = await supabase
    .from('document_transmittal_items')
    .insert(items)

  if (itemsError) {
    await supabase.from('document_transmittals').delete().eq('id', transmittal.id)
    return { error: itemsError.message }
  }

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    activity_type: 'document_transmittal_created',
    title: 'Document Transmittal créé',
    description: transmittal.transmittal_number,
    new_value: `${documents.length} document(s) approuvé(s)`,
    created_by: user.id,
  })

  revalidatePath(`/projets/${projectId}`)

  return {
    success: true,
    transmittalId: transmittal.id,
    transmittalNumber: transmittal.transmittal_number,
  }
}
