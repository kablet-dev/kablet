'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OpportunityDefinition } from '@/lib/admin-api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

const TABS = ['General', 'Creative', 'Rules', 'Execution', 'Analytics'] as const
type Tab = typeof TABS[number]

const STATE_COLORS: Record<string, string> = {
  ACTIVE:   'bg-green-900 text-green-300',
  DRAFT:    'bg-yellow-900 text-yellow-300',
  PAUSED:   'bg-gray-800 text-gray-400',
  ARCHIVED: 'bg-red-900 text-red-300',
}

export default function OpportunityEditor({
  opportunity,
  isNew,
}: {
  opportunity: OpportunityDefinition
  isNew: boolean
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('General')
  const [form, setForm] = useState({
    name:                       opportunity.name ?? '',
    headline:                   opportunity.headline ?? '',
    description:                opportunity.description ?? '',
    value_proposition:          opportunity.value_proposition ?? '',
    cta_label:                  opportunity.cta_label ?? 'Add to my order',
    visual_asset_url:           opportunity.visual_asset_url ?? '',
    shopify_product_variant_id: opportunity.shopify_product_variant_id ?? '',
    shopify_product_price:      String(opportunity.shopify_product_price ?? ''),
    required_geography:         opportunity.required_geography ?? 'AE',
    min_transaction_value:      opportunity.min_transaction_value != null ? String(opportunity.min_transaction_value) : '',
    base_priority:              String(opportunity.base_priority ?? 10),
    requires_shipping_address:  opportunity.requires_shipping_address ?? true,
    execution_method:           opportunity.execution_method ?? 'PHYSICAL_SHIPMENT',
    value_bullets:              (opportunity.value_bullets ?? []).join('\n'),
    social_proof:               opportunity.social_proof ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const body = {
      name:                       form.name,
      headline:                   form.headline,
      description:                form.description,
      value_proposition:          form.value_proposition,
      cta_label:                  form.cta_label,
      visual_asset_url:           form.visual_asset_url,
      shopify_product_variant_id: form.shopify_product_variant_id || 'pending',
      shopify_product_price:      parseFloat(form.shopify_product_price) || 0,
      required_geography:         form.required_geography,
      min_transaction_value:      form.min_transaction_value ? parseFloat(form.min_transaction_value) : null,
      base_priority:              parseInt(form.base_priority) || 10,
      requires_shipping_address:  form.requires_shipping_address,
      execution_method:           form.execution_method,
      value_bullets:              form.value_bullets.split('\n').map(s => s.trim()).filter(Boolean),
      social_proof:               form.social_proof || null,
    }

    if (isNew) {
      const res = await fetch(`${API_URL}/admin/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        setError('Failed to create opportunity')
        setSaving(false)
        return
      }
      const data = await res.json()
      router.push(`/admin/opportunities/${data.id}`)
      return
    }

    const res = await fetch(`${API_URL}/admin/catalog/${opportunity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADMIN_SECRET}` },
      body: JSON.stringify(body),
    })

    setSaving(false)
    if (!res.ok) {
      setError('Failed to save changes')
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleStatusChange(action: 'activate' | 'pause') {
    await fetch(`${API_URL}/admin/catalog/${opportunity.id}/${action}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    router.refresh()
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/opportunities" className="hover:text-gray-300">Opportunities</Link>
        <span>/</span>
        <span className="text-gray-300">{isNew ? 'New Opportunity' : form.name || 'Untitled'}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              {isNew ? 'New Opportunity' : form.name || 'Untitled'}
            </h1>
            {!isNew && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                STATE_COLORS[opportunity.lifecycle_state] ?? 'bg-gray-800 text-gray-400'
              }`}>
                {opportunity.lifecycle_state}
              </span>
            )}
          </div>
          {!isNew && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Advertiser: <span className="text-gray-400">Kablet</span></span>
              <span>Created: <span className="text-gray-400">{new Date(opportunity.created_at).toLocaleDateString()}</span></span>
              <span>Priority: <span className="text-gray-400">{form.base_priority}</span></span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isNew && opportunity.lifecycle_state === 'ACTIVE' && (
            <button
              onClick={() => handleStatusChange('pause')}
              className="px-3 py-1.5 text-sm text-yellow-400 border border-yellow-800 rounded-lg hover:bg-yellow-900/30"
            >
              Pause
            </button>
          )}
          {!isNew && (opportunity.lifecycle_state === 'DRAFT' || opportunity.lifecycle_state === 'PAUSED') && (
            <button
              onClick={() => handleStatusChange('activate')}
              className="px-3 py-1.5 text-sm text-green-400 border border-green-800 rounded-lg hover:bg-green-900/30"
            >
              {opportunity.lifecycle_state === 'PAUSED' ? 'Reactivate' : 'Activate'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex gap-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">

        {/* ── General ── */}
        {tab === 'General' && (
          <div className="space-y-5 max-w-2xl">
            <Field label="Name (internal)">
              <input name="name" value={form.name} onChange={handleChange}
                placeholder="e.g. Headphone Add-on — UAE"
                className={input} />
            </Field>
            <Field label="Status">
              <div className={`inline-flex text-xs font-medium px-2 py-1 rounded-full ${
                STATE_COLORS[opportunity.lifecycle_state] ?? 'bg-gray-800 text-gray-400'
              }`}>
                {isNew ? 'Will be created as DRAFT' : opportunity.lifecycle_state}
              </div>
            </Field>
            <Field label="Advertiser">
              <div className="text-gray-400 text-sm py-2">Kablet <span className="text-gray-600 text-xs ml-2">(advertiser management coming soon)</span></div>
            </Field>
            <Field label="Priority" hint="Lower number = higher priority">
              <input name="base_priority" value={form.base_priority} onChange={handleChange}
                type="number" className={`${input} w-32`} />
            </Field>
          </div>
        )}

        {/* ── Creative ── */}
        {tab === 'Creative' && (
          <div className="space-y-5 max-w-2xl">
            <Field label="Headline" hint="Shown as the main product title in the widget">
              <input name="headline" value={form.headline} onChange={handleChange}
                placeholder="e.g. Headphone 13.6 hz - Waterproof"
                className={input} />
            </Field>
            <Field label="Description" hint="Shown below the headline">
              <input name="description" value={form.description} onChange={handleChange}
                placeholder="e.g. Premium sound quality with all-day comfort."
                className={input} />
            </Field>
            <Field label="Value Proposition" hint="Short line shown next to the price">
              <input name="value_proposition" value={form.value_proposition} onChange={handleChange}
                placeholder="e.g. Only AED 29 — delivered to your door"
                className={input} />
            </Field>
            <Field label="CTA Label" hint="Text on the primary button">
              <input name="cta_label" value={form.cta_label} onChange={handleChange}
                className={input} />
            </Field>
            <Field label="Product Image URL">
              <input name="visual_asset_url" value={form.visual_asset_url} onChange={handleChange}
                placeholder="https://..."
                className={input} />
              {form.visual_asset_url && (
                <img src={form.visual_asset_url} alt="preview"
                  className="mt-3 w-24 h-24 object-cover rounded-lg border border-gray-700" />
              )}
            </Field>
            <Field label="Benefit Pills" hint="One per line — shown as pills in the widget (max 3)">
              <textarea name="value_bullets" value={form.value_bullets} onChange={handleChange}
                rows={4}
                placeholder={"Free Shipping\nCash on Delivery\nOne-click add"}
                className={input} />
            </Field>
            <Field label="Social Proof" hint="e.g. 4,800+ customers added this to their order">
              <input name="social_proof" value={form.social_proof} onChange={handleChange}
                className={input} />
            </Field>
          </div>
        )}

        {/* ── Rules ── */}
        {tab === 'Rules' && (
          <div className="space-y-5 max-w-2xl">
            <Field label="Required Geography" hint="ISO country code, e.g. AE">
              <input name="required_geography" value={form.required_geography} onChange={handleChange}
                className={`${input} w-32`} />
            </Field>
            <Field label="Minimum Transaction Value (AED)" hint="Leave blank for no minimum">
              <input name="min_transaction_value" value={form.min_transaction_value} onChange={handleChange}
                type="number" step="0.01" placeholder="Optional"
                className={`${input} w-48`} />
            </Field>
            <Field label="Requires Shipping Address">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="requires_shipping_address"
                  checked={form.requires_shipping_address}
                  onChange={handleChange}
                  className="w-4 h-4 accent-violet-500"
                />
                <span className="text-sm text-gray-400">Only show to customers with a shipping address</span>
              </label>
            </Field>
            <div className="pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-600">Merchant whitelist/blacklist and audience targeting coming soon.</p>
            </div>
          </div>
        )}

        {/* ── Execution ── */}
        {tab === 'Execution' && (
          <div className="space-y-5 max-w-2xl">
            <Field label="Execution Method">
              <select name="execution_method" value={form.execution_method} onChange={handleChange}
                className={input}>
                <option value="PHYSICAL_SHIPMENT">Physical Shipment</option>
                <option value="DIGITAL">Digital</option>
                <option value="REWARD">Reward</option>
              </select>
            </Field>
            <Field label="Shopify Product Variant ID" hint="Required for physical shipment execution">
              <input name="shopify_product_variant_id" value={form.shopify_product_variant_id} onChange={handleChange}
                placeholder="e.g. 49033313255675"
                className={input} />
            </Field>
            <Field label="Product Price (AED)">
              <input name="shopify_product_price" value={form.shopify_product_price} onChange={handleChange}
                type="number" step="0.01"
                className={`${input} w-48`} />
            </Field>
            <div className="pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-600">Additional execution methods (reward codes, external APIs, insurance) coming soon.</p>
            </div>
          </div>
        )}

        {/* ── Analytics ── */}
        {tab === 'Analytics' && (
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">Analytics will appear here once this opportunity has been presented to customers.</p>
            <div className="grid grid-cols-4 gap-4 opacity-40 pointer-events-none">
              {['Impressions', 'Accepts', 'Declines', 'Conversion Rate'].map(label => (
                <div key={label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-white mt-1">—</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 pt-2">Per-opportunity analytics coming soon.</p>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

const input = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        {hint && <p className="text-xs text-gray-600 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}