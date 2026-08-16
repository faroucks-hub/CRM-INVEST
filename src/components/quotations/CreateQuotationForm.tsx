'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createQuotationAction } from '@/lib/actions/quotations'

export default function CreateQuotationForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    company: '',
    currency: 'USD',
    quotation_type: 'industrial',
    payment_terms: '30% Advance / 70% Before Shipment',
    delivery_terms: '6-8 weeks after approval',
  })

  const [items, setItems] = useState([
    {
      description: '',
      quantity: 1,
      unit_price_sell: 0,
      discount_pct: 0,
    },
  ])

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return (
        sum +
        Number(item.quantity || 0) *
          Number(item.unit_price_sell || 0) *
          (1 - Number(item.discount_pct || 0) / 100)
      )
    }, 0)
  }, [items])

  function updateItem(index: number, field: string, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function handleCreateQuotation() {
    if (!formData.client_id) {
      toast.error('Client ID is required')
      return
    }

    if (!items[0]?.description) {
      toast.error('Please add at least one item')
      return
    }

    startTransition(async () => {
      const today = new Date()
      const validUntil = new Date()
      validUntil.setDate(today.getDate() + 30)

      const result = await createQuotationAction({
        client_id: formData.client_id,
        issued_date: today.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        currency: formData.currency,
        quotation_type: formData.quotation_type as any,
        payment_terms: formData.payment_terms,
        delivery_delay: formData.delivery_terms,
        discount_global: 0,
        lines: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price_sell: item.unit_price_sell,
          discount_pct: item.discount_pct,
          unit: 'pcs',
        })) as any,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Quotation created')
      router.push('/quotations')
    })
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Quotation Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Client ID</label>
            <input
              className="input"
              placeholder="Existing client UUID"
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Client Name</label>
            <input
              className="input"
              placeholder="Client name"
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Company</label>
            <input
              className="input"
              placeholder="Company"
              value={formData.company}
              onChange={(e) =>
                setFormData({ ...formData, company: e.target.value })
              }
            />
          </div>

          <div>
            <label className="label">Currency</label>
            <select
              className="input"
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="TRY">TRY</option>
              <option value="XOF">XOF</option>
            </select>
          </div>

          <div>
            <label className="label">Quotation Type</label>
            <select
              className="input"
              value={formData.quotation_type}
              onChange={(e) =>
                setFormData({ ...formData, quotation_type: e.target.value })
              }
            >
              <option value="quick">Quick Quote</option>
              <option value="industrial">Industrial Quote</option>
              <option value="full_proposal">Full Proposal</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Items</h2>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              setItems([
                ...items,
                {
                  description: '',
                  quantity: 1,
                  unit_price_sell: 0,
                  discount_pct: 0,
                },
              ])
            }
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => {
            const lineTotal =
              Number(item.quantity || 0) *
              Number(item.unit_price_sell || 0) *
              (1 - Number(item.discount_pct || 0) / 100)

            return (
              <div key={index} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <input
                    className="input"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, 'description', e.target.value)
                    }
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    className="input"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, 'quantity', Number(e.target.value))
                    }
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    className="input"
                    value={item.unit_price_sell}
                    onChange={(e) =>
                      updateItem(
                        index,
                        'unit_price_sell',
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    className="input"
                    value={item.discount_pct}
                    onChange={(e) =>
                      updateItem(index, 'discount_pct', Number(e.target.value))
                    }
                  />
                </div>

                <div className="col-span-1 text-sm font-medium">
                  {lineTotal.toFixed(2)}
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() => removeItem(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Commercial Terms</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            className="input min-h-[120px]"
            value={formData.payment_terms}
            onChange={(e) =>
              setFormData({ ...formData, payment_terms: e.target.value })
            }
          />

          <textarea
            className="input min-h-[120px]"
            value={formData.delivery_terms}
            onChange={(e) =>
              setFormData({ ...formData, delivery_terms: e.target.value })
            }
          />
        </div>
      </div>

      <div className="card p-6 flex items-center justify-between">
        <div className="text-gray-500">Subtotal</div>
        <div className="text-2xl font-semibold text-navy-900">
          {subtotal.toFixed(2)} {formData.currency}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCreateQuotation}
          disabled={isPending}
        >
          {isPending ? 'Creating...' : 'Create Quotation'}
        </button>
      </div>
    </div>
  )
}