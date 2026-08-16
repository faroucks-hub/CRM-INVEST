'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface DocumentPayload {
  name:string; doc_type:string; description?:string;
  source_type:'upload'|'external_link';
  file_path?:string; external_url?:string;
  file_size?:number; mime_type?:string; original_name?:string;
  client_id?:string; project_id?:string; quotation_id?:string; proforma_id?:string; step_id?:string;
  is_confidential?:boolean;
}

export async function createDocumentAction(data: DocumentPayload) {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: doc, error } = await supabase
    .from('documents_v2')
    .insert({ ...data, uploaded_by: user.id })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/documents')
  return { data: doc }
}

export async function uploadDocumentAction(formData: FormData) {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const file        = formData.get('file') as File
  const name        = formData.get('name') as string || file.name
  const doc_type    = formData.get('doc_type') as string || 'autre'
  const client_id   = formData.get('client_id') as string || undefined
  const project_id  = formData.get('project_id') as string || undefined
  const quotation_id= formData.get('quotation_id') as string || undefined
  const proforma_id = formData.get('proforma_id') as string || undefined
  const step_id     = formData.get('step_id') as string || undefined
  const is_conf     = formData.get('is_confidential') === 'true'

  if (!file) return { error: 'Aucun fichier fourni' }
  if (file.size > 50 * 1024 * 1024) return { error: 'Fichier trop volumineux (max 50 Mo)' }

  // Upload vers Supabase Storage
  const ext      = file.name.split('.').pop()
  const path     = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from('project-documents')
    .upload(path, file, { contentType: file.type })

  if (uploadErr) return { error: 'Erreur upload : ' + uploadErr.message }

  const result = await createDocumentAction({
    name, doc_type, source_type: 'upload',
    file_path: path, original_name: file.name,
    file_size: file.size, mime_type: file.type,
    client_id, project_id, quotation_id, proforma_id, step_id,
    is_confidential: is_conf,
  })

  if (result.error) {
    await supabase.storage.from('project-documents').remove([path])
  }

  return result
}

export async function getDocumentUrlAction(filePath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return undefined
  const { data } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(filePath, 3600) // 1h
  return data?.signedUrl
}

export async function deleteDocumentAction(id: string, filePath?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase.from('documents_v2').delete().eq('id', id)
  if (error) return { error: error.message }

  let storageWarning: string | undefined
  if (filePath) {
    const { error: storageError } = await supabase.storage
      .from('project-documents')
      .remove([filePath])
    storageWarning = storageError?.message
  }

  revalidatePath('/documents')
  return { success: true, warning: storageWarning }
}

export async function addExternalLinkAction(data: DocumentPayload & { external_url: string }) {
  return createDocumentAction({ ...data, source_type: 'external_link' })
}
