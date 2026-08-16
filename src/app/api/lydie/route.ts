import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildSystemPrompt, detectContextType, type LydieContext } from '@/lib/lydie/context'
import { z } from 'zod'

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(4000),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(10),
  session_id: z.string().uuid().nullish(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users_profiles')
      .select('id, full_name, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 403 })
    }

    const parsedRequest = requestSchema.safeParse(await req.json())
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: 'Format de conversation invalide' },
        { status: 400 },
      )
    }

    const { messages, session_id } = parsedRequest.data

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()
    const { count: recentMessages } = await supabase
      .from('ai_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', oneMinuteAgo)

    if ((recentMessages ?? 0) >= 12) {
      return NextResponse.json(
        { error: 'Trop de demandes successives. Réessayez dans une minute.' },
        { status: 429 },
      )
    }

    const role = profile.role ?? 'commercial'
    const isAdminOrLead = ['admin', 'lead_team'].includes(role)
    const lastMsg = messages[messages.length - 1]?.content ?? ''
    const query = lastMsg.toLowerCase()
    const contextType = detectContextType(lastMsg)

    const crmContext: LydieContext['crm'] = {}
    ;(crmContext as any).searchResults = {}

    // ── Recherche intelligente projet ─────────────────────────────
    if (query.includes('projet') || query.includes('project')) {
      const searchTerm = query
        .replace('projet', '')
        .replace('project', '')
        .trim()

      if (searchTerm.length > 1) {
        let projectSearchQ = supabase
          .from('projets_v2')
          .select('id, reference, name, status, progress_pct, expected_delivery, clients!inner(company_name)')
          .or(`name.ilike.%${searchTerm}%,reference.ilike.%${searchTerm}%`)
          .limit(10)

        if (role === 'commercial') {
          projectSearchQ = projectSearchQ.eq('assigned_to', user.id)
        }

        const { data } = await projectSearchQ
        ;(crmContext as any).searchResults.projects = data ?? []
      }
    }

    // ── Recherche intelligente client ──────────────────────────────
    if (query.includes('client')) {
      const searchTerm = query.replace('client', '').trim()

      if (searchTerm.length > 1) {
        let clientSearchQ = supabase
          .from('clients')
          .select('id, company_name, country, status, sector')
          .eq('is_archived', false)
          .ilike('company_name', `%${searchTerm}%`)
          .limit(10)

        if (role === 'commercial') {
          clientSearchQ = clientSearchQ.eq('assigned_to', user.id)
        }

        const { data } = await clientSearchQ
        ;(crmContext as any).searchResults.clients = data ?? []
      }
    }

    // ── Recherche intelligente quotation/devis ─────────────────────
    if (
      query.includes('quotation') ||
      query.includes('devis') ||
      query.includes('offre')
    ) {
      const { data } = await supabase
        .from('quotations_v2')
        .select('id, number, status, total_sell, currency, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      ;(crmContext as any).searchResults.quotations = data ?? []
    }

    // ── Recherche intelligente proforma ────────────────────────────
    if (query.includes('proforma')) {
      const { data } = await supabase
        .from('proformas_v2')
        .select('id, number, payment_status, status, total_sell, total_amount, currency, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      ;(crmContext as any).searchResults.proformas = data ?? []
    }

    // ── Recherche intelligente documents ───────────────────────────
    if (
      query.includes('document') ||
      query.includes('drawing') ||
      query.includes('datasheet') ||
      query.includes('pdf')
    ) {
      const { data } = await supabase
        .from('project_documents')
        .select('id, project_id, file_name, document_type, status, revision, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      ;(crmContext as any).searchResults.documents = data ?? []
    }

    // ── Recherche intelligente transmittals ────────────────────────
    if (query.includes('transmittal')) {
      const { data } = await supabase
        .from('document_transmittals')
        .select('id, transmittal_number, subject, client_name, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      ;(crmContext as any).searchResults.transmittals = data ?? []
    }

    // Clients
    let clientsQ = supabase
      .from('clients')
      .select('id, company_name, country, status, sector')
      .eq('is_archived', false)
      .limit(50)

    if (role === 'commercial') clientsQ = clientsQ.eq('assigned_to', user.id)

    const { data: clients } = await clientsQ
    crmContext.clients = clients ?? []

    // Opportunités actives
    let oppsQ = supabase
      .from('opportunities')
      .select('id, name, pipeline_stage, estimated_sell, currency, clients!inner(company_name, country)')
      .not('pipeline_stage', 'in', '(perdu_annule,projet_livre)')
      .limit(30)

    if (role === 'commercial') oppsQ = oppsQ.eq('assigned_to', user.id)

    const { data: opps } = await oppsQ
    crmContext.opportunities = opps ?? []

    // Projets
    let projQ = supabase
      .from('projets_v2')
      .select('id, reference, name, status, progress_pct, expected_delivery, clients!inner(company_name)')
      .not('status', 'in', '(cloture,annule)')
      .limit(20)

    if (role === 'commercial') projQ = projQ.eq('assigned_to', user.id)

    const { data: projs } = await projQ
    crmContext.projects = projs ?? []

    // Paiements
    if (isAdminOrLead) {
      const { data: pays } = await supabase
        .from('paiements')
        .select('id, reference, status, total_amount, currency, due_date, clients!inner(company_name)')
        .not('status', 'in', '(paye,annule)')
        .limit(20)

      crmContext.payments = pays ?? []
    }

    // Quotations
    const { data: quots } = await supabase
      .from('quotations_v2')
      .select('id, number, status, total_sell, currency')
      .not('status', 'in', '(perdue,annulee)')
      .limit(20)

    crmContext.quotations = quots ?? []

    // Proformas
    const { data: proformas } = await supabase
      .from('proformas_v2')
      .select('id, number, payment_status, status, total_sell, total_amount, currency, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    crmContext.proformas = proformas ?? []

    // Documents globaux
    const { data: documents } = await supabase
      .from('documents_v2')
      .select('id, title, file_name, document_type, type, status, revision, created_at')
      .order('created_at', { ascending: false })
      .limit(25)

    crmContext.documents = documents ?? []

    // Documents projet
    const { data: projectDocuments } = await supabase
      .from('project_documents')
      .select('id, project_id, file_name, document_type, status, revision, created_at')
      .order('created_at', { ascending: false })
      .limit(25)

    crmContext.projectDocuments = projectDocuments ?? []

    // Transmittals
    const { data: transmittals } = await supabase
      .from('document_transmittals')
      .select('id, transmittal_number, subject, client_name, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    crmContext.transmittals = transmittals ?? []

    // Calculs techniques
    const { data: calcs } = await supabase
      .from('calc_history')
      .select('id, calc_type, name, inputs, outputs, created_at')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    crmContext.calculations = calcs ?? []

    // Minimise the CRM data transmitted to the AI provider. Data that is not
    // useful for the detected request is removed before building the prompt.
    const mentions = (...terms: string[]) => terms.some(term => query.includes(term))
    const dashboardRequest = contextType === 'dashboard'
    const projectRequest = contextType === 'projet' || mentions('projet', 'project')
    const commercialRequest = contextType === 'commercial'
    const technicalRequest = contextType === 'technique'

    if (!dashboardRequest && !commercialRequest && !mentions('client')) delete crmContext.clients
    if (!dashboardRequest && !commercialRequest && !mentions('opportunit')) delete crmContext.opportunities
    if (!dashboardRequest && !projectRequest) delete crmContext.projects
    if (!dashboardRequest || !isAdminOrLead) delete crmContext.payments
    if (!dashboardRequest && !commercialRequest && !mentions('devis', 'quotation', 'offre')) delete crmContext.quotations
    if (!dashboardRequest && !commercialRequest && !mentions('proforma')) delete crmContext.proformas
    if (!projectRequest && !mentions('document', 'drawing', 'datasheet', 'pdf')) {
      delete crmContext.documents
      delete crmContext.projectDocuments
    }
    if (!projectRequest && !mentions('transmittal')) delete crmContext.transmittals
    if (!technicalRequest && !mentions('calcul')) delete crmContext.calculations

    const systemPrompt = buildSystemPrompt({
      user: { id: user.id, full_name: profile.full_name, role },
      crm: crmContext,
    }, contextType)

    const openAIKey = process.env.OPENAI_API_KEY
    if (!openAIKey) {
      return NextResponse.json({
        error: 'OPENAI_API_KEY non configurée.',
      }, { status: 500 })
    }

    const openAIResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1200,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ],
      }),
    })

    if (!openAIResp.ok) {
      const err = await openAIResp.json().catch(() => null)
      console.error('OpenAI request failed', openAIResp.status, err?.error?.type ?? 'unknown')
      return NextResponse.json({
        error: 'Le service Lydie AI est temporairement indisponible.',
      }, { status: 500 })
    }

    const openAIData = await openAIResp.json()
    const aiResponse =
      openAIData.choices?.[0]?.message?.content ??
      'Désolée, je n’ai pas pu générer une réponse.'

    const tokensUsed = openAIData.usage?.total_tokens ?? 0

    await supabase.from('ai_conversations').insert([
      {
        user_id: user.id,
        role: 'user',
        message: lastMsg,
        context_type: contextType,
        context_data: {
          clients_count: crmContext.clients?.length ?? 0,
          has_search_results: true,
        },
        session_id: session_id ?? null,
        model: 'gpt-4o-mini',
      },
      {
        user_id: user.id,
        role: 'assistant',
        message: aiResponse,
        response: aiResponse,
        context_type: contextType,
        session_id: session_id ?? null,
        tokens_used: tokensUsed,
        model: 'gpt-4o-mini',
      },
    ])

    return NextResponse.json({
      message: aiResponse,
      context_type: contextType,
      tokens_used: tokensUsed,
    })
  } catch (error) {
    console.error('Lydie AI error:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}
