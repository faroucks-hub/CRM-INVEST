'use client'

import { useState, useMemo } from 'react'
import { Sparkles, MessageSquare, Clock, Trash2, Search, BarChart3, Settings, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Conversation {
  id:           string
  role:         string
  message:      string
  response?:    string | null
  context_type: string
  created_at:   string
  session_id?:  string | null
  tokens_used?: number | null
}

interface UsageStat {
  user_id:           string
  full_name:         string
  role:              string
  messages_sent:     number
  sessions:          number
  commercial_queries:number
  technique_queries: number
  projet_queries:    number
  last_used_at:      string | null
}

interface Props {
  profile:       { id: string; full_name: string; role: string }
  conversations: Conversation[]
  usageStats:    UsageStat[]
  totalTokens:   number
  isAdminOrLead: boolean
  isAdmin:       boolean
}

const CTX_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  commercial: { label: 'Commercial', color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: '💼' },
  technique:  { label: 'Technique',  color: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⚡' },
  projet:     { label: 'Projets',    color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '📋' },
  dashboard:  { label: 'Dashboard',  color: 'bg-teal-50 text-teal-700 border-teal-200',   icon: '📊' },
  general:    { label: 'Général',    color: 'bg-gray-50 text-gray-600 border-gray-200',   icon: '💬' },
}

export default function LydiePageClient({
  profile, conversations, usageStats, totalTokens, isAdminOrLead, isAdmin
}: Props) {
  const router = useRouter()
  const [search,     setSearch]     = useState('')
  const [filterCtx,  setFilterCtx]  = useState('')
  const [tab,        setTab]        = useState<'history' | 'stats' | 'config'>('history')
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [deleting,   setDeleting]   = useState(false)

  // Groupe les conversations par session
  const sessions = useMemo(() => {
    const userMsgs = conversations.filter(c => c.role === 'user')

    const filtered = userMsgs.filter(c => {
      if (filterCtx && c.context_type !== filterCtx) return false
      if (search) {
        const q = search.toLowerCase()
        return c.message.toLowerCase().includes(q) ||
          (c.response ?? '').toLowerCase().includes(q)
      }
      return true
    })

    return filtered
  }, [conversations, search, filterCtx])

  // Stats personnelles
  const stats = useMemo(() => {
    const msgs = conversations.filter(c => c.role === 'user')
    return {
      total:   msgs.length,
      comm:    msgs.filter(c => c.context_type === 'commercial').length,
      tech:    msgs.filter(c => c.context_type === 'technique').length,
      projet:  msgs.filter(c => c.context_type === 'projet').length,
      dash:    msgs.filter(c => c.context_type === 'dashboard').length,
    }
  }, [conversations])

  async function deleteConversation(id: string) {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)
    setDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success('Message supprimé')
    router.refresh()
  }

  async function clearAllHistory() {
    if (!confirm('Effacer tout votre historique Lydie AI ?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase
      .from('ai_conversations')
      .delete()
      .eq('user_id', profile.id)
    setDeleting(false)
    toast.success('Historique effacé')
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800
                       border border-gold-400/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-7 h-7 text-gold-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">Lydie AI</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Assistante executive intelligente · Invest Mentor Énergie
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">Disponible</span>
            <span className="text-gray-300 mx-1">·</span>
            <span className="text-xs text-gray-400">Propulsée par GPT-4o-mini</span>
          </div>
        </div>
        <div className="ml-auto">
          <div className="text-right">
            <div className="text-xs text-gray-400">Tokens utilisés</div>
            <div className="text-xl font-semibold text-navy-900">
              {totalTokens.toLocaleString('fr-FR')}
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI personnelles ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Messages total',  value: stats.total,  icon: '💬', color: 'text-navy-900' },
          { label: 'Commercial',      value: stats.comm,   icon: '💼', color: 'text-blue-700' },
          { label: 'Technique',       value: stats.tech,   icon: '⚡', color: 'text-amber-700' },
          { label: 'Projets',         value: stats.projet, icon: '📋', color: 'text-purple-700' },
          { label: 'Dashboard',       value: stats.dash,   icon: '📊', color: 'text-teal-700' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-xl mb-1">{icon}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-2xs text-gray-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200 gap-1">
        {([
          { id:'history', label:'Historique',    icon: Clock },
          ...(isAdminOrLead ? [{ id:'stats', label:'Statistiques équipe', icon: BarChart3 }] : []),
          { id:'config',  label:'Configuration', icon: Settings },
        ] as { id: string; label: string; icon: React.ElementType }[]).map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium',
                'border-b-2 transition-colors',
                tab === t.id
                  ? 'border-navy-900 text-navy-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── TAB: Historique ────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-4">
          {/* Filtres */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher dans vos conversations..."
                className="input pl-9 h-9 text-sm"
              />
            </div>
            <select className="input w-auto text-sm h-9" value={filterCtx} onChange={e => setFilterCtx(e.target.value)}>
              <option value="">Tous les contextes</option>
              {Object.entries(CTX_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.icon} {c.label}</option>
              ))}
            </select>
            {(search || filterCtx) && (
              <button onClick={() => { setSearch(''); setFilterCtx('') }}
                className="text-xs text-gray-400 hover:text-gray-700">
                × Effacer
              </button>
            )}
            {conversations.length > 0 && (
              <button onClick={clearAllHistory} disabled={deleting}
                className="ml-auto text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                <Trash2 className="w-3 h-3" />
                Effacer l'historique
              </button>
            )}
          </div>

          {/* Messages */}
          {sessions.length === 0 ? (
            <div className="card p-16 text-center">
              <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <div className="text-sm font-medium text-gray-400">Aucune conversation</div>
              <div className="text-xs text-gray-300 mt-1 mb-4">
                Utilisez le bouton Lydie AI en bas à droite pour commencer
              </div>
              <button
                onClick={() => {
                  const btn = document.querySelector('[aria-label="Ouvrir Lydie AI"]') as HTMLButtonElement
                  btn?.click()
                }}
                className="btn btn-primary btn-sm mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5" /> Démarrer une conversation
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(msg => {
                const ctx    = CTX_CONFIG[msg.context_type] ?? CTX_CONFIG.general
                const isExp  = expanded === msg.id
                const reply  = conversations.find(c =>
                  c.role === 'assistant' && c.session_id === msg.session_id &&
                  new Date(c.created_at) > new Date(msg.created_at)
                )

                return (
                  <div key={msg.id}
                    className="card overflow-hidden hover:border-gray-300 transition-all">
                    {/* User message */}
                    <div
                      className="flex items-start gap-3 px-5 py-4 cursor-pointer"
                      onClick={() => setExpanded(isExp ? null : msg.id)}
                    >
                      <div className={`flex-shrink-0 text-sm px-2 py-1 rounded-lg border text-xs font-medium ${ctx.color}`}>
                        {ctx.icon} {ctx.label}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium leading-relaxed truncate">
                          {msg.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); deleteConversation(msg.id) }}
                          disabled={deleting}
                          className="opacity-0 group-hover:opacity-100 text-gray-300
                                     hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExp
                          ? <ChevronUp className="w-4 h-4 text-gray-400" />
                          : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>

                    {/* AI reply — expandable */}
                    {isExp && reply && (
                      <div className="border-t border-gray-100 bg-surface-100/60 px-5 py-4 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
                          <span className="text-xs font-semibold text-gold-700">Lydie AI</span>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {reply.message}
                        </div>
                        {reply.tokens_used && (
                          <div className="text-2xs text-gray-300 mt-2 text-right">
                            {reply.tokens_used} tokens
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Stats équipe (admin/lead) ──────────────────────── */}
      {tab === 'stats' && isAdminOrLead && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="text-sm font-medium text-navy-900">Utilisation Lydie AI par utilisateur</h2>
            </div>
            {usageStats.filter(s => Number(s.messages_sent) > 0).length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">
                Aucune statistique disponible — Lydie AI n'a pas encore été utilisée.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Messages</th>
                    <th>Sessions</th>
                    <th>Commercial</th>
                    <th>Technique</th>
                    <th>Projets</th>
                    <th>Dernière utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {usageStats
                    .filter(s => Number(s.messages_sent) > 0)
                    .sort((a, b) => Number(b.messages_sent) - Number(a.messages_sent))
                    .map(s => (
                      <tr key={s.user_id}>
                        <td className="font-medium text-gray-900">{s.full_name}</td>
                        <td>
                          <span className="text-xs px-2 py-0.5 bg-navy-900/5 text-navy-900 rounded-full">
                            {s.role === 'admin' ? 'Admin' : s.role === 'lead_team' ? 'Lead Team' : 'Commercial'}
                          </span>
                        </td>
                        <td className="font-semibold text-navy-900">{s.messages_sent}</td>
                        <td className="text-gray-500">{s.sessions}</td>
                        <td>{s.commercial_queries}</td>
                        <td>{s.technique_queries}</td>
                        <td>{s.projet_queries}</td>
                        <td className="text-xs text-gray-400">
                          {s.last_used_at ? formatDateTime(s.last_used_at) : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Configuration ──────────────────────────────────── */}
      {tab === 'config' && (
        <div className="space-y-4">

          {/* Status */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">Statut du service</h3>
            <div className="space-y-3">
              {[
                {
                  label: 'API OpenAI',
                  status: 'configured',
                  hint: 'Variable OPENAI_API_KEY requise dans Vercel / .env.local',
                },
                {
                  label: 'Modèle',
                  status: 'active',
                  hint: 'GPT-4o-mini · Optimisé vitesse et coût',
                },
                {
                  label: 'Contexte CRM',
                  status: 'active',
                  hint: 'Données clients, projets, quotations et calculs injectés automatiquement',
                },
                {
                  label: 'Sécurité rôles',
                  status: 'active',
                  hint: 'Filtrage automatique selon le rôle utilisateur (commercial / lead / admin)',
                },
              ].map(({ label, status, hint }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={cn(
                    'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                    status === 'active' ? 'bg-green-400' :
                    status === 'configured' ? 'bg-amber-400' : 'bg-gray-300'
                  )} />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions configuration */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">
              Configuration OPENAI_API_KEY
            </h3>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-800 mb-2">1. Obtenir une clé API OpenAI</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Créez un compte sur{' '}
                  <a href="https://platform.openai.com" target="_blank" rel="noopener"
                    className="text-navy-900 underline hover:text-gold-600">
                    platform.openai.com
                  </a>
                  {' '}→ API Keys → Create new secret key
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-2">2. En développement local</p>
                <div className="bg-navy-900 text-green-400 font-mono text-xs rounded-lg p-3">
                  <div className="text-gray-500 mb-1"># .env.local</div>
                  <div>OPENAI_API_KEY=sk-proj-...</div>
                </div>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-2">3. Sur Vercel (production)</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  Vercel Dashboard → Settings → Environment Variables → Ajouter{' '}
                  <code className="bg-gray-100 px-1 rounded">OPENAI_API_KEY</code>
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-800 mb-2">4. Budget recommandé</p>
                <p className="text-gray-500 text-xs leading-relaxed">
                  GPT-4o-mini est très économique : ~0.15 $/M tokens input.
                  Pour une équipe de 5 personnes utilisant Lydie quotidiennement, comptez ~$5/mois.
                </p>
              </div>
            </div>
          </div>

          {/* Capacités */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold text-navy-900 mb-4">Capacités Lydie AI V1</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon:'💼', title:'Commercial', items:['Rédaction emails professionnels','Relances clients','Résumé opportunités','Suivi pipeline'] },
                { icon:'⚡', title:'Technique',  items:['Interprétation calculs UPS','Explication dimensionnement','Recommandations batteries','Résumé BESS'] },
                { icon:'📋', title:'Projets',    items:['Résumé projets actifs','Alertes retards','Deadlines imminentes','Paiements en attente'] },
                { icon:'📊', title:'Dashboard',  items:['Analyse performances','Résumé pipeline','Classement commerciaux','Insights clés'] },
              ].map(({ icon, title, items }) => (
                <div key={title} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-semibold text-navy-900">{title}</span>
                  </div>
                  <ul className="space-y-1">
                    {items.map(item => (
                      <li key={item} className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1 h-1 bg-gold-400 rounded-full flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Prochaines versions (V2) : WhatsApp AI, Voice AI, Agents autonomes,
              génération automatique de quotations, analyse concurrentielle.
            </p>
          </div>

        </div>
      )}

    </div>
  )
}
