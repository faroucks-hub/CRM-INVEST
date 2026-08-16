'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LineItem } from '@/types/sprint3'
import { calcLineTotal, UNIT_OPTIONS } from '@/types/sprint3'

interface Props {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
  currency: string
  showBuyPrices?: boolean  // Admin/lead only
}

const EMPTY_ITEM: Omit<LineItem, 'sort_order'> = {
  description:     '',
  detail:          '',
  reference:       '',
  quantity:        1,
  unit:            'unité',
  unit_sell_price: 0,
  discount_pct:    0,
  line_total_sell: 0,
}

function fmtNum(n: number, dec = 2) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

export default function LineItemsEditor({ items, onChange, currency, showBuyPrices = false }: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const updateItem = useCallback((idx: number, patch: Partial<LineItem>) => {
    const updated = items.map((item, i) => {
      if (i !== idx) return item
      const merged = { ...item, ...patch }
      merged.line_total_sell = calcLineTotal(
        merged.quantity, merged.unit_sell_price, merged.discount_pct
      )
      if (merged.unit_buy_price != null) {
        merged.line_total_buy = merged.quantity * merged.unit_buy_price
        merged.margin_pct = merged.line_total_sell > 0
          ? ((merged.line_total_sell - (merged.line_total_buy ?? 0)) / merged.line_total_sell) * 100
          : 0
      }
      return merged
    })
    onChange(updated)
  }, [items, onChange])

  function addItem() {
    const newItem: LineItem = {
      ...EMPTY_ITEM,
      sort_order: items.length,
    }
    onChange([...items, newItem])
    setExpandedRow(items.length)
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, sort_order: i })))
    if (expandedRow === idx) setExpandedRow(null)
  }

  function moveItem(idx: number, dir: 'up' | 'down') {
    const newItems = [...items]
    const swapIdx  = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newItems.length) return
    ;[newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]]
    onChange(newItems.map((item, i) => ({ ...item, sort_order: i })))
  }

  // Totaux
  const subtotal     = items.reduce((s, i) => s + i.line_total_sell, 0)
  const sym          = { USD:'$', EUR:'€', TRY:'₺', XOF:'FCFA' }[currency] ?? currency

  return (
    <div className="space-y-2">

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[auto_1fr_80px_80px_90px_70px_90px_36px] gap-2
                      text-2xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1
                      border-b border-gray-100">
        <span className="w-7" />
        <span>Désignation</span>
        <span className="text-right">Qté</span>
        <span className="text-center">Unité</span>
        <span className="text-right">P.U. HT ({sym})</span>
        <span className="text-right">Remise</span>
        <span className="text-right">Total ({sym})</span>
        <span />
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-400 border border-dashed
                       border-gray-200 rounded-lg">
          Aucun article — cliquez sur "Ajouter une ligne" pour commencer
        </div>
      ) : (
        items.map((item, idx) => (
          <div key={idx} className={cn(
            'border rounded-lg overflow-hidden transition-colors',
            expandedRow === idx ? 'border-gold-400/50 shadow-sm' : 'border-gray-200'
          )}>
            {/* Main row */}
            <div className="grid grid-cols-[28px_1fr_80px_80px_90px_70px_90px_36px] gap-2
                           items-center px-2 py-2 bg-white hover:bg-gray-50/50 transition-colors">
              {/* Order buttons */}
              <div className="flex flex-col items-center gap-0.5">
                <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-0 transition-colors">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <GripVertical className="w-3 h-3 text-gray-300" />
                <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-0 transition-colors">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Description — click to expand */}
              <div
                className="cursor-pointer min-w-0"
                onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
              >
                <input
                  value={item.description}
                  onChange={e => updateItem(idx, { description: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  placeholder="Désignation du produit / service *"
                  className="w-full text-sm font-medium text-gray-900 bg-transparent
                             border-0 outline-none placeholder-gray-300 truncate"
                />
                {item.detail && (
                  <div className="text-xs text-gray-400 truncate mt-0.5">{item.detail}</div>
                )}
              </div>

              {/* Quantity */}
              <input
                type="number"
                value={item.quantity}
                onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.5"
                className="input text-right text-sm py-1 px-2 h-8"
              />

              {/* Unit */}
              <select
                value={item.unit}
                onChange={e => updateItem(idx, { unit: e.target.value })}
                className="input text-sm py-1 px-1 h-8"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>

              {/* Unit price */}
              <input
                type="number"
                value={item.unit_sell_price || ''}
                onChange={e => updateItem(idx, { unit_sell_price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="input text-right text-sm py-1 px-2 h-8"
              />

              {/* Discount */}
              <div className="relative">
                <input
                  type="number"
                  value={item.discount_pct || ''}
                  onChange={e => updateItem(idx, { discount_pct: parseFloat(e.target.value) || 0 })}
                  min="0" max="100" step="1"
                  placeholder="0"
                  className="input text-right text-sm py-1 px-2 pr-6 h-8"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
              </div>

              {/* Line total */}
              <div className="text-right">
                <span className="text-sm font-semibold text-navy-900">
                  {fmtNum(item.line_total_sell)}
                </span>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeItem(idx)}
                className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50
                           transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Expanded detail row */}
            {expandedRow === idx && (
              <div className="px-3 pb-3 pt-2 bg-gray-50/50 border-t border-gray-100
                             grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-up">
                <div className="sm:col-span-2">
                  <label className="label">Description complémentaire</label>
                  <textarea
                    value={item.detail ?? ''}
                    onChange={e => updateItem(idx, { detail: e.target.value })}
                    rows={2}
                    placeholder="Spécifications techniques, modèle, certifications..."
                    className="input text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="label">Référence / Modèle</label>
                  <input
                    value={item.reference ?? ''}
                    onChange={e => updateItem(idx, { reference: e.target.value })}
                    placeholder="ex: UPS-100K-3P"
                    className="input text-sm"
                  />
                  {showBuyPrices && (
                    <>
                      <label className="label mt-2">
                        Prix achat unitaire <span className="text-amber-600">(confidentiel)</span>
                      </label>
                      <input
                        type="number"
                        value={item.unit_buy_price ?? ''}
                        onChange={e => updateItem(idx, { unit_buy_price: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        className="input text-sm"
                      />
                      {item.margin_pct != null && item.margin_pct > 0 && (
                        <div className="text-xs text-green-600 mt-1 font-medium">
                          Marge : {fmtNum(item.margin_pct, 1)}%
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))
      )}

      {/* Add button */}
      <button
        type="button"
        onClick={addItem}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm
                   text-gold-600 hover:text-gold-700 border border-dashed border-gold-300
                   hover:border-gold-500 rounded-lg hover:bg-gold-50/30 transition-all"
      >
        <Plus className="w-4 h-4" /> Ajouter une ligne
      </button>

      {/* Totaux */}
      {items.length > 0 && (
        <div className="flex justify-end mt-2">
          <div className="w-72 space-y-1">
            <div className="flex justify-between text-sm text-gray-600 py-1 border-b border-gray-100">
              <span>Sous-total HT</span>
              <span className="font-medium">{fmtNum(subtotal)} {sym}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-navy-900 py-1.5
                           bg-navy-900/5 px-3 rounded-md">
              <span>TOTAL HT</span>
              <span>{fmtNum(subtotal)} {sym}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
