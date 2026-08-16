'use client'

import { useState, useRef, useEffect } from 'react'
import {
  X,
  Send,
  Minimize2,
  Maximize2,
  Sparkles,
  Copy,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LYDIE_SUGGESTIONS,
  LYDIE_STARTERS,
  detectContextType,
} from '@/lib/lydie/context'
import type { ContextType } from '@/lib/lydie/context'
import type { UserRole } from '@/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  context_type?: ContextType
  timestamp: Date
  loading?: boolean
}

interface Props {
  user: {
    id: string
    full_name: string
    role: UserRole
  }
}

const CTX_COLORS: Record<ContextType, string> = {
  commercial: 'bg-blue-100 text-blue-700',
  technique: 'bg-amber-100 text-amber-700',
  projet: 'bg-purple-100 text-purple-700',
  dashboard: 'bg-teal-100 text-teal-700',
  general: 'bg-gray-100 text-gray-600',
}

const CTX_LABELS: Record<ContextType, string> = {
  commercial: 'Commercial',
  technique: 'Technique',
  projet: 'Projets',
  dashboard: 'Dashboard',
  general: 'Général',
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /`(.*?)`/g,
      '<code class="bg-white/20 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
    )
    .replace(/\n/g, '<br/>')
}

export default function LydieChat({ user }: Props) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => crypto.randomUUID())
  const [notif, setNotif] = useState(true)

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  })

  const dragging = useRef(false)
  const moved = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hasOpened = useRef(false)

  useEffect(() => {
    const saved = localStorage.getItem('lydie-position')

    if (saved) {
      setPosition(JSON.parse(saved))
    } else {
      setPosition({
        x: window.innerWidth - 90,
        y: window.innerHeight - 90,
      })
    }
  }, [])

  useEffect(() => {
    if (open && !hasOpened.current) {
      hasOpened.current = true
      setNotif(false)

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: LYDIE_STARTERS.join('\n'),
          timestamp: new Date(),
        },
      ])
    }

    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setOpen((p) => !p)
      }

      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    dragging.current = true
    moved.current = false

    offset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    }
  }

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!dragging.current) return

      moved.current = true

      const buttonSize = 56
      const margin = 12

      const nextX = Math.min(
        Math.max(e.clientX - offset.current.x, margin),
        window.innerWidth - buttonSize - margin
      )

      const nextY = Math.min(
        Math.max(e.clientY - offset.current.y, margin),
        window.innerHeight - buttonSize - margin
      )

      setPosition({
        x: nextX,
        y: nextY,
      })
    }

    function handleMouseUp() {
      if (!dragging.current) return

      dragging.current = false

      localStorage.setItem('lydie-position', JSON.stringify(position))
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [position])

  const uid = () => Math.random().toString(36).slice(2)

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading) return

    setInput('')

    const userMsg: Message = {
      id: uid(),
      role: 'user',
      content,
      timestamp: new Date(),
      context_type: detectContextType(content),
    }

    const loadingMsg: Message = {
      id: uid() + '-loading',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      loading: true,
    }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setLoading(true)

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const resp = await fetch('/api/lydie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages, session_id: sessionId }),
      })

      const data = await resp.json()

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading)

        return [
          ...withoutLoading,
          {
            id: uid(),
            role: 'assistant',
            content: data.error
              ? `❌ ${data.error}`
              : data.message ?? "Désolée, je n'ai pas pu répondre.",
            context_type: data.context_type,
            timestamp: new Date(),
          },
        ]
      })
    } catch {
      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.loading)

        return [
          ...withoutLoading,
          {
            id: uid(),
            role: 'assistant',
            content: '❌ Erreur de connexion. Vérifiez votre connexion internet.',
            timestamp: new Date(),
          },
        ]
      })
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content)
  }

  function clearConversation() {
    setMessages([])
    hasOpened.current = false
    setOpen(false)
    setTimeout(() => setOpen(true), 50)
  }

  const suggestions =
    LYDIE_SUGGESTIONS[user.role] ?? LYDIE_SUGGESTIONS.commercial

  const panelClass = expanded
    ? 'fixed inset-4 sm:inset-8 z-[60]'
    : 'fixed bottom-4 right-4 w-[420px] max-h-[520px] z-[60]'

  return (
    <>
      {!open && (
        <button
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (moved.current) return
            setOpen(true)
          }}
          aria-label="Ouvrir Lydie AI"
          style={{
            left: position.x,
            top: position.y,
          }}
          className={cn(
            'fixed z-50',
            'w-14 h-14 rounded-2xl',
            'bg-gradient-to-br from-navy-900 to-navy-800',
            'border border-gold-400/30',
            'shadow-xl shadow-navy-900/30',
            'flex items-center justify-center',
            'transition-all duration-200 hover:scale-105 active:scale-95',
            'cursor-move group'
          )}
        >
          <div className="absolute inset-0 rounded-2xl border border-gold-400/20 animate-ping opacity-0 group-hover:opacity-100" />

          <Sparkles className="w-6 h-6 text-gold-400" />

          {notif && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gold-400 rounded-full flex items-center justify-center border-2 border-white">
              <div className="w-1.5 h-1.5 bg-navy-900 rounded-full" />
            </div>
          )}

          <div
            className={cn(
              'absolute bottom-full right-0 mb-2',
              'bg-navy-900 text-white text-xs font-medium px-3 py-1.5 rounded-xl',
              'border border-white/10 shadow-lg whitespace-nowrap',
              'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none'
            )}
          >
            Lydie AI
            <span className="ml-2 opacity-40 text-2xs">⌘L</span>
          </div>
        </button>
      )}

      {open && (
        <>
{!expanded && (
  <div
    className="fixed inset-0 z-[55]"
    onClick={() => setOpen(false)}
  />
)}
          {expanded && (
            <div
              className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />
          )}

          <div
            className={cn(
              panelClass,
              'flex flex-col bg-white rounded-2xl overflow-hidden',
              'border border-gray-200/80',
              'shadow-2xl shadow-navy-900/20',
              'animate-fade-up'
            )}
          >
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-navy-900 to-navy-800 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-300 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-4.5 h-4.5 text-navy-900" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Lydie AI
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-2xs text-white/40">En ligne</span>
                  </div>
                </div>

                <span className="text-2xs text-white/35">
                  Assistante executive · IME
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={clearConversation}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors"
                  title="Nouvelle conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setExpanded((p) => !p)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors"
                  title={expanded ? 'Réduire' : 'Agrandir'}
                >
                  {expanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/80 hover:bg-white/10 transition-colors"
                  title="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-surface-100/40 min-h-0">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-3 group',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-gold-400 to-gold-300 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-navy-900" />
                    </div>
                  )}

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-xl bg-navy-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-2xs text-gold-400 font-bold">
                        {user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      'flex flex-col max-w-[82%]',
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    )}
                  >
                    {msg.context_type && msg.role === 'assistant' && (
                      <span
                        className={cn(
                          'text-2xs px-2 py-0.5 rounded-full font-medium mb-1',
                          CTX_COLORS[msg.context_type]
                        )}
                      >
                        {CTX_LABELS[msg.context_type]}
                      </span>
                    )}

                    {msg.loading ? (
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 bg-gold-400 rounded-full animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'px-4 py-3 shadow-sm',
                          msg.role === 'assistant'
                            ? 'bg-white rounded-2xl rounded-tl-sm border border-gray-100 text-gray-800'
                            : 'bg-navy-900 rounded-2xl rounded-tr-sm text-white'
                        )}
                      >
                        {msg.role === 'assistant' ? (
                          <div
                            className="text-sm leading-relaxed prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: renderMarkdown(msg.content),
                            }}
                          />
                        ) : (
                          <p className="text-sm leading-relaxed">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity',
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      <span className="text-2xs text-gray-400">
                        {msg.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {!msg.loading && msg.role === 'assistant' && (
                        <button
                          onClick={() => copyMessage(msg.content)}
                          className="text-2xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5 transition-colors"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          Copier
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>

            {messages.length <= 1 && (
              <div className="flex-shrink-0 px-4 pb-2 grid grid-cols-2 gap-1.5">
                {suggestions.map(([icon, text]) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className={cn(
                      'text-left text-xs px-3 py-2 rounded-xl',
                      'bg-white border border-gray-200 hover:border-navy-900/30',
                      'hover:bg-gray-50 transition-all duration-150',
                      'text-gray-600 hover:text-navy-900'
                    )}
                  >
                    <span className="mr-1">{icon}</span>
                    {text}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-shrink-0 px-4 pb-4">
              <div
                className={cn(
                  'flex items-end gap-2 bg-white rounded-2xl',
                  'border border-gray-200 focus-within:border-navy-900/30',
                  'focus-within:shadow-sm transition-all duration-150',
                  'px-3 py-2.5'
                )}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={handleKey}
                  placeholder="Demandez quelque chose à Lydie..."
                  rows={1}
                  disabled={loading}
                  className={cn(
                    'flex-1 text-sm text-gray-900 placeholder-gray-400',
                    'bg-transparent border-none outline-none resize-none',
                    'leading-relaxed min-h-[22px] max-h-[120px]',
                    'disabled:opacity-50'
                  )}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center',
                    'transition-all duration-150 active:scale-95',
                    input.trim() && !loading
                      ? 'bg-navy-900 text-gold-400 hover:bg-navy-800 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-center text-2xs text-gray-400 mt-2">
                Lydie AI · IME · ⌘L pour ouvrir/fermer
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}