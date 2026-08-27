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
    const folder = request.nextUrl.searchParams.get('folder') || 'inbox'
    const search = request.nextUrl.searchParams.get('q')?.trim() || ''
    const pageToken = request.nextUrl.searchParams.get('pageToken') || ''
    const folderQueries: Record<string,string> = { inbox:'in:inbox', sent:'in:sent', drafts:'in:drafts', trash:'in:trash', starred:'is:starred' }
    const query = [folderQueries[folder] || 'in:inbox', search].filter(Boolean).join(' ')
    const list = await (await gmailFetch(`/messages?maxResults=30&q=${encodeURIComponent(query)}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)).json()
    const messages = await Promise.all((list.messages ?? []).map(async ({ id }: { id: string }) => {
      const item = await (await gmailFetch(`/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`)).json()
      const headers = item.payload?.headers ?? []
      return { id, threadId: item.threadId, from: header(headers, 'From'), to: header(headers, 'To'), subject: header(headers, 'Subject') || '(sans objet)', date: header(headers, 'Date'), snippet: item.snippet ?? '', unread: (item.labelIds ?? []).includes('UNREAD'), labels:item.labelIds ?? [] }
    }))
    return NextResponse.json({ messages, nextPageToken:list.nextPageToken ?? null, total:list.resultSizeEstimate ?? 0 })
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erreur Gmail' }, { status: 502 }) }
}

export async function PATCH(request: NextRequest) {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  try {
    const input = await request.json()
    const id = String(input.id ?? ''), action = String(input.action ?? '')
    if (!id) return NextResponse.json({ error:'Message requis' }, { status:400 })
    if (action === 'trash') await gmailFetch(`/messages/${encodeURIComponent(id)}/trash`, { method:'POST' })
    else if (action === 'restore') await gmailFetch(`/messages/${encodeURIComponent(id)}/untrash`, { method:'POST' })
    else {
      const addLabelIds = action === 'star' ? ['STARRED'] : action === 'unread' ? ['UNREAD'] : []
      const removeLabelIds = action === 'unstar' ? ['STARRED'] : action === 'read' ? ['UNREAD'] : []
      await gmailFetch(`/messages/${encodeURIComponent(id)}/modify`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({addLabelIds,removeLabelIds}) })
    }
    return NextResponse.json({ success:true })
  } catch (error) { return NextResponse.json({ error:error instanceof Error ? error.message : 'Action impossible' }, {status:502}) }
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
    const cc = String(input.cc ?? '').trim()
    const importance = input.importance === 'high' ? 'high' : 'normal'
    const raw = encodeMessage({ from: account.email_address, to, cc: cc || undefined, subject, body, inReplyTo: input.inReplyTo, references: input.references, importance, attachments })
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
