'use client'

import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function CatalogActions({
  id,
  lifecycleState,
}: {
  id: string
  lifecycleState: string
}) {
  const router = useRouter()

  async function handleAction(action: 'activate' | 'pause') {
    await fetch(`${API_URL}/admin/catalog/${id}/${action}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}`,
      },
    })
    router.refresh()
  }

  return (
    <div className="flex gap-2">
      {lifecycleState === 'DRAFT' && (
        <button
          onClick={() => handleAction('activate')}
          className="text-xs text-green-400 hover:text-green-300 font-medium"
        >
          Activate
        </button>
      )}
      {lifecycleState === 'ACTIVE' && (
        <button
          onClick={() => handleAction('pause')}
          className="text-xs text-yellow-400 hover:text-yellow-300 font-medium"
        >
          Pause
        </button>
      )}
      {lifecycleState === 'PAUSED' && (
        <button
          onClick={() => handleAction('activate')}
          className="text-xs text-green-400 hover:text-green-300 font-medium"
        >
          Reactivate
        </button>
      )}
    </div>
  )
}