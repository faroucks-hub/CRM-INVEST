'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function adminCtx() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return { error:'Non authentifié' as const, supabase:null }
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error:'Accès administrateur requis' as const, supabase:null }
  return { error:null, supabase }
}

export async function updateTermsProfileAction(formData: FormData) {
  const ctx = await adminCtx(); if (!ctx.supabase) return { error:ctx.error }
  const id = String(formData.get('id') ?? '')
  const roleSummary = String(formData.get('role_summary') ?? '').trim()
  const termsText = String(formData.get('terms_text') ?? '').trim()
  if (!id || !termsText) return { error:'Texte des conditions requis' }
  const { error } = await ctx.supabase.from('commercial_terms_profiles').update({
    role_summary: roleSummary || null,
    terms_text: termsText,
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('status','draft')
  if (error) return { error:error.message }
  revalidatePath('/parametres/conditions')
  return { success:true }
}

export async function activateTermsProfileAction(formData: FormData) {
  const ctx = await adminCtx(); if (!ctx.supabase) return { error:ctx.error }
  const id = String(formData.get('id') ?? '')
  if (!id) return { error:'Profil introuvable' }
  const { data: row, error: readError } = await ctx.supabase.from('commercial_terms_profiles').select('*').eq('id',id).single()
  if (readError || !row) return { error:readError?.message ?? 'Profil introuvable' }
  // Une seule version active par code/langue. Les anciennes restent archivées.
  await ctx.supabase.from('commercial_terms_profiles').update({status:'retired',is_default:false})
    .eq('code',row.code).eq('language',row.language).eq('status','active').neq('id',id)
  const { error } = await ctx.supabase.from('commercial_terms_profiles').update({
    status:'active', effective_from:new Date().toISOString().slice(0,10), is_default:true,
  }).eq('id',id)
  if (error) return { error:error.message }
  revalidatePath('/parametres/conditions')
  revalidatePath('/quotations'); revalidatePath('/proformas'); revalidatePath('/achats')
  return { success:true }
}
