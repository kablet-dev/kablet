'use client'

import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

export default function MarkPaidButton({ payoutId }: { payoutId: string }) {
  const router = useRouter()

  async function handleMarkPaid() {
    await fetch(`${API_URL}/admin/payouts/${payoutId}/mark-paid`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ADMIN_SECRET}` },
    })
    router.refresh()
  }

  return (
    <button
      onClick={handleMarkPaid}
      className="text-xs text-green-400 hover:text-green-300 font-medium"
    >
      Mark as paid
    </button>
  )
}