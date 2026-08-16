'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function mapProjectDocTypeToGlobalDocType(type: string) {
  const mapping: Record<string, string> = {
    general: 'autre',
    drawing: 'sld',
    approved_drawing: 'sld',
    as_built_drawing: 'sld',
    document_list: 'autre',
    equipment_list: 'autre',
    nameplate_list: 'autre',
    fat: 'fat_report',
    sat: 'certificate',
    manual: 'autre',
    invoice: 'invoice',
    commercial_invoice: 'invoice',
    shipping: 'certificate',
    shipping_document: 'certificate',
    certificate_origin: 'certificate',
    warranty_certificate: 'certificate',
    packing_list: 'packing_list',
    delivery_note: 'delivery_note',
    transmittal: 'transmittal',
    datasheet: 'datasheet',
  }

  return mapping[type] || 'autre'
}

export async function uploadProjectDocument(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string
  const documentType = (formData.get('documentType') as string) || 'general'
  const requestedGroup = String(formData.get('documentGroup') ?? '').trim()

  if (!file || !projectId) {
    return { error: 'Missing file or project ID' }
  }
  if (file.size <= 0) return { error: 'Empty file' }
  if (file.size > 50 * 1024 * 1024) return { error: 'File too large (maximum 50 MB)' }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const documentGroup = (requestedGroup || documentType)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  const safeFileName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!safeFileName) return { error: 'Invalid file name' }

  const { data: existingDocs, error: existingError } = await supabase
    .from('project_documents')
    .select('revision')
    .eq('project_id', projectId)
    .eq('document_group', documentGroup)
    .order('revision', { ascending: false })
    .limit(1)

  if (existingError) return { error: existingError.message }

  const nextRevision =
    existingDocs && existingDocs.length > 0
      ? Number(existingDocs[0].revision) + 1
      : 1
  const filePath =
    `${projectId}/${documentGroup}/REV-${nextRevision}-${Date.now()}-${safeFileName}`

  const { data: approvedDocs, error: approvedError } = await supabase
    .from('project_documents')
    .select('id')
    .eq('project_id', projectId)
    .eq('document_group', documentGroup)
    .eq('document_status', 'approved')
    .limit(1)

  if (approvedError) return { error: approvedError.message }

  const documentStatus =
    approvedDocs && approvedDocs.length > 0 ? 'draft' : 'approved'

  const { error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(filePath, file)

  if (uploadError) return { error: uploadError.message }

  const { data: projectDoc, error: dbError } = await supabase
    .from('project_documents')
    .insert({
      project_id: projectId,
      uploaded_by: user.id,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type || null,
      document_type: documentType,
      revision: nextRevision,
      document_status: documentStatus,
      document_group: documentGroup,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('project-documents').remove([filePath])
    return { error: dbError.message }
  }

  const globalDocType = mapProjectDocTypeToGlobalDocType(documentType)

 const { error: globalDocError } = await supabase
  .from('documents_v2')
  .insert({
    name: `${documentType.toUpperCase()} REV ${nextRevision}`,
    doc_type: globalDocType,
    description: `${file.name} - Revision ${nextRevision}`,
    file_path: filePath,
    file_size: file.size,
    mime_type: file.type || null,
    original_name: file.name,
    is_confidential: false,
    project_id: projectId,
    uploaded_by: user.id,
  })

  if (globalDocError) {
    console.error('documents_v2 sync error:', globalDocError)
    await supabase.from('project_documents').delete().eq('id', projectDoc.id)
    await supabase.storage.from('project-documents').remove([filePath])
    return { error: globalDocError.message }
  }

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    activity_type: 'document_uploaded',
    title: 'Document uploaded',
    description: `${file.name} - REV ${nextRevision}`,
    new_value: `${documentType} / ${documentStatus}`,
    created_by: user.id,
  })

  revalidatePath(`/projets/${projectId}`)
  revalidatePath('/documents')

  return {
    success: true,
    data: projectDoc,
  }
}

export async function deleteProjectDocument(
  documentId: string,
  filePath: string,
  projectId: string
) {
  const supabase = await createClient()

  const { data: existing, error: findError } = await supabase
    .from('project_documents')
    .select('id, file_path, project_id, file_name')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .single()
  if (findError || !existing) return { error: findError?.message ?? 'Document not found' }
  if (existing.file_path !== filePath) return { error: 'Document path mismatch' }

  const { error: dbError } = await supabase
    .from('project_documents')
    .delete()
    .eq('id', documentId)

  if (dbError) return { error: dbError.message }

  const { error: globalDeleteError } = await supabase
    .from('documents_v2')
    .delete()
    .eq('project_id', projectId)
    .eq('file_path', filePath)
  if (globalDeleteError) return { error: globalDeleteError.message }

  const { error: storageError } = await supabase.storage
    .from('project-documents')
    .remove([filePath])

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    activity_type: 'document_deleted',
    title: 'Document deleted',
    description: existing.file_name,
    old_value: filePath,
  })

  revalidatePath(`/projets/${projectId}`)
  revalidatePath('/documents')

  return {
    success: true,
    warning: storageError
      ? `Metadata deleted; storage cleanup pending: ${storageError.message}`
      : undefined,
  }
}

