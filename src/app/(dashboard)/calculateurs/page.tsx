import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Calculateurs Techniques' }

const CALCS = [
  { href:'/calculateurs/ups',       icon:'⚡', title:'UPS Calculator', desc:'Dimensionnement UPS — puissance, autonomie, batteries', color:'bg-blue-50 border-blue-200 text-blue-700' },
  { href:'/calculateurs/battery',   icon:'🔋', title:'Battery Calculator', desc:'Dimensionnement banc batteries — série/parallèle, capacité Ah', color:'bg-amber-50 border-amber-200 text-amber-700' },
  { href:'/calculateurs/rectifier', icon:'🔌', title:'Rectifier Calculator', desc:'Calcul chargeur/rectifier — courant, puissance AC/DC', color:'bg-teal-50 border-teal-200 text-teal-700' },
  { href:'/calculateurs/inverter',  icon:'〰️', title:'Inverter Calculator', desc:'Conversion DC/AC — puissance, courants, surcharge et autonomie', color:'bg-violet-50 border-violet-200 text-violet-700' },
  { href:'/calculateurs/frequency-converter', icon:'🔄', title:'Frequency Converter', desc:'Conversion AC/AC — tensions, phases, fréquences et démarrage', color:'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { href:'/calculateurs/bess',      icon:'☀️', title:'BESS Calculator', desc:'Système de stockage BESS — capacité kWh, PCS, durée de vie', color:'bg-green-50 border-green-200 text-green-700' },
]

export default async function CalculateursPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: stats } = await supabase.from('calc_history')
    .select('calc_type').eq('created_by', user!.id)

  const counts = (stats??[]).reduce((acc:{[k:string]:number}, r) => {
    acc[r.calc_type] = (acc[r.calc_type]||0) + 1; return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-navy-900 mb-1">Calculateurs techniques</h1>
        <p className="text-sm text-gray-500">Dimensionnement ou vérification d'une installation existante — saisie manuelle des données techniques</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {CALCS.map(c => (
          <Link key={c.href} href={c.href} className={`card p-6 border-2 hover:shadow-md transition-all hover:-translate-y-0.5 ${c.color.split(' ')[1]}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{c.icon}</div>
              {counts[c.href.split('/').pop()??''] > 0 && (
                <span className="text-xs bg-white px-2 py-0.5 rounded-full border text-gray-500">
                  {counts[c.href.split('/').pop()??'']} calcul(s)
                </span>
              )}
            </div>
            <h2 className={`text-base font-semibold mb-1 ${c.color.split(' ')[2]}`}>{c.title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{c.desc}</p>
            <div className={`mt-4 text-xs font-medium ${c.color.split(' ')[2]} flex items-center gap-1`}>
              Ouvrir le calculateur →
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          ⚠️ Tous les résultats sont des estimations préliminaires. Un ingénieur certifié doit valider le dimensionnement final.
        </p>
        <Link href="/calculateurs/historique" className="btn btn-outline btn-sm">
          Historique des calculs
        </Link>
      </div>
    </div>
  )
}
