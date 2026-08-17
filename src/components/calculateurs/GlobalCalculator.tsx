'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import {
  ArrowLeft, BatteryCharging, Calculator, Gauge, History,
  ExternalLink, Minimize2, RotateCcw, Scaling, Sun, X, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const UpsCalculator = dynamic(() => import('./UpsCalculator'))
const BatteryCalculator = dynamic(() => import('./BatteryCalculator'))
const RectifierCalculator = dynamic(() => import('./RectifierCalculator'))
const InverterCalculator = dynamic(() => import('./InverterCalculator'))
const BessCalculator = dynamic(() => import('./BessCalculator'))
const FrequencyConverterCalculator = dynamic(() => import('./FrequencyConverterCalculator'))

type Tool = 'simple' | 'ups' | 'battery' | 'rectifier' | 'inverter' | 'bess' | 'frequency'
type CompactView = 'inputs' | 'results'

const EMPTY_RELATIONS = { clients: [], projects: [], quotations: [] }

const TOOL_ROUTES: Partial<Record<Tool, string>> = {
  ups: '/calculateurs/ups', battery: '/calculateurs/battery',
  rectifier: '/calculateurs/rectifier', inverter: '/calculateurs/inverter',
  bess: '/calculateurs/bess', frequency: '/calculateurs/frequency-converter',
}

const TOOLS: { id: Tool; label: string; description: string; icon: React.ElementType }[] = [
  { id: 'simple', label: 'Calculatrice simple', description: 'Calculs rapides sans quitter votre page', icon: Calculator },
  { id: 'ups', label: 'UPS', description: 'Puissance, autonomie et batteries', icon: Zap },
  { id: 'battery', label: 'Batteries', description: 'Banc, capacité et configuration', icon: BatteryCharging },
  { id: 'rectifier', label: 'Redresseur', description: 'Courants et puissance AC/DC', icon: Gauge },
  { id: 'inverter', label: 'Onduleur', description: 'Conversion DC/AC et autonomie', icon: History },
  { id: 'bess', label: 'BESS', description: 'Stockage, PCS et durée de vie', icon: Sun },
  { id: 'frequency', label: 'Convertisseur de fréquence', description: 'Puissance et conversion de fréquence', icon: RotateCcw },
]

function SimpleCalculator() {
  const [display, setDisplay] = useState('0')
  const [stored, setStored] = useState<number | null>(null)
  const [operator, setOperator] = useState<string | null>(null)
  const [replace, setReplace] = useState(true)

  function inputDigit(value: string) {
    setDisplay(current => replace || current === '0' ? value : current + value)
    setReplace(false)
  }

  function inputDecimal() {
    if (replace) { setDisplay('0.'); setReplace(false); return }
    if (!display.includes('.')) setDisplay(current => current + '.')
  }

  function calculate(left: number, right: number, operation: string) {
    if (operation === '+') return left + right
    if (operation === '−') return left - right
    if (operation === '×') return left * right
    if (operation === '÷') return right === 0 ? NaN : left / right
    return right
  }

  function chooseOperator(next: string) {
    const current = Number(display)
    if (stored !== null && operator && !replace) {
      const result = calculate(stored, current, operator)
      setDisplay(Number.isFinite(result) ? String(result) : 'Erreur')
      setStored(result)
    } else {
      setStored(current)
    }
    setOperator(next)
    setReplace(true)
  }

  function equals() {
    if (stored === null || !operator) return
    const result = calculate(stored, Number(display), operator)
    setDisplay(Number.isFinite(result) ? String(Number(result.toPrecision(12))) : 'Erreur')
    setStored(null)
    setOperator(null)
    setReplace(true)
  }

  function clear() {
    setDisplay('0'); setStored(null); setOperator(null); setReplace(true)
  }

  const keys = ['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+']

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 rounded-xl bg-navy-900 px-4 py-5 text-right">
        <div className="h-5 text-xs text-white/40">{stored !== null ? `${stored} ${operator ?? ''}` : 'Calcul rapide'}</div>
        <div className="mt-1 overflow-hidden text-ellipsis text-3xl font-semibold text-white">{display}</div>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={clear} className="rounded-lg bg-gray-100 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-200">Effacer</button>
        <button type="button" onClick={() => navigator.clipboard.writeText(display)} className="rounded-lg bg-gold-400/15 py-3 text-sm font-semibold text-gold-700 hover:bg-gold-400/25">Copier</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {keys.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => key === '.' ? inputDecimal() : key === '=' ? equals() : ['+','−','×','÷'].includes(key) ? chooseOperator(key) : inputDigit(key)}
            className={cn(
              'rounded-lg py-4 text-base font-semibold transition-colors',
              key === '=' ? 'bg-gold-400 text-navy-900 hover:bg-gold-500' :
              ['+','−','×','÷'].includes(key) ? 'bg-navy-900 text-white hover:bg-navy-800' : 'bg-gray-50 text-gray-800 hover:bg-gray-100'
            )}
          >{key}</button>
        ))}
      </div>
    </div>
  )
}

