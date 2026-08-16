import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InverterCalculator from '@/components/calculateurs/InverterCalculator'

export const metadata: Metadata = { title: 'Calculateur Inverter' }

export default async function InverterPage() {
  const supabase = await createClient()
  const [{ data: clients }, { data: projects }, { data: quotations }] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('is_archived', false).order('company_name'),
    supabase.from('projets_v2').select('id, reference, name').not('status', 'in', '(cloture,annule)').order('reference'),
    supabase.from('quotations_v2').select('id, number').order('number'),
  ])

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/calculateurs" className="text-sm text-gray-400 hover:text-navy-900">Calculateurs</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-navy-900">〰️ Inverter Calculator</h1>
      </div>
      <InverterCalculator clients={clients ?? []} projects={projects ?? []} quotations={quotations ?? []} />
    </div>
  )
}
