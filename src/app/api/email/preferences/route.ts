import { NextRequest, NextResponse } from 'next/server'
import { getActionContext } from '@/lib/auth/action-context'

const validFonts = new Set(['sans', 'century-gothic', 'serif', 'mono'])

export async function GET() {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  const [{ data, error }, { data: profile }] = await Promise.all([
    access.supabase.from('email_preferences').select('signature,signature_enabled,reply_signature,reply_signature_enabled,signature_logo_enabled,compose_font').eq('user_id', access.user.id).maybeSingle(),
    access.supabase.from('users_profiles').select('full_name,position,phone').eq('id', access.user.id).maybeSingle(),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const suggestedSignature = [profile?.full_name, profile?.position, 'IM ÉNERGIE', profile?.phone, access.user.email, 'www.im-energie.com'].filter(Boolean).join('\n')
  return NextResponse.json({ signature: data?.signature ?? '', signatureEnabled: data?.signature_enabled ?? true, replySignature: data?.reply_signature ?? '', replySignatureEnabled: data?.reply_signature_enabled ?? true, logoEnabled: data?.signature_logo_enabled ?? true, suggestedSignature, font: data?.compose_font ?? 'sans' })
}

export async function PUT(request: NextRequest) {
  const access = await getActionContext('messaging')
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 403 })
  const input = await request.json()
  const signature = String(input.signature ?? '').trim()
  const replySignature = String(input.replySignature ?? '').trim()
  const signatureEnabled = input.signatureEnabled !== false
  const replySignatureEnabled = input.replySignatureEnabled !== false
  const logoEnabled = input.logoEnabled !== false
  const font = validFonts.has(String(input.font)) ? String(input.font) : 'sans'
  if (signature.length > 2000 || replySignature.length > 2000) return NextResponse.json({ error: 'Signature trop longue' }, { status: 400 })
  const { error } = await access.supabase.from('email_preferences').upsert({ user_id: access.user.id, signature, signature_enabled: signatureEnabled, reply_signature: replySignature, reply_signature_enabled: replySignatureEnabled, signature_logo_enabled: logoEnabled, compose_font: font, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, signature, signatureEnabled, replySignature, replySignatureEnabled, logoEnabled, font })
}
