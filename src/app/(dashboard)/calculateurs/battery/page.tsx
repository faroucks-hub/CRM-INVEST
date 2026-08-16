import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BatteryCalculator from '@/components/calculateurs/BatteryCalculator'

export const metadata: Metadata = { title: 'Calculateur Batteries' }

export default async function BatteryPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase.from('clients').select('id, company_name').eq('is_archived',false).order('company_name')
  const { data: projects } = await supabase.from('projets_v2').select('id, reference, name').order('reference')
  const { data: quotations } = await supabase.from('quotations_v2').select('id, number').order('number')
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/calculateurs" className="text-sm text-gray-400 hover:text-navy-900">Calculateurs</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-navy-900">🔋 Battery Calculator</h1>
      </div>
      <BatteryCalculator clients={clients??[]} projects={projects??[]} quotations={quotations??[]}/>
    </div>
  )
}
