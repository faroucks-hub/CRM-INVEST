import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CommercialTermsClient from '@/components/parametres/CommercialTermsClient'
export const metadata:Metadata={title:'Conditions commerciales'}
export default async function Page(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login')
 const {data:p}=await supabase.from('users_profiles').select('role').eq('id',user.id).single(); if(p?.role!=='admin')redirect('/parametres')
 const {data:profiles}=await supabase.from('commercial_terms_profiles').select('*').order('audience').order('commercial_role').order('created_at',{ascending:false})
 return <CommercialTermsClient profiles={profiles??[]}/>
}
