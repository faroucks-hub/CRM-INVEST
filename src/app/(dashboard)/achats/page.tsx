import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProcurementClient from '@/components/fournisseurs/ProcurementClient'

export default async function AchatsPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect('/login')
 const {data:profile}=await supabase.from('users_profiles').select('role').eq('id',user.id).single(); if(!profile||!['admin','lead_team'].includes(profile.role))redirect('/dashboard')
 const [s,p,r,q,o,pi]=await Promise.all([
  supabase.from('suppliers').select('id,reference,company_name,country').eq('is_active',true).order('company_name'),
  supabase.from('projets_v2').select('id,reference,name,status,currency,contract_value').order('created_at',{ascending:false}).limit(200),
  supabase.from('supplier_rfqs').select('*').order('created_at',{ascending:false}),
  supabase.from('supplier_quotations').select('*').order('created_at',{ascending:false}),
  supabase.from('purchase_orders').select('*').order('created_at',{ascending:false}),
  supabase.from('supplier_proformas').select('*').order('created_at',{ascending:false}),
 ])
 return <ProcurementClient suppliers={s.data??[]} projects={p.data??[]} rfqs={r.data??[]} quotes={q.data??[]} orders={o.data??[]} proformas={pi.data??[]}/>
}
