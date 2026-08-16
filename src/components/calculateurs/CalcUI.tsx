'use client'

import { cn } from '@/lib/utils'
import type { CalcType } from '@/types/sprint5'
import { CALC_COLORS } from '@/types/sprint5'

export type CalculationMode = 'new_sizing' | 'existing_installation'

export function CalculationModeSelector({
  value,
  onChange,
}: {
  value: CalculationMode
  onChange: (value: CalculationMode) => void
}) {
  const modes: { value: CalculationMode; title: string; description: string }[] = [
    {
      value: 'new_sizing',
      title: 'Nouveau dimensionnement',
      description: "Déterminer l'équipement nécessaire à partir du besoin.",
    },
    {
      value: 'existing_installation',
      title: 'Installation existante',
      description: 'Saisir et vérifier les caractéristiques réellement installées.',
    },
  ]

  return (
    <div className="card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Objet du calcul
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {modes.map(mode => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              value === mode.value
                ? 'border-gold-400 bg-gold-400/5 ring-1 ring-gold-400/20'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            <span className="block text-sm font-semibold text-navy-900">{mode.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-gray-400">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Slider Input ──────────────────────────────────────────────────
interface SliderInputProps {
  label:   string
  value:   number
  min:     number
  max:     number
  step:    number
  unit:    string
  onChange:(v: number) => void
  hint?:   string
}

export function SliderInput({ label, value, min, max, step, unit, onChange, hint }: SliderInputProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={e => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
            className="w-20 text-sm font-semibold text-navy-900 text-right border border-gray-200
                       rounded-md px-2 py-1 focus:outline-none focus:border-gold-400 bg-white"
          />
          <span className="text-xs text-gray-400 min-w-[28px]">{unit}</span>
        </div>
      </div>
      <div className="relative h-2">
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        <div
          className="absolute left-0 top-0 bottom-0 bg-navy-900 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-navy-900
                     rounded-full shadow-sm pointer-events-none transition-all"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ── Number Input ──────────────────────────────────────────────────
interface NumberInputProps {
  label:   string
  value:   number
  unit?:   string
  min?:    number
  max?:    number
  step?:   number
  onChange:(v: number) => void
  hint?:   string
  required?:boolean
}

export function NumberInput({ label, value, unit, min=0, max, step=1, onChange, hint, required }: NumberInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
      <input
        type="number"
        value={value || ''}
        min={min}
        {...(max ? { max } : {})}
        step={step}
        onChange={e => onChange(Number(e.target.value) || 0)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900
                   focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400
                   bg-white transition-colors"
        placeholder="0"
      />
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

interface PresetNumberInputProps extends NumberInputProps {
  presets: number[]
}

export function PresetNumberInput({
  presets,
  ...props
}: PresetNumberInputProps) {
  return (
    <div className="space-y-2">
      <NumberInput {...props} />
      <div className="flex flex-wrap gap-1.5">
        {presets.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => props.onChange(preset)}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-colors',
              props.value === preset
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
            )}
          >
            {preset} {props.unit}
          </button>
        ))}
        {!presets.includes(props.value) && (
          <span className="rounded-md bg-gold-400/10 px-2 py-1 text-xs font-medium text-gold-700">
            Valeur personnalisée
          </span>
        )}
      </div>
    </div>
  )
}

// ── Select Input ──────────────────────────────────────────────────
interface SelectInputProps {
  label:   string
  value:   string
  options: { value: string; label: string }[]
  onChange:(v: string) => void
  hint?:   string
}

export function SelectInput({ label, value, options, onChange, hint }: SelectInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900
                   focus:outline-none focus:ring-2 focus:ring-gold-400/30 focus:border-gold-400
                   bg-white transition-colors"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ── Result Card ───────────────────────────────────────────────────
interface ResultCardProps {
  label:    string
  value:    number | string
  unit?:    string
  highlight?:boolean
  color?:   string
  sub?:     string
  icon?:    React.ReactNode
}

export function ResultCard({ label, value, unit, highlight, color, sub, icon }: ResultCardProps) {
  return (
    <div className={cn(
      'rounded-xl p-4 border transition-all',
      highlight
        ? 'bg-navy-900 border-navy-800'
        : 'bg-white border-gray-200'
    )}>
      <div className="flex items-start justify-between mb-1">
        <span className={cn(
          'text-xs font-medium uppercase tracking-wide',
          highlight ? 'text-gold-400/70' : 'text-gray-400'
        )}>
          {label}
        </span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={cn(
          'text-2xl font-bold tabular-nums',
          highlight ? 'text-white' : color ?? 'text-navy-900'
        )}>
          {typeof value === 'number'
            ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
            : value}
        </span>
        {unit && (
          <span className={cn(
            'text-sm',
            highlight ? 'text-gold-400/60' : 'text-gray-400'
          )}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div className={cn(
          'text-xs mt-1',
          highlight ? 'text-white/40' : 'text-gray-400'
        )}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────
export function CalcSection({ title, children, accent }: {
  title: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-100" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <div className="h-px flex-1 bg-gray-100" />
      </div>
      {children}
    </div>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────
export function ProgressBar({ value, max, label, unit, color }: {
  value: number; max: number; label: string; unit?: string; color?: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : color ?? 'bg-navy-900'

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-navy-900">
          {value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}{unit && ` ${unit}`}
          <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Gauge ─────────────────────────────────────────────────────────
export function Gauge({ value, max, label, unit, ok }: {
  value:number; max:number; label:string; unit?:string; ok:boolean
}) {
  const pct = Math.min(100, (value / max) * 100)
  const r   = 40
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  const color = ok ? '#16A34A' : '#DC2626'

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="60" viewBox="0 0 100 60">
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(dash / circ) * (Math.PI * r)} ${Math.PI * r}`}
          style={{ transition: 'stroke-dasharray .6s ease' }} />
        <text x="50" y="52" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0B1F3A">
          {Math.round(pct)}%
        </text>
      </svg>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  )
}

// ── Disclaimer Banner ─────────────────────────────────────────────
export function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
      <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
      <p className="text-xs text-amber-800 leading-relaxed">{text}</p>
    </div>
  )
}

// ── Simple SVG Chart (Autonomie) ──────────────────────────────────
export function AutonomyChart({ data, autonomy_min }: {
  data: { minutes: number; soc: number }[]
  autonomy_min: number
}) {
  if (!data.length) return null

  const W = 400, H = 160
  const padL = 40, padR = 16, padT = 12, padB = 36

  const maxMin = Math.max(...data.map(d => d.minutes), autonomy_min)
  const scaleX = (m: number) => padL + (m / maxMin) * (W - padL - padR)
  const scaleY = (s: number) => padT + ((100 - s) / 100) * (H - padT - padB)

  // Polyline points
  const points = data.map(d => `${scaleX(d.minutes)},${scaleY(d.soc)}`).join(' ')

  // Grid lines
  const gridY = [0, 25, 50, 75, 100]
  const gridX = [0, 25, 50, 75, 100].map(pct => Math.round(maxMin * pct / 100))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      {/* Grid Y */}
      {gridY.map(y => (
        <g key={y}>
          <line x1={padL} y1={scaleY(y)} x2={W - padR} y2={scaleY(y)}
            stroke="#F3F4F6" strokeWidth="1" />
          <text x={padL - 6} y={scaleY(y) + 4} textAnchor="end" fontSize="9" fill="#9CA3AF">{y}%</text>
        </g>
      ))}

      {/* Grid X */}
      {gridX.map(min => (
        <g key={min}>
          <line x1={scaleX(min)} y1={padT} x2={scaleX(min)} y2={H - padB}
            stroke="#F3F4F6" strokeWidth="1" />
          <text x={scaleX(min)} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="#9CA3AF">{min}m</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon
        points={`${scaleX(0)},${scaleY(0)} ${points} ${scaleX(data[data.length-1]?.minutes ?? 0)},${scaleY(0)}`}
        fill="#0B1F3A" opacity="0.06"
      />

      {/* Line */}
      <polyline points={points} fill="none" stroke="#0B1F3A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Target line */}
      <line x1={scaleX(autonomy_min)} y1={padT} x2={scaleX(autonomy_min)} y2={H - padB}
        stroke="#D9A441" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x={scaleX(autonomy_min) + 4} y={padT + 10} fontSize="8" fill="#D9A441" fontWeight="700">
        Cible {autonomy_min}m
      </text>

      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#D1D5DB" strokeWidth="1" />
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#D1D5DB" strokeWidth="1" />

      {/* Labels */}
      <text x={padL - 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#6B7280" transform={`rotate(-90, ${padL - 20}, ${H/2})`}>SOC (%)</text>
      <text x={W / 2} y={H} textAnchor="middle" fontSize="9" fill="#6B7280">Temps (minutes)</text>
    </svg>
  )
}

// ── Calc Type Badge ───────────────────────────────────────────────
export function CalcTypeBadge({ type }: { type: CalcType }) {
  const c = CALC_COLORS[type]
  const icons: Record<CalcType, string> = { ups:'⚡', battery:'🔋', rectifier:'🔌', bess:'☀️', inverter:'〰️', frequency_converter:'🔄' }
  const labels: Record<CalcType, string> = { ups:'UPS', battery:'Batteries', rectifier:'Rectifier', bess:'BESS', inverter:'Inverter', frequency_converter:'Frequency Converter' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', c.bg, c.text, c.border)}>
      <span>{icons[type]}</span>{labels[type]}
    </span>
  )
}
