import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptSecret } from '@/lib/email/crypto'

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? request.nextUrl.origin
  const fail = (reason: string) => NextResponse.redirect(`${base}/messagerie?error=${encodeURIComponent(reason)}`)
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code || !state || state !== request.cookies.get('gmail_oauth_state')?.value) return fail('Validation OAuth invalide')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return fail('Session expirée')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID ?? '', client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '', redirect_uri: `${base}/api/email/google/callback`, grant_type: 'authorization_code' }) })
  const token = await response.json()
  if (!response.ok || !token.access_token || !token.refresh_token) return fail('Google n’a pas retourné une autorisation hors ligne')
  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } })
  const profile = await profileResponse.json()
  if (!profile.email) return fail('Adresse Gmail introuvable')
  const { error } = await supabase.from('email_accounts').upsert({ user_id: user.id, provider: 'google', email_address: profile.email, access_token_encrypted: encryptSecret(token.access_token), refresh_token_encrypted: encryptSecret(token.refresh_token), token_expires_at: new Date(Date.now() + Number(token.expires_in ?? 3600) * 1000).toISOString(), scopes: token.scope?.split(' ') ?? [], status: 'active', updated_at: new Date().toISOString() }, { onConflict: 'user_id,provider' })
  const result = error ? fail(error.message) : NextResponse.redirect(`${base}/messagerie?connected=1`)
  result.cookies.delete('gmail_oauth_state')
  return result
}
