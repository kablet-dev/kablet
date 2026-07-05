'use client'

import { useRouter } from 'next/navigation'

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
  const router = useRouter()

  async function handleToggle() {
    await fetch(`${API_URL}/admin/merchants/${merchantId}/config`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ [field]: !enabled }),
    })
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        enabled ? 'bg-violet-600' : 'bg-gray-700'
      }`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  )
}