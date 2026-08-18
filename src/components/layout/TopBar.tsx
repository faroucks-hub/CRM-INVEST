'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogOut, User, ChevronDown, CheckSquare, Calculator, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import type { UserProfile } from '@/types'
import { ROLE_LABELS } from '@/types'
import NotificationBell from '@/components/notifications/NotificationBell'

interface TopBarProps { user: UserProfile }

export default function TopBar({ user }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center
                       justify-between px-2.5 sm:px-6 flex-shrink-0">
      {/* Left */}
      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
        <button type="button" onClick={() => window.dispatchEvent(new Event('open-mobile-sidebar'))} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50 lg:hidden" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
        <div className="min-w-0 flex flex-col leading-tight">
        <div className="truncate text-xs font-semibold text-navy-900 tracking-wide sm:text-sm">
          IM ÉNERGIE CRM
        </div>
        <div className="hidden text-[11px] text-gray-400 sm:block">
          Business Management System
        </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-2">

        <Link
          href="/taches"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-navy-900"
          aria-label="Ouvrir les tâches"
          title="Tâches"
        >
          <CheckSquare className="h-5 w-5" />
        </Link>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('open-global-calculator'))}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gold-400/10 hover:text-gold-700"
          aria-label="Ouvrir le centre de calcul"
          title="Centre de calcul (Ctrl/⌘ + Maj + C)"
        >
          <Calculator className="h-5 w-5" />
        </button>

        {/* Notification Bell — real-time */}
        <NotificationBell userId={user.id} />

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(p => !p)}
            className={cn(
              'flex items-center gap-2.5 pl-2 pr-2.5 py-1.5 rounded-lg',
              'hover:bg-gray-50 transition-colors duration-150',
              menuOpen && 'bg-gray-50'
            )}
          >
            <div className="w-7 h-7 rounded-full bg-navy-900 flex items-center
                           justify-center flex-shrink-0">
              <span className="text-gold-400 text-xs font-semibold">
                {getInitials(user.full_name)}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-900 leading-tight">{user.full_name}</div>
              <div className="text-xs text-gray-400 leading-tight">{ROLE_LABELS[user.role]}</div>
            </div>
            <ChevronDown className={cn(
              'hidden sm:block w-3.5 h-3.5 text-gray-400 transition-transform duration-150',
              menuOpen && 'rotate-180'
            )} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white
                             rounded-lg border border-gray-100 shadow-lg z-20
                             animate-fade-up overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50">
                  <div className="text-sm font-medium text-gray-900 truncate">{user.full_name}</div>
                  <div className="text-xs text-gray-400 truncate">{user.email}</div>
                  <div className="mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded
                                    text-xs bg-navy-900/5 text-navy-900 font-medium">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </div>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { router.push('/parametres/profil'); setMenuOpen(false) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md
                               text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-400" />
                    Mon profil
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-md
                               text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
