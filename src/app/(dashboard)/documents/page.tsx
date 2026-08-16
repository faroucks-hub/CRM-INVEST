import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import DocumentsClient from '@/components/documents/DocumentsClient'

export const metadata: Metadata = { title: 'Documents' }

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()
  const role = profile?.role ?? 'commercial'
  const isAdminOrLead = role === 'admin' || role === 'lead_team'

  const { data: documents } = await supabase.from('documents_v2')
    .select(`id, name, doc_type, description, source_type, file_path, external_url,
      file_size, mime_type, original_name, is_confidential, created_at,
      client_id, project_id, quotation_id, proforma_id,
      clients!documents_v2_client_id_fkey(id, company_name),
      projets_v2!documents_v2_project_id_fkey(id, reference, name),
      users_profiles!documents_v2_uploaded_by_fkey(id, full_name)`)
    .order('created_at', { ascending: false })

  const { data: clients } = await supabase.from('clients')
    .select('id, company_name').eq('is_archived', false).order('company_name')
  const { data: projects } = await supabase.from('projets_v2')
    .select('id, reference, name').order('reference')
  const { data: quotations } = await supabase.from('quotations_v2')
    .select('id, number').order('number')
  const { data: proformas } = await supabase.from('proformas_v2')
    .select('id, number').order('number')

  return <DocumentsClient documents={documents??[]} clients={clients??[]} projects={projects??[]}
    quotations={quotations??[]} proformas={proformas??[]} role={role} isAdminOrLead={isAdminOrLead} currentUserId={user!.id}/>
}
