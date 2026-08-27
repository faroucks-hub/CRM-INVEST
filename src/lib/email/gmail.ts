import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { decryptSecret, encryptSecret } from './crypto'

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.modify', 'openid', 'email']

export type GmailAccount = {
  id: string; user_id: string; email_address: string; access_token_encrypted: string
  refresh_token_encrypted: string; token_expires_at: string; status: string
}

export async function getOwnEmailAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, account: null, supabase }
  const { data } = await supabase.from('email_accounts').select('*').eq('user_id', user.id).maybeSingle()
  return { user, account: data as GmailAccount | null, supabase }
}

export async function getValidAccessToken(account: GmailAccount) {
  if (new Date(account.token_expires_at).getTime() > Date.now() + 60_000) {
    return decryptSecret(account.access_token_encrypted)
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: decryptSecret(account.refresh_token_encrypted), grant_type: 'refresh_token',
    }), cache: 'no-store',
  })
  const tokens = await response.json()
  if (!response.ok || !tokens.access_token) throw new Error('La connexion Gmail doit être renouvelée')
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString()
  const { supabase } = await getOwnEmailAccount()
  await supabase.from('email_accounts').update({ access_token_encrypted: encryptSecret(tokens.access_token), token_expires_at: expiresAt, status: 'active', updated_at: new Date().toISOString() }).eq('id', account.id)
  return tokens.access_token as string
}

export async function gmailFetch(path: string, init?: RequestInit) {
  const { account } = await getOwnEmailAccount()
  if (!account) throw new Error('Boîte Gmail non connectée')
  const token = await getValidAccessToken(account)
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) }, cache: 'no-store',
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Gmail API (${response.status}) : ${detail.slice(0, 240)}`)
  }
  return response
}

export function decodeBase64Url(value = '') {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

export function header(headers: Array<{ name: string; value: string }> = [], name: string) {
  return headers.find(item => item.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export function extractBody(part: any): string {
  if (part?.mimeType === 'text/plain' && part.body?.data) return decodeBase64Url(part.body.data)
  for (const child of part?.parts ?? []) { const body = extractBody(child); if (body) return body }
  if (part?.body?.data) return decodeBase64Url(part.body.data).replace(/<[^>]+>/g, ' ')
  return ''
}

export function encodeMessage({ from, to, cc, subject, body, inReplyTo, references, importance = 'normal', attachments = [] }: { from: string; to: string; cc?: string; subject: string; body: string; inReplyTo?: string; references?: string; importance?: 'normal'|'high'; attachments?: Array<{ name:string; type:string; data:string }> }) {
  const boundary = `ime_${Date.now().toString(36)}`
  const lines = [`From: ${from}`, `To: ${to}`]
  if (cc) lines.push(`Cc: ${cc}`)
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`, 'MIME-Version: 1.0')
  if (importance === 'high') lines.push('Importance: high', 'Priority: urgent', 'X-Priority: 1')
  if (inReplyTo) lines.push(`In-Reply-To: ${inReplyTo}`)
  if (references) lines.push(`References: ${references}`)
  if (!attachments.length) lines.push('Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(body).toString('base64'))
  else {
    lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(body).toString('base64'))
    for (const file of attachments) lines.push(`--${boundary}`, `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name.replace(/["\r\n]/g, '_')}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${file.name.replace(/["\r\n]/g, '_')}"`, '', file.data.replace(/^data:[^,]+,/, ''))
    lines.push(`--${boundary}--`)
  }
  return Buffer.from(lines.join('\r\n')).toString('base64url')
}
