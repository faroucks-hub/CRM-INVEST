import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PartnerDetailClient from '@/components/fournisseurs/PartnerDetailClient'

export const metadata: Metadata = { title: 'Fiche partenaire' }

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users_profiles').select('role').eq('id',user.id).single()
  const role=profile?.role??'commercial'
  if(role==='commercial') redirect('/dashboard')

  const { data: partner } = await supabase.from('suppliers').select('*').eq('id',id).single()
  if(!partner) notFound()

  const { data: invoices } = await supabase.from('supplier_invoices').select('*').eq('supplier_id',id).is('voided_at',null).order('issue_date',{ascending:false})
  const { data: payments } = await supabase.from('supplier_payments').select('*').eq('supplier_id',id).is('voided_at',null).order('payment_date',{ascending:false})
  const { data: products } = await supabase.from('products').select('id,reference,name,category,is_active').eq('supplier_id',id).order('name')

  const projectIds=[...new Set((invoices??[]).map(i=>i.project_id).filter(Boolean))] as string[]
  let projects: Record<string,unknown>[]=[]
  if(projectIds.length){
    const {data}=await supabase.from('projets_v2').select('id,reference,name,status,workflow_stage,progress_pct,expected_delivery,contract_value,currency,created_at,updated_at').in('id',projectIds).order('created_at',{ascending:false})
    projects=(data??[]) as unknown as Record<string,unknown>[]
  }

  return <PartnerDetailClient partner={partner as unknown as Record<string,unknown>} invoices={(invoices??[]) as unknown as Record<string,unknown>[]} payments={(payments??[]) as unknown as Record<string,unknown>[]} projects={projects} products={(products??[]) as unknown as Record<string,unknown>[]} role={role}/>
}
