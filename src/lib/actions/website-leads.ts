'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActionContext } from '@/lib/auth/action-context'

export type WebsiteLeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'quotation'
  | 'negotiation'
  | 'won'
  | 'lost'

const VALID_STATUSES: WebsiteLeadStatus[] = [
  'new',
  'contacted',
  'qualified',
  'quotation',
  'negotiation',
  'won',
  'lost',
]

function normalizeStatus(status: string): WebsiteLeadStatus {
  return VALID_STATUSES.includes(status as WebsiteLeadStatus)
    ? (status as WebsiteLeadStatus)
    : 'new'
}

export async function updateWebsiteLeadStatusAction(
  leadId: string,
  status: string
) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!leadId) return { error: 'Lead invalide' }
  const normalizedStatus = normalizeStatus(status)

  const { error } = await supabase
    .from('website_leads')
    .update({ status: normalizedStatus })
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)

  return { success: true }
}

export async function updateWebsiteLeadNotesAction(
  leadId: string,
  internalNotes: string
) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }
  if (!leadId) return { error: 'Lead invalide' }
  if (internalNotes.length > 10_000) return { error: 'Notes trop longues' }

  const { error } = await supabase
    .from('website_leads')
    .update({ internal_notes: internalNotes || null })
    .eq('id', leadId)

  if (error) return { error: error.message }

  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)

  return { success: true }
}

export async function updateWebsiteLeadAssignmentAction(leadId: string, assignedTo: string | null) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  if (access.role === 'commercial' && assignedTo !== access.user.id) return { error: 'Attribution réservée au Team Leader ou à l’administrateur' }
  const { error } = await access.supabase.from('website_leads').update({ assigned_to: assignedTo }).eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)
  return { success: true }
}

export async function updateWebsiteLeadContactPolicyAction(leadId: string, doNotContact: boolean) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const { error } = await access.supabase.from('website_leads').update({ do_not_contact: doNotContact }).eq('id', leadId)
  if (error) return { error: error.message }
  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)
  return { success: true }
}

export async function convertWebsiteLeadToOpportunityAction(leadId: string) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'Non authentifié' }

  const { data: lead, error: leadError } = await supabase
    .from('website_leads')
    .select('*')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: leadError?.message || 'Lead introuvable' }
  }

  if (lead.converted_opportunity_id) {
    return {
      success: true,
      opportunityId: String(lead.converted_opportunity_id),
      alreadyConverted: true,
    }
  }

  const companyName = String(lead.company || lead.full_name || 'Website Lead')
  const contactEmail = lead.email ? String(lead.email) : null

  let clientId: string | null = null
  let newlyCreatedClientId: string | null = null

  if (contactEmail) {
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('contact_email', contactEmail)
      .maybeSingle()

    clientId = existingClient?.id ?? null
  }

  if (!clientId) {
    const { data: existingCompany } = await supabase
      .from('clients')
      .select('id')
      .ilike('company_name', companyName)
      .maybeSingle()

    clientId = existingCompany?.id ?? null
  }

  if (!clientId) {
    const { data: refData } = await supabase.rpc('generate_client_reference')

    const { data: createdClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        reference: refData ?? `WEB-${Date.now()}`,
        company_name: companyName,
        status: 'prospect',
        country: lead.country || 'Non renseigné',
        contact_name: lead.full_name || null,
        contact_email: contactEmail,
        contact_phone: lead.phone || null,
        lead_source: 'site_web',
        source: 'Website Lead',
        notes: `Créé automatiquement depuis un lead site web.\n\nMessage initial:\n${lead.message || ''}`,
        created_by: user.id,
        assigned_to: user.id,
      })
      .select('id')
      .single()

    if (clientError || !createdClient) {
      return { error: clientError?.message || 'Création client impossible' }
    }

    clientId = createdClient.id
    newlyCreatedClientId = createdClient.id
  }

  const { data: createdOpportunity, error: opportunityError } = await supabase
    .from('opportunities')
    .insert({
      name: `Website Lead — ${companyName}`,
      client_id: clientId,
      assigned_to: user.id,
      stage: 'qualification',
      pipeline_stage: 'besoin_identifie',
      probability: 30,
      currency: 'USD',
      description: lead.message || null,
      source: 'Website Lead',
      lead_source: 'site_web',
      notes: `Converti depuis Website Lead ID: ${lead.id}\nContact: ${lead.full_name || ''}\nEmail: ${lead.email || ''}\nTéléphone: ${lead.phone || ''}\nPays: ${lead.country || ''}`,
      website_lead_id: lead.id,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (opportunityError || !createdOpportunity) {
    if (newlyCreatedClientId) {
      await supabase.from('clients').delete().eq('id', newlyCreatedClientId)
    }
    return { error: opportunityError?.message || 'Création opportunité impossible' }
  }

  const { error: updateError } = await supabase
    .from('website_leads')
    .update({
      status: 'qualified',
      converted_at: new Date().toISOString(),
      converted_opportunity_id: createdOpportunity.id,
    })
    .eq('id', leadId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/website-leads')
  revalidatePath(`/website-leads/${leadId}`)
  revalidatePath('/opportunites')

  return {
    success: true,
    opportunityId: createdOpportunity.id,
  }
}

export async function softDeleteLead(leadId: string, reason?: string) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('website_leads')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      deleted_reason: reason?.trim() || null,
    })
    .eq('id', leadId)
    .is('deleted_at', null)

  if (error) return { error: error.message }
  revalidatePath('/website-leads')
  revalidatePath('/website-leads/trash')
  return { success: true }
}

export async function restoreLead(leadId: string) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { error } = await supabase
    .from('website_leads')
    .update({
      deleted_at: null,
      deleted_by: null,
      deleted_reason: null,
    })
    .eq('id', leadId)

  if (error) return { error: error.message }
  revalidatePath('/website-leads')
  revalidatePath('/website-leads/trash')
  return { success: true }
}

export async function hardDeleteLead(leadId: string) {
  const access = await getActionContext('website_leads')
  if (!access.ok) return { error: access.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const { data: profile } = await supabase
    .from('users_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { error: 'Accès réservé aux administrateurs' }

  const { data, error } = await supabase.rpc('purge_lead', { p_id: leadId })
  if (error) return { error: error.message }
  if (data?.status !== 'ok') return { error: 'Suppression refusée' }

  revalidatePath('/website-leads')
  revalidatePath('/website-leads/trash')
  return { success: true }
}