export default function GlobalCalculator() {
  const [open, setOpen] = useState(false)
  const [tool, setTool] = useState<Tool | null>(null)
  const [view, setView] = useState<CompactView>('inputs')
  const [panelWidth, setPanelWidth] = useState(400)
  const [panelHeight, setPanelHeight] = useState(560)

  useEffect(() => {
    function openCalculator() { setOpen(true) }
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        setOpen(current => !current)
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('open-global-calculator', openCalculator)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('open-global-calculator', openCalculator)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const selected = TOOLS.find(item => item.id === tool)
  const technicalTool = tool && tool !== 'simple'

  function selectTool(nextTool: Tool) {
    setTool(nextTool)
    setView('inputs')
  }

  function startResize(axis: 'width' | 'height' | 'both', event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const startWidth = panelWidth
    const startHeight = panelHeight
    document.body.style.userSelect = 'none'

    function handleMove(moveEvent: PointerEvent) {
      if (axis === 'width' || axis === 'both')
        setPanelWidth(Math.min(900, Math.max(340, startWidth + startX - moveEvent.clientX)))
      if (axis === 'height' || axis === 'both')
        setPanelHeight(Math.min(window.innerHeight - 32, Math.max(420, startHeight + startY - moveEvent.clientY)))
    }

    function handleUp() {
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <>
      {open && (
        <div className="pointer-events-none fixed inset-0 z-[70] p-2 sm:p-4">
          <section
            className="global-calculator-panel pointer-events-auto absolute bottom-2 right-2 flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-surface-100 shadow-2xl animate-fade-up sm:bottom-4 sm:right-4"
            style={{ '--calculator-width': `${panelWidth}px`, '--calculator-height': `${panelHeight}px` } as CSSProperties}
          >
            <button type="button" onPointerDown={event => startResize('both', event)} className="absolute bottom-2 left-2 z-30 hidden h-8 w-8 cursor-nesw-resize touch-none items-center justify-center rounded-lg border border-gold-400/40 bg-navy-900 text-gold-400 shadow-md sm:flex" aria-label="Redimensionner la fenêtre" title="Tirer pour redimensionner"><Scaling className="h-4 w-4" /></button>
            <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
              <div className="flex min-w-0 items-center gap-3">
                {tool && <button type="button" onClick={() => setTool(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>}
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-900"><Calculator className="h-4 w-4 text-gold-400" /></div>
                <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-navy-900">{selected?.label ?? 'Centre de calcul'}</h2><p className="truncate text-xs text-gray-400">{selected?.description ?? 'Calcul rapide et pré-dimensionnement'}</p></div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Réduire"><Minimize2 className="h-5 w-5" /></button>
                <button type="button" onClick={() => { setOpen(false); setTool(null) }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100" title="Fermer et revenir au menu"><X className="h-5 w-5" /></button>
              </div>
            </header>

            {technicalTool && (
              <div className="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
                <div className="grid flex-1 grid-cols-2 rounded-lg bg-gray-100 p-1">
                  <button type="button" onClick={() => setView('inputs')} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', view === 'inputs' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-400')}>Saisie</button>
                  <button type="button" onClick={() => setView('results')} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', view === 'results' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-400')}>Résultats</button>
                </div>
                <Link href={tool ? TOOL_ROUTES[tool] ?? '/calculateurs' : '/calculateurs'} className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gold-400 hover:text-gold-700" title="Ouvrir la version complète"><ExternalLink className="h-4 w-4" /></Link>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {!tool && (
                <div className="mx-auto max-w-md">
                  <div className="mb-3"><h3 className="text-sm font-semibold text-navy-900">Choisir un calcul</h3></div>
                  <div className="grid grid-cols-2 gap-2">
                    {TOOLS.map(item => {
                      const Icon = item.icon
                      return <button key={item.id} type="button" onClick={() => selectTool(item.id)} className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left transition-all hover:border-gold-400 hover:bg-gold-400/5" title={item.description}><span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-navy-900"><Icon className="h-3.5 w-3.5 text-gold-400" /></span><span className="text-xs font-semibold leading-tight text-navy-900">{item.label}</span></button>
                    })}
                  </div>
                </div>
              )}
              {tool === 'simple' && <SimpleCalculator />}
              {technicalTool && <div className={cn('global-calculator-compact', view === 'inputs' ? 'compact-inputs' : 'compact-results')}>
                {tool === 'ups' && <UpsCalculator {...EMPTY_RELATIONS} />}
                {tool === 'battery' && <BatteryCalculator {...EMPTY_RELATIONS} />}
                {tool === 'rectifier' && <RectifierCalculator {...EMPTY_RELATIONS} />}
                {tool === 'inverter' && <InverterCalculator {...EMPTY_RELATIONS} />}
                {tool === 'bess' && <BessCalculator {...EMPTY_RELATIONS} />}
                {tool === 'frequency' && <FrequencyConverterCalculator {...EMPTY_RELATIONS} />}
              </div>}
            </div>
            <style jsx global>{`
              @media (min-width: 640px) {
                .global-calculator-panel {
                  width: min(var(--calculator-width), calc(100vw - 2rem)) !important;
                  height: min(var(--calculator-height), calc(100vh - 2rem)) !important;
                }
              }
              .global-calculator-compact > .max-w-6xl > .grid {
                grid-template-columns: minmax(0, 1fr) !important;
                gap: 0.75rem !important;
              }
              .global-calculator-compact.compact-inputs > .max-w-6xl > .grid > :last-child,
              .global-calculator-compact.compact-results > .max-w-6xl > .grid > :first-child {
                display: none !important;
              }
              .global-calculator-compact .card.p-6 { padding: 1rem !important; }
              .global-calculator-compact .space-y-6 > :not([hidden]) ~ :not([hidden]) { margin-top: 1rem; }
            `}</style>
          </section>
        </div>
      )}
    </>
  )
}
