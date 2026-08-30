import { NextRequest, NextResponse } from 'next/server'
import { gmailFetch, header, getOwnEmailAccount } from '@/lib/email/gmail'
import { getActionContext } from '@/lib/auth/action-context'

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function gmailMessages(query: string) {
  const list = await (await gmailFetch(`/messages?maxResults=20&q=${encodeURIComponent(query)}`)).json()
  const messages = await Promise.all((list.messages ?? []).map(async ({ id }: { id: string }) => {
    const item = await (await gmailFetch(`/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=Date`)).json()
    const headers = item.payload?.headers ?? []
    const parsedDate = new Date(header(headers, 'Date'))
    return {
      id: String(item.id),
      threadId: String(item.threadId ?? ''),
      subject: header(headers, 'Subject') || '(sans objet)',
      occurredAt: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
    }
  }))
  return { messages, total: Number(list.resultSizeEstimate ?? messages.length) }
}

export async function GET(request: NextRequest) {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })

  const email = normalizeEmail(request.nextUrl.searchParams.get('email') ?? '')
  const clientId = request.nextUrl.searchParams.get('clientId') || null
  const leadId = request.nextUrl.searchParams.get('leadId') || null
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })

  try {
    const { account, supabase, user } = await getOwnEmailAccount()
    if (!account || !user) return NextResponse.json({ error: 'Boîte Gmail non connectée' }, { status: 409 })

    await supabase.from('contact_engagements').upsert(
      { email_key: email, history_checked_at: new Date().toISOString() },
      { onConflict: 'email_key' }
    )

    const [sent, received] = await Promise.all([
      gmailMessages(`in:sent to:${email}`),
      gmailMessages(`from:${email}`),
    ])

    const rows = [
      ...sent.messages.map((message) => ({
        email_key: email,
        user_id: user.id,
        direction: 'outbound',
        outcome: 'completed',
        occurred_at: message.occurredAt,
        subject: message.subject,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        client_id: clientId,
        website_lead_id: leadId,
      })),
      ...received.messages.map((message) => ({
        email_key: email,
        user_id: user.id,
        direction: 'inbound',
        outcome: 'received',
        occurred_at: message.occurredAt,
        subject: message.subject,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        client_id: clientId,
        website_lead_id: leadId,
      })),
    ]

    if (rows.length) {
      const { error } = await supabase.from('contact_touchpoints').upsert(rows, {
        onConflict: 'user_id,gmail_message_id,direction',
        ignoreDuplicates: true,
      })
      if (error) throw new Error(error.message)
    }

    const { data: current, error: summaryError } = await supabase
      .from('contact_engagements')
      .select('*')
      .eq('email_key', email)
      .single()
    if (summaryError) throw new Error(summaryError.message)

    const outboundCount = Math.max(Number(current.outbound_count ?? 0), sent.total)
    const inboundCount = Math.max(Number(current.inbound_count ?? 0), received.total)
    const checkedAt = new Date().toISOString()
    const { data: summary, error: updateError } = await supabase
      .from('contact_engagements')
      .update({ outbound_count: outboundCount, inbound_count: inboundCount, history_checked_at: checkedAt })
      .eq('email_key', email)
      .select('*')
      .single()
    if (updateError) throw new Error(updateError.message)

    const { data: recent } = await supabase
      .from('contact_touchpoints')
      .select('id, direction, occurred_at, subject, user_id')
      .eq('email_key', email)
      .order('occurred_at', { ascending: false })
      .limit(5)

    return NextResponse.json({ summary, recent: recent ?? [] })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Vérification Gmail impossible' }, { status: 502 })
  }
}
