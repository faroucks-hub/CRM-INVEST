import { NextRequest, NextResponse } from 'next/server'
import { gmailFetch, header, extractBody, encodeMessage, getOwnEmailAccount } from '@/lib/email/gmail'
import { getActionContext } from '@/lib/auth/action-context'

export async function GET(request: NextRequest) {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (id) {
      const message = await (await gmailFetch(`/messages/${encodeURIComponent(id)}?format=full`)).json()
      const headers = message.payload?.headers ?? []
      return NextResponse.json({ id: message.id, threadId: message.threadId, from: header(headers, 'From'), to: header(headers, 'To'), subject: header(headers, 'Subject'), date: header(headers, 'Date'), messageId: header(headers, 'Message-ID'), references: header(headers, 'References'), body: extractBody(message.payload), labels: message.labelIds ?? [] })
    }
    const query = request.nextUrl.searchParams.get('q') || 'in:inbox'
    const list = await (await gmailFetch(`/messages?maxResults=30&q=${encodeURIComponent(query)}`)).json()
    const messages = await Promise.all((list.messages ?? []).map(async ({ id }: { id: string }) => {
      const item = await (await gmailFetch(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`)).json()
      const headers = item.payload?.headers ?? []
      return { id, threadId: item.threadId, from: header(headers, 'From'), subject: header(headers, 'Subject') || '(sans objet)', date: header(headers, 'Date'), snippet: item.snippet ?? '', unread: (item.labelIds ?? []).includes('UNREAD') }
    }))
    return NextResponse.json({ messages })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur Gmail' }, { status: 502 }) }
}

export async function POST(request: NextRequest) {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  try {
    const input = await request.json()
    const to = String(input.to ?? '').trim(), subject = String(input.subject ?? '').trim(), body = String(input.body ?? '').trim()
    if (!/^\S+@\S+\.\S+$/.test(to) || !subject || !body) return NextResponse.json({ error: 'Destinataire, objet et message sont requis' }, { status: 400 })
    if (subject.length > 300 || body.length > 100_000) return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    const { account, supabase, user } = await getOwnEmailAccount()
    if (!account || !user) return NextResponse.json({ error: 'Boîte Gmail non connectée' }, { status: 409 })
    const attachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 5) : []
    const totalBytes = attachments.reduce((sum:number, file:any) => sum + String(file.data ?? '').length, 0)
    if (totalBytes > 13_000_000) return NextResponse.json({ error: 'Les pièces jointes dépassent 10 Mo' }, { status: 400 })
    const raw = encodeMessage({ from: account.email_address, to, subject, body, inReplyTo: input.inReplyTo, references: input.references, attachments })
    const sent = await (await gmailFetch('/messages/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ raw, threadId: input.threadId || undefined }) })).json()
    await supabase.from('email_activity').insert({ user_id: user.id, gmail_message_id: sent.id, gmail_thread_id: sent.threadId, direction: 'outbound', recipient: to, subject, website_lead_id: input.leadId || null })
    if (input.leadId) await supabase.from('email_crm_links').upsert({ user_id: user.id, gmail_thread_id: sent.threadId, website_lead_id: input.leadId }, { onConflict: 'user_id,gmail_thread_id' })
    return NextResponse.json({ success: true, id: sent.id, threadId: sent.threadId })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Envoi impossible' }, { status: 502 }) }
}

export async function DELETE() {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  const { account, supabase } = await getOwnEmailAccount()
  if (account) await supabase.from('email_accounts').delete().eq('id', account.id)
  return NextResponse.json({ success: true })
}
