'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { calcLineTotal, calcDocTotals } from '@/types/sprint3'
import { formatCurrency } from '@/lib/utils'

export interface LineItem {
  id:              string
  sort_order:      number
  designation:     string
  description?:    string
  reference?:      string
  quantity:        number
  unit:            string
  unit_price_sell: number
  discount_pct:    number
  line_total_sell: number
  unit_price_buy?: number
  notes?:          string
}

interface Props {
  lines:          LineItem[]
  onChange:       (lines: LineItem[]) => void
  currency:       string
  discountGlobal: number
  onDiscountChange: (v: number) => void
  canSeeBuyPrice: boolean
}

const UNITS = ['unité','paire','lot','ensemble','mois','jours','heure','kg','km','m']

function uid() { return Math.random().toString(36).slice(2, 9) }

function newLine(): LineItem {
  return {
    id: uid(), sort_order: 0,
    designation: '', description: '', reference: '',
    quantity: 1, unit: 'unité',
    unit_price_sell: 0, discount_pct: 0, line_total_sell: 0,
    unit_price_buy: undefined, notes: '',
  }
}

export default function DocumentLinesEditor({
  lines, onChange, currency, discountGlobal, onDiscountChange, canSeeBuyPrice
}: Props) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const updateLine = useCallback((id: string, field: string, value: unknown) => {
    onChange(lines.map(l => {
      if (l.id !== id) return l
      const updated = { ...l, [field]: value }
      if (['quantity','unit_price_sell','discount_pct'].includes(field)) {
        updated.line_total_sell = calcLineTotal(
          field === 'quantity'        ? Number(value) : l.quantity,
          field === 'unit_price_sell' ? Number(value) : l.unit_price_sell,
          field === 'discount_pct'    ? Number(value) : l.discount_pct,
        )
      }
      return updated
    }))
  }, [lines, onChange])

  function addLine() {
    const l = newLine()
    l.sort_order = lines.length
    onChange([...lines, l])
  }

  function removeLine(id: string) {
    onChange(lines.filter(l => l.id !== id))
  }

  function toggleExpand(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function moveUp(i: number) {
    if (i === 0) return
    const arr = [...lines]
    ;[arr[i-1], arr[i]] = [arr[i], arr[i-1]]
    onChange(arr.map((l,idx) => ({ ...l, sort_order: idx })))
  }

  function moveDown(i: number) {
    if (i === lines.length - 1) return
    const arr = [...lines]
    ;[arr[i], arr[i+1]] = [arr[i+1], arr[i]]
    onChange(arr.map((l,idx) => ({ ...l, sort_order: idx })))
  }

  const { subtotal, total } = calcDocTotals(lines, discountGlobal)
  const discountAmt = subtotal - total
  const cur = currency as 'USD'

  return (
    <div className="space-y-3">

      {/* Lines table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-2xs font-semibold
                       text-gray-500 uppercase tracking-wide"
          style={{ gridTemplateColumns: '24px 2fr 1fr 90px 80px 90px 80px 32px' }}>
          <div />
          <div>Désignation</div>
          <div>Réf.</div>
          <div className="text-right">Qté</div>
          <div className="text-right">P.U. HT</div>
          <div className="text-right">Remise</div>
          <div className="text-right">Total HT</div>
          <div />
        </div>

        {/* Lines */}
        {lines.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            Ajoutez des lignes à votre document
          </div>
        )}

        {lines.map((l, i) => (
          <div key={l.id} className="border-b border-gray-100 last:border-b-0">
            {/* Main row */}
            <div className="grid gap-2 px-3 py-2 items-center hover:bg-gray-50/50 group"
              style={{ gridTemplateColumns: '24px 2fr 1fr 90px 80px 90px 80px 32px' }}>
              {/* Drag handle / order */}
              <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={() => moveUp(i)} className="text-gray-300 hover:text-gray-600 leading-none">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button onClick={() => moveDown(i)} className="text-gray-300 hover:text-gray-600 leading-none">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Désignation */}
              <div>
                <input
                  value={l.designation}
                  onChange={e => updateLine(l.id, 'designation', e.target.value)}
                  placeholder="Désignation du produit ou service"
                  className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-1
                             focus:ring-gold-400/50 rounded px-1 py-0.5 text-gray-900 font-medium
                             placeholder-gray-300"
                />
                <button
                  type="button"
                  onClick={() => toggleExpand(l.id)}
                  className="text-2xs text-gray-400 hover:text-gold-500 flex items-center gap-0.5 mt-0.5 ml-1"
                >
                  {expandedRows.has(l.id) ? '▲' : '▼'} détails
                </button>
              </div>

              {/* Référence */}
              <input
                value={l.reference ?? ''}
                onChange={e => updateLine(l.id, 'reference', e.target.value)}
                placeholder="Réf."
                className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none
                           focus:border-gold-400 bg-white"
              />

              {/* Quantité + unité */}
              <div className="flex gap-1">
                <input type="number" min="0" step="0.001"
                  value={l.quantity}
                  onChange={e => updateLine(l.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-14 text-xs border border-gray-200 rounded px-1.5 py-1 text-right
                             focus:outline-none focus:border-gold-400 bg-white"
                />
                <select
                  value={l.unit}
                  onChange={e => updateLine(l.id, 'unit', e.target.value)}
                  className="text-xs border border-gray-200 rounded px-1 py-1
                             focus:outline-none focus:border-gold-400 bg-white"
                >
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>

              {/* Prix unitaire */}
              <input type="number" min="0" step="0.01"
                value={l.unit_price_sell || ''}
                onChange={e => updateLine(l.id, 'unit_price_sell', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="text-xs border border-gray-200 rounded px-2 py-1 text-right
                           focus:outline-none focus:border-gold-400 bg-white w-full"
              />

              {/* Remise */}
              <div className="flex items-center gap-0.5">
                <input type="number" min="0" max="100" step="0.5"
                  value={l.discount_pct || ''}
                  onChange={e => updateLine(l.id, 'discount_pct', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-12 text-xs border border-gray-200 rounded px-1.5 py-1 text-right
                             focus:outline-none focus:border-gold-400 bg-white"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>

              {/* Total ligne */}
              <div className="text-sm font-medium text-right text-navy-900 pr-1">
                {formatCurrency(l.line_total_sell, cur)}
              </div>

              {/* Delete */}
              <button
                type="button"
                onClick={() => removeLine(l.id)}
                className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500
                           transition-all rounded p-0.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded details */}
            {expandedRows.has(l.id) && (
              <div className="px-8 pb-3 pt-1 bg-gray-50/50 border-t border-gray-100
                             grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="label text-2xs">Description</label>
                  <textarea
                    value={l.description ?? ''}
                    onChange={e => updateLine(l.id, 'description', e.target.value)}
                    rows={2}
                    placeholder="Description détaillée, spécifications techniques..."
                    className="input text-xs resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="label text-2xs">Notes internes</label>
                    <input
                      value={l.notes ?? ''}
                      onChange={e => updateLine(l.id, 'notes', e.target.value)}
                      placeholder="Notes internes (non affichées sur le PDF)"
                      className="input text-xs"
                    />
                  </div>
                  {canSeeBuyPrice && (
                    <div>
                      <label className="label text-2xs">Prix d'achat unitaire (confidentiel)</label>
                      <div className="flex items-center gap-1.5">
                        <input type="number" min="0" step="0.01"
                          value={l.unit_price_buy ?? ''}
                          onChange={e => updateLine(l.id, 'unit_price_buy', parseFloat(e.target.value) || undefined)}
                          placeholder="0.00"
                          className="input text-xs"
                        />
                        {l.unit_price_buy && l.unit_price_sell > 0 && (
                          <span className="text-xs font-medium text-emerald-600 flex-shrink-0">
                            Marge : {Math.round((l.unit_price_sell - l.unit_price_buy) / l.unit_price_sell * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add line button */}
      <button
        type="button"
        onClick={addLine}
        className="flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400
                   transition-colors py-1"
      >
        <Plus className="w-4 h-4" /> Ajouter une ligne
      </button>

      {/* Totaux */}
      <div className="flex justify-end">
        <div className="w-72 space-y-1.5 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Sous-total HT</span>
            <span className="font-medium">{formatCurrency(subtotal, cur)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Remise globale</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={discountGlobal || ''}
                  onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-12 text-xs border border-gray-200 rounded px-1.5 py-0.5 text-right
                             focus:outline-none focus:border-gold-400 bg-white"
                />
                <span className="text-xs text-gray-400">%</span>
              </div>
            </div>
            <span className="text-red-500">- {formatCurrency(discountAmt, cur)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base text-navy-900
                         border-t border-gray-200 pt-1.5 mt-1.5">
            <span>TOTAL HT</span>
            <span>{formatCurrency(total, cur)}</span>
          </div>
          <div className="text-xs text-gray-400 text-right">
            Hors taxes — prix {currency}
          </div>
        </div>
      </div>
    </div>
  )
}
