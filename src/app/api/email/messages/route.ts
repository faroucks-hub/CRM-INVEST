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
    const folderQueries: Record<string,string> = { inbox:'in:inbox', sent:'in:sent', drafts:'in:drafts', trash:'in:trash', starred:'is:starred', important:'is:important' }
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
      const addLabelIds = action === 'star' ? ['STARRED'] : action === 'important' ? ['IMPORTANT'] : action === 'unread' ? ['UNREAD'] : []
      const removeLabelIds = action === 'unstar' ? ['STARRED'] : action === 'unimportant' ? ['IMPORTANT'] : action === 'read' ? ['UNREAD'] : []
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
    const to = String(input.to ?? '').trim(), subject = String(input.subject ?? '').trim()
    const body = String(input.body ?? '').trim().replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/javascript:/gi, '')
    const readableBody = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim()
    if (!/^\S+@\S+\.\S+$/.test(to) || !subject || !readableBody) return NextResponse.json({ error: 'Destinataire, objet et message sont requis' }, { status: 400 })
    if (subject.length > 300 || body.length > 100_000) return NextResponse.json({ error: 'Message trop long' }, { status: 400 })
    const { account, supabase, user } = await getOwnEmailAccount()
    if (!account || !user) return NextResponse.json({ error: 'Boîte Gmail non connectée' }, { status: 409 })
    const catalogueFiles = {
      africa_fr: '/catalogues/IM_Energie_Catalogue_Afrique_2027_FR_Email.pdf',
      africa_en: '/catalogues/IM_Energie_Catalogue_Afrique_2027_EN_Email.pdf',
      international_fr: '/catalogues/IM_Energie_Catalogue_International_2027_FR_Email.pdf',
      international_en: '/catalogues/IM_Energie_General_Catalogue_2027_EN_Email.pdf',
    } as const
    const requestedAttachments = Array.isArray(input.attachments) ? input.attachments.slice(0, 5) : []
    const manualBytes = requestedAttachments.filter((file:any) => !file.catalogueKey).reduce((sum:number, file:any) => {
      const encoded = String(file.data ?? '').replace(/^data:[^,]+,/, '').replace(/\s/g, '')
      const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
      return sum + Math.max(0, Math.floor(encoded.length * 3 / 4) - padding)
    }, 0)
    if (manualBytes > 3 * 1024 * 1024) return NextResponse.json({ error: 'Les fichiers ajoutés manuellement dépassent la limite de 3 Mo' }, { status: 400 })
    const attachments = await Promise.all(requestedAttachments.map(async (file:any) => {
      if (!file.catalogueKey) return { name: String(file.name ?? 'piece-jointe').slice(0, 180), type: String(file.type ?? 'application/octet-stream').slice(0, 120), data: String(file.data ?? '') }
      if (!Object.prototype.hasOwnProperty.call(catalogueFiles, file.catalogueKey)) throw new Error('Catalogue non autorisé')
      const catalogueKey = file.catalogueKey as keyof typeof catalogueFiles
      const catalogueResponse = await fetch(new URL(catalogueFiles[catalogueKey], request.url), {
        cache: 'force-cache',
        redirect: 'manual',
        headers: { cookie: request.headers.get('cookie') ?? '' },
      })
      if (!catalogueResponse.ok) throw new Error(`Catalogue ${catalogueKey.toUpperCase()} indisponible`)
      const catalogue = Buffer.from(await catalogueResponse.arrayBuffer())
      if (catalogue.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error(`Le fichier ${catalogueKey.toUpperCase()} reçu n'est pas un PDF valide`)
      return { name: catalogueFiles[catalogueKey].split('/').at(-1)!, type: 'application/pdf', data: catalogue.toString('base64') }
    }))
    const totalBytes = attachments.reduce((sum:number, file:any) => {
      const encoded = String(file.data ?? '').replace(/^data:[^,]+,/, '').replace(/\s/g, '')
      const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
      return sum + Math.max(0, Math.floor(encoded.length * 3 / 4) - padding)
    }, 0)
    if (totalBytes > 10 * 1024 * 1024) return NextResponse.json({ error: 'Les pièces jointes dépassent 10 Mo' }, { status: 400 })
    const cc = String(input.cc ?? '').trim()
    const importance = input.importance === 'high' ? 'high' : 'normal'
    const raw = encodeMessage({ from: account.email_address, to, cc: cc || undefined, subject, body, inReplyTo: input.inReplyTo, references: input.references, importance, attachments })
    const sent = await (await gmailFetch('/messages/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ raw, threadId: input.threadId || undefined }) })).json()
    await supabase.from('email_activity').insert({ user_id: user.id, gmail_message_id: sent.id, gmail_thread_id: sent.threadId, direction: 'outbound', recipient: to, subject, website_lead_id: input.leadId || null, client_id: input.clientId || null })
    if (input.leadId) await supabase.from('email_crm_links').upsert({ user_id: user.id, gmail_thread_id: sent.threadId, website_lead_id: input.leadId }, { onConflict: 'user_id,gmail_thread_id' })
    if (input.clientId) await supabase.from('email_crm_links').upsert({ user_id: user.id, gmail_thread_id: sent.threadId, client_id: input.clientId }, { onConflict: 'user_id,gmail_thread_id' })
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