export async function approveProjectDocument(
  documentId: string,
  documentGroup: string,
  projectId: string
) {
  const supabase = await createClient()

  const { data: docs, error: fetchError } = await supabase
    .from('project_documents')
    .select('id, file_name, revision, document_group, document_type, file_path')
    .eq('id', documentId)
    .limit(1)

  if (fetchError) return { error: fetchError.message }

  const clickedDoc = docs?.[0]
  if (!clickedDoc) return { error: 'Document not found' }

  const group =
    clickedDoc.document_group ||
    documentGroup ||
    clickedDoc.document_type ||
    clickedDoc.file_name.replace(/\.[^/.]+$/, '')

  const { error: obsoleteError } = await supabase
    .from('project_documents')
    .update({ document_status: 'obsolete' })
    .eq('project_id', projectId)
    .eq('document_group', group)
    .neq('id', clickedDoc.id)

  if (obsoleteError) return { error: obsoleteError.message }

  const { error: approveError } = await supabase
    .from('project_documents')
    .update({ document_status: 'approved' })
    .eq('id', clickedDoc.id)

  if (approveError) return { error: approveError.message }

  await supabase
    .from('documents_v2')
    .update({
      description: `${clickedDoc.file_name} - REV ${clickedDoc.revision} approved`,
    })
    .eq('project_id', projectId)
    .eq('file_path', clickedDoc.file_path)

  await supabase.from('project_activity_logs').insert({
    project_id: projectId,
    activity_type: 'document_approved',
    title: 'Document approved',
    description: clickedDoc.file_name,
    new_value: `REV ${clickedDoc.revision ?? ''} approved`,
  })

  revalidatePath(`/projets/${projectId}`)
  revalidatePath('/documents')

  return { success: true }
}

export async function getCommercialInvoiceDataForProject(projectId: string) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projets_v2')
    .select(`
      *,
      clients(*),
      proformas_v2!projets_v2_proforma_id_fkey(*)
    `)
    .eq('id', projectId)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  const proforma = project.proformas_v2
  if (!proforma) return { error: 'No linked proforma found' }

  const { data: lines } = await supabase
    .from('proforma_lines')
    .select('*')
    .eq('proforma_id', proforma.id)

  return {
    success: true,
    invoice: {
      ...proforma,
      lines: lines ?? [],
      project_reference: project.reference,
      country_origin: 'Türkiye',
      shipment: project.shipper ?? 'Sea Freight',
      client: project.clients,
    },
  }
}

export async function getPackingListDataForProject(projectId: string) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projets_v2')
    .select(`
      *,
      clients(*),
      proformas_v2!projets_v2_proforma_id_fkey(*)
    `)
    .eq('id', projectId)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  const proforma = project.proformas_v2
  if (!proforma) return { error: 'No linked proforma found' }

  const { data: lines } = await supabase
    .from('proforma_lines')
    .select('*')
    .eq('proforma_id', proforma.id)

  return {
    success: true,
    packing: {
      ...proforma,
      lines: lines ?? [],
      number: `PL-${proforma.number}`,
      project_reference: project.reference,
      country_origin: 'Türkiye',
      shipment: project.shipper ?? 'Sea Freight',
      client: project.clients,
    },
  }
}

export async function getDeliveryNoteDataForProject(projectId: string) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projets_v2')
    .select(`
      *,
      clients(*),
      proformas_v2!projets_v2_proforma_id_fkey(*)
    `)
    .eq('id', projectId)
    .single()

  if (projectError || !project) return { error: 'Project not found' }

  const proforma = project.proformas_v2
  if (!proforma) return { error: 'No linked proforma found' }

  const { data: lines } = await supabase
    .from('proforma_lines')
    .select('*')
    .eq('proforma_id', proforma.id)

  return {
    success: true,
    delivery: {
      ...proforma,
      lines: lines ?? [],
      number: `DN-${proforma.number}`,
      project_reference: project.reference,
      country_origin: 'Türkiye',
      shipment: project.shipper ?? 'Sea Freight',
      shipper: project.shipper ?? '',
      tracking_number: project.tracking_number ?? '',
      client: project.clients,
    },
  }
}
