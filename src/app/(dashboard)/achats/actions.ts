'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function ctx() {
  const supabase = await createClient()
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')
  const {data:p}=await supabase.from('users_profiles').select('role').eq('id',user.id).single()
  if (!p || !['admin','lead_team'].includes(p.role)) throw new Error('Accès non autorisé')
  return {supabase,user}
}
const txt=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const nullable=(f:FormData,k:string)=>txt(f,k)||null
const ref=(prefix:string)=>`${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

export async function createRfqAction(formData:FormData){
  const {supabase,user}=await ctx()
  const payload={reference:ref('IME-RFQ'),supplier_id:txt(formData,'supplier_id'),project_id:nullable(formData,'project_id'),title:txt(formData,'title'),description:nullable(formData,'description'),currency:txt(formData,'currency')||'USD',response_due_date:nullable(formData,'response_due_date'),status:'envoyee',created_by:user.id}
  if(!payload.supplier_id||!payload.title)return
  const {error}=await supabase.from('supplier_rfqs').insert(payload); if(error) throw new Error(error.message)
  revalidatePath('/achats')
}
export async function createSupplierQuoteAction(formData:FormData){
  const {supabase,user}=await ctx(); const amount=Number(txt(formData,'amount'))
  const payload={reference:ref('SQ'),rfq_id:nullable(formData,'rfq_id'),supplier_id:txt(formData,'supplier_id'),project_id:nullable(formData,'project_id'),supplier_reference:nullable(formData,'supplier_reference'),amount,currency:txt(formData,'currency')||'USD',payment_terms:nullable(formData,'payment_terms'),lead_time_days:Number(txt(formData,'lead_time_days'))||null,warranty_months:Number(txt(formData,'warranty_months'))||null,incoterm:nullable(formData,'incoterm'),validity_date:nullable(formData,'validity_date'),status:'recue',notes:nullable(formData,'notes'),created_by:user.id}
  if(!payload.supplier_id||!Number.isFinite(amount))return
  const {error}=await supabase.from('supplier_quotations').insert(payload); if(error) throw new Error(error.message)
  if(payload.rfq_id) await supabase.from('supplier_rfqs').update({status:'repondue'}).eq('id',payload.rfq_id)
  revalidatePath('/achats')
}
export async function selectSupplierQuoteAction(formData:FormData){
  const {supabase}=await ctx(); const id=txt(formData,'id'); if(!id)return
  const {data:q,error}=await supabase.from('supplier_quotations').select('id,project_id,rfq_id').eq('id',id).single(); if(error||!q)throw new Error(error?.message||'Offre introuvable')
  // Une sélection est exclusive dans le cadre d'une même RFQ, pas de tout le projet.
  // Un projet peut comporter plusieurs lots/partenaires (UPS, batteries, transformateurs, logistique, etc.).
  if(q.rfq_id){
    await supabase.from('supplier_quotations').update({status:'rejetee'}).eq('rfq_id',q.rfq_id).neq('id',id).in('status',['recue','en_analyse','selectionnee'])
  } else if(q.project_id){
    // Compatibilité avec les anciennes offres créées sans RFQ.
    await supabase.from('supplier_quotations').update({status:'rejetee'}).eq('project_id',q.project_id).is('rfq_id',null).neq('id',id).in('status',['recue','en_analyse','selectionnee'])
  }
  const {error:e}=await supabase.from('supplier_quotations').update({status:'selectionnee'}).eq('id',id); if(e)throw new Error(e.message)
  revalidatePath('/achats')
}
export async function createPurchaseOrderAction(formData:FormData){
  const {supabase,user}=await ctx(); const quoteId=txt(formData,'supplier_quotation_id')
  const {data:q,error}=await supabase.from('supplier_quotations').select('*').eq('id',quoteId).single(); if(error||!q)throw new Error(error?.message||'Offre partenaire introuvable')
  const {data:ptc}=await supabase.from('commercial_terms_profiles')
    .select('id,code,version,terms_text,status').eq('audience','partner').eq('commercial_role','purchase')
    .in('status',['active','draft']).order('status',{ascending:true}).order('created_at',{ascending:false}).limit(1).maybeSingle()
  const payload={reference:ref('IME-PO'),project_id:q.project_id,supplier_id:q.supplier_id,supplier_quotation_id:q.id,amount:q.amount,currency:q.currency,payment_terms:q.payment_terms,delivery_terms:q.incoterm,warranty_months:q.warranty_months,status:'brouillon',terms_version:ptc?`${ptc.code}-${ptc.version}${ptc.status==='draft'?'-DRAFT':''}`:null,purchase_terms_profile_id:ptc?.id??null,purchase_terms_code:ptc?.code??null,purchase_terms_version:ptc?.version??null,purchase_terms_snapshot:ptc?.terms_text??null,created_by:user.id}
  const {error:e}=await supabase.from('purchase_orders').insert(payload); if(e)throw new Error(e.message)
  await supabase.from('supplier_quotations').update({status:'selectionnee'}).eq('id',q.id)
  revalidatePath('/achats')
}
export async function createSupplierProformaAction(formData:FormData){
  const {supabase,user}=await ctx(); const poId=txt(formData,'purchase_order_id')
  const {data:po,error}=await supabase.from('purchase_orders').select('*').eq('id',poId).single(); if(error||!po)throw new Error(error?.message||'PO introuvable')
  const payload={reference:ref('SPI'),purchase_order_id:po.id,project_id:po.project_id,supplier_id:po.supplier_id,supplier_reference:nullable(formData,'supplier_reference'),amount:Number(txt(formData,'amount'))||Number(po.amount),currency:po.currency,issue_date:txt(formData,'issue_date')||new Date().toISOString().slice(0,10),due_date:nullable(formData,'due_date'),payment_terms:po.payment_terms,status:'recue',created_by:user.id}
  const {error:e}=await supabase.from('supplier_proformas').insert(payload); if(e)throw new Error(e.message)
  revalidatePath('/achats')
}
