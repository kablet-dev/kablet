'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

export default function NewDefinitionForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    headline: '',
    description: '',
    value_proposition: '',
    cta_label: 'Add to my order',
    visual_asset_url: '',
    shopify_product_variant_id: '',
    shopify_product_price: '',
    required_geography: 'AE',
    min_transaction_value: '',
    base_priority: '10',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch(`${API_URL}/admin/catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({
        ...form,
        shopify_product_price: parseFloat(form.shopify_product_price),
        min_transaction_value: form.min_transaction_value ? parseFloat(form.min_transaction_value) : null,
        base_priority: parseInt(form.base_priority),
      }),
    })

    setLoading(false)

    if (res.ok) {
      setOpen(false)
      setForm({
        name: '', headline: '', description: '', value_proposition: '',
        cta_label: 'Add to my order', visual_asset_url: '',
        shopify_product_variant_id: '', shopify_product_price: '',
        required_geography: 'AE', min_transaction_value: '', base_priority: '10',
      })
      router.refresh()
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700"
      >
        {open ? 'Cancel' : '+ New Definition'}
      </button>

      {open && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mt-4">
          <h2 className="text-white font-semibold mb-4">New Opportunity Definition</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Name (internal)</label>
              <input name="name" value={form.name} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Headline (shown to customer)</label>
              <input name="headline" value={form.headline} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input name="description" value={form.description} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Value Proposition (e.g. "Only AED 29")</label>
              <input name="value_proposition" value={form.value_proposition} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">CTA Label</label>
              <input name="cta_label" value={form.cta_label} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Product Image URL</label>
              <input name="visual_asset_url" value={form.visual_asset_url} onChange={handleChange} required
                placeholder="https://..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Shopify Variant ID</label>
              <input name="shopify_product_variant_id" value={form.shopify_product_variant_id} onChange={handleChange} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Product Price (AED)</label>
              <input name="shopify_product_price" value={form.shopify_product_price} onChange={handleChange} required
                type="number" step="0.01"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Required Geography</label>
              <input name="required_geography" value={form.required_geography} onChange={handleChange} required
                placeholder="AE"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Min Transaction Value (AED)</label>
              <input name="min_transaction_value" value={form.min_transaction_value} onChange={handleChange}
                type="number" step="0.01" placeholder="Optional"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Priority (lower = higher priority)</label>
              <input name="base_priority" value={form.base_priority} onChange={handleChange} required
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
            </div>

            <div className="col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Definition'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  )
}