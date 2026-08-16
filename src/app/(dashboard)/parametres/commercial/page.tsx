import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Paramètres commerciaux' }

export default async function CommercialSettingsPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/parametres')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Paramètres commerciaux</h1>
        <p className="page-subtitle">Valeurs par défaut pour le pipeline commercial</p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">Devises supportées</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { code:'USD', symbol:'$', name:'Dollar américain' },
            { code:'EUR', symbol:'€', name:'Euro' },
            { code:'TRY', symbol:'₺', name:'Livre turque' },
            { code:'XOF', symbol:'FCFA', name:'Franc CFA Ouest' },
          ].map(c => (
            <div key={c.code} className="flex items-center gap-2 px-3 py-2 bg-navy-900/5
                                         border border-navy-900/10 rounded-lg">
              <span className="font-bold text-navy-900 text-sm">{c.code}</span>
              <span className="text-gold-500 font-semibold">{c.symbol}</span>
              <span className="text-xs text-gray-400">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">Incoterms disponibles</h2>
        <div className="flex gap-2 flex-wrap">
          {['DAP','DDP','FOB','CIF','CFR','EXW','FCA','CPT','CIP','DPU','FAS'].map(t => (
            <span key={t} className="text-xs font-semibold px-2.5 py-1.5 bg-surface-100
                                      border border-gray-200 rounded-lg text-navy-900">
              {t}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Les incoterms sont définis par la Chambre de Commerce Internationale (ICC 2020).</p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">Étapes pipeline (10 étapes)</h2>
        <div className="space-y-2">
          {[
            'Nouveau lead','Besoin identifié','Étude technique','Offre en préparation',
            'Offre envoyée','Négociation','Commande reçue','Projet en cours',
            'Projet livré','Perdu / Annulé',
          ].map((s,i) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-navy-900/10 text-navy-900 text-xs
                               font-bold flex items-center justify-center flex-shrink-0">
                {i+1}
              </span>
              <span className="text-gray-700">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-4">Secteurs d'activité</h2>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          {['Banques & Finance','Télécommunications','Mines & Extraction','Data Centers',
            'Hôpitaux & Santé','Marine & Offshore','Industrie','Solaire & Énergie','Autre'].map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-gold-400 rounded-full flex-shrink-0" />
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
