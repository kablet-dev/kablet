'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

export default function MerchantToggle({
  merchantId,
  enabled,
  field,
}: {
  merchantId: string
  enabled: boolean
  field: 'engine_enabled' | 'offers_enabled'
}) {
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    const newValue = !isEnabled
    setIsEnabled(newValue) // Optimistic update

    const res = await fetch(`${API_URL}/admin/merchants/${merchantId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ [field]: newValue }),
    })

    if (!res.ok) {
      setIsEnabled(!newValue) // Revert on failure
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        isEnabled ? 'bg-violet-600' : 'bg-gray-700'
      } ${loading ? 'opacity-50' : ''}`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
        isEnabled ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  )
}