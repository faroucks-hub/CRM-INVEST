'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, Building2, TrendingUp, FolderKanban,
  CreditCard, FileText, Receipt, Settings, Zap,
  Sparkles, HelpCircle, ClipboardList, BarChart3, ShoppingCart, Scale, Activity, ChevronDown, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import {
  Globe
} from 'lucide-react'

interface NavItem {
  href:    string
  label:   string
  icon:    React.ElementType
  roles:   UserRole[]
  badge?:  string
  section: string
}

const NAV_ITEMS: NavItem[] = [
  // ── Principal
  { href:'/dashboard',    label:'Dashboard',          icon:LayoutDashboard, roles:['admin','lead_team','commercial'], section:'accueil' },
  // ── Commercial
  { label: 'Website Leads', href: '/website-leads', icon: Globe, section: 'commercial',
    roles: ['admin', 'lead_team', 'commercial'] },
  { href:'/quotations',   label:'Quotations',           icon:FileText,        roles:['admin','lead_team','commercial'], section:'commercial' },
  { href:'/clients',      label:'Clients & Prospects', icon:Users,           roles:['admin','lead_team','commercial'], section:'commercial' },
  { href:'/opportunites', label:'Opportunités',         icon:TrendingUp,      roles:['admin','lead_team','commercial'], section:'commercial' },
  { label: 'Corbeille Leads',
    href: '/website-leads/trash',
    icon: ClipboardList,
    section: 'commercial',
    roles: ['admin', 'lead_team']
  },
  // ── Opérations
  { href:'/proformas',    label:'Proformas',            icon:Receipt,         roles:['admin','lead_team'],              section:'operations' },
  { href:'/projets',      label:'Projets',              icon:FolderKanban,    roles:['admin','lead_team','commercial'], section:'operations' },
  { href:'/paiements',    label:'Paiements',            icon:CreditCard,      roles:['admin','lead_team','commercial'], section:'operations' },
  { href:'/documents',    label:'Documents',            icon:Zap,             roles:['admin','lead_team','commercial'], section:'operations' },
  // ── Partenaires
  { href:'/partenaires',   label:'Partenaires',         icon:Building2,       roles:['admin','lead_team'],              section:'partenaires' },
  { href:'/achats',         label:'Achats & Commandes',  icon:ShoppingCart,    roles:['admin','lead_team'],              section:'partenaires' },
  { href:'/controle-affaires', label:'Contrôle d’affaires', icon:Scale, roles:['admin','lead_team'], section:'pilotage' },
  // ── Pilotage
  { href:'/consolidation', label:'Consolidation affaires', icon:Activity, roles:['admin','lead_team','commercial'], section:'pilotage' },
  { href:'/rapports',     label:'Rapports & Performance', icon:BarChart3,     roles:['admin','lead_team','commercial'], section:'pilotage' },
  // ── Lydie AI
  { href:'/lydie',        label:'Lydie AI',             icon:Sparkles,        roles:['admin','lead_team','commercial'], section:'outils' },
  { href:'/aide',         label:"Guide d'utilisation", icon:HelpCircle,      roles:['admin','lead_team','commercial'], section:'assistance' },
  // ── Admin
  { href:'/parametres',        label:'Paramètres',              icon:Settings,       roles:['admin'], section:'admin' },
  { href:'/parametres/utilisateurs', label:'Utilisateurs',           icon:Users,          roles:['admin'], section:'admin' },
  { href:'/parametres/activite',     label:'Journal d\'activité',    icon:ClipboardList,  roles:['admin'], section:'admin' },
]

const SECTION_LABELS: Record<string, string> = {
  accueil:     'Accueil',
  commercial:  'Développement commercial',
  operations:  'Exécution',
  partenaires: 'Achats & partenaires',
  pilotage:    'Pilotage',
  outils:      'Outils',
  assistance: 'Assistance',
  admin:       'Administration',
}

interface SidebarProps { role: UserRole }

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visible = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role))

  const sections = visible.reduce<Record<string, NavItem[]>>((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {})
  const activeSection = visible.find(item => item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname.startsWith(item.href))?.section
  const [closedSections, setClosedSections] = useState<Record<string, boolean>>({})

  useEffect(() => {
    function openMobileSidebar() { setMobileOpen(true) }
    window.addEventListener('open-mobile-sidebar', openMobileSidebar)
    return () => window.removeEventListener('open-mobile-sidebar', openMobileSidebar)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Fermer le menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[60] bg-navy-950/45 backdrop-blur-sm lg:hidden" />}
    <aside className={cn(
      'fixed inset-y-0 left-0 z-[70] flex h-dvh w-[min(18rem,calc(100vw-2.5rem))] flex-shrink-0 flex-col bg-navy-900 transition-transform duration-200',
      mobileOpen ? 'translate-x-0' : '-translate-x-full',
      'lg:static lg:h-full lg:w-56 lg:translate-x-0'
    )}>

      {/* Logo */}
<div className="relative px-4 py-5 border-b border-white/5">
  <div className="flex items-center gap-3">
    <Image
      src="/images/logo-ime.png"
      alt="IM ÉNERGIE"
      width={160}
      height={64}
      className="h-10 w-auto object-contain"
    />

    <div>
      <div className="text-white font-semibold text-sm tracking-wide">
        IM ÉNERGIE CRM
      </div>

      <div className="text-white/40 text-[9px] uppercase tracking-widest">
        Business Management
      </div>
    </div>
  </div>
  <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-2 top-2 rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Fermer le menu"><X className="h-5 w-5" /></button>
</div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <button
              type="button"
              onClick={() => setClosedSections(current => ({ ...current, [section]: !current[section] }))}
              className="w-full px-2 mb-1.5 flex items-center justify-between text-left text-2xs font-semibold uppercase tracking-widest text-white/25 hover:text-white/50"
              aria-expanded={!closedSections[section] || activeSection === section}
            >
              <span>{SECTION_LABELS[section]}</span>
              <ChevronDown className={cn('h-3 w-3 transition-transform', closedSections[section] && activeSection !== section && '-rotate-90')} />
            </button>
            <ul className={cn('space-y-0.5', closedSections[section] && activeSection !== section && 'hidden')}>
              {items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href)
                const Icon = item.icon
                const isLydie = item.href === '/lydie'

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm',
                        'transition-all duration-150 group relative',
                        isActive
                          ? isLydie
                            ? 'bg-gold-400/15 text-gold-400'
                            : 'bg-gold-400/10 text-gold-400'
                          : 'text-white/45 hover:text-white/80 hover:bg-white/5'
                      )}
                    >
                      {isActive && (
                        <span className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-full',
                          isLydie ? 'bg-gold-400' : 'bg-gold-400'
                        )} />
                      )}
                      <Icon className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive
                          ? 'text-gold-400'
                          : isLydie
                            ? 'text-gold-400/40 group-hover:text-gold-400/70'
                            : 'text-white/35 group-hover:text-white/60'
                      )} />
                      <span className="flex-1 leading-none">{item.label}</span>
                      {isLydie && !isActive && (
                        <span className="text-2xs bg-gold-400/15 text-gold-400/80
                                        px-1.5 py-0.5 rounded-full font-medium">
                          IA
                        </span>
                      )}
                      {item.badge && (
                        <span className="text-2xs bg-gold-400/20 text-gold-400
                                        px-1.5 py-0.5 rounded-full font-medium">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Lydie AI mini teaser (bas de sidebar, caché si déjà actif) */}
      <div className="px-3 pb-4">
        <div className="rounded-xl bg-gradient-to-br from-gold-400/10 to-gold-400/5
                       border border-gold-400/15 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-gold-400" />
            <span className="text-xs font-semibold text-gold-400">Lydie AI</span>
            <div className="ml-auto w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          </div>
          <p className="text-2xs text-white/25 leading-relaxed">
            Votre assistante intelligente pour la gestion
            des projets, documents et opérations IM ÉNERGIE.
          </p>
        </div>
      </div>

    </aside>
    </>
  )
}
