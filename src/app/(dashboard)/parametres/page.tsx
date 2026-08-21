import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Building2, Settings2, ClipboardList, Shield, ScrollText, LockKeyhole } from 'lucide-react'

export const metadata: Metadata = { title: 'Paramètres' }

const SETTINGS_SECTIONS = [
  {
    href:'/parametres/acces',
    icon:LockKeyhole, title:'Accès et permissions',
    desc:'Définir les modules accessibles aux Leads et aux Commerciaux.',
    color:'bg-green-50 text-green-700',
    adminOnly:true,
  },
  {
    href:'/parametres/utilisateurs',
    icon:Users, title:'Utilisateurs',
    desc:'Gérer les comptes, rôles et accès de l\'équipe IME.',
    color:'bg-blue-50 text-blue-600',
    adminOnly:true,
  },
  {
    href:'/parametres/entreprise',
    icon:Building2, title:'Entreprise',
    desc:'Informations société, coordonnées et données bancaires pour les PDF.',
    color:'bg-amber-50 text-amber-600',
    adminOnly:true,
  },
  {
    href:'/parametres/commercial',
    icon:Settings2, title:'Commercial',
    desc:'Devises, Incoterms, conditions de paiement et valeurs par défaut.',
    color:'bg-teal-50 text-teal-600',
    adminOnly:true,
  },
  {
    href:'/parametres/conditions',
    icon:ScrollText, title:'Conditions contractuelles',
    desc:'Profils FAC / RES / DIST, versions et Purchase Terms partenaires.',
    color:'bg-rose-50 text-rose-600',
    adminOnly:true,
  },
  {
    href:'/parametres/activite',
    icon:ClipboardList, title:'Journal d\'activité',
    desc:'Historique de toutes les actions effectuées dans le CRM.',
    color:'bg-purple-50 text-purple-600',
    adminOnly:true,
  },
]

export default async function ParametresPage() {
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users_profiles').select('id, role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
            <Shield className="w-5 h-5 text-gold-400" />
          </div>
          <h1 className="text-2xl font-semibold text-navy-900">Paramètres</h1>
        </div>
        <p className="text-sm text-gray-400 ml-13">Administration IME CRM — Accès administrateur uniquement</p>
      </div>

      <div className="grid gap-4">
        {SETTINGS_SECTIONS.map(s => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href}
              className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-gray-300
                         transition-all duration-150 group">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-navy-900 group-hover:text-gold-600 transition-colors">
                  {s.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{s.desc}</div>
              </div>
              <div className="text-gray-200 group-hover:text-gray-400 transition-colors">→</div>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-navy-900/5 rounded-xl border border-navy-900/10">
        <div className="flex items-center gap-2 text-sm font-medium text-navy-900 mb-1">
          <Shield className="w-4 h-4 text-gold-500" />
          Sécurité RLS active
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Toutes les tables sont protégées par Row Level Security Supabase.
          Les commerciaux ne voient jamais les prix d'achat, marges ou données d'autres utilisateurs.
        </p>
      </div>
    </div>
  )
}
