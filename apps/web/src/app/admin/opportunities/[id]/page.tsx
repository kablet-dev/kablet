import { adminApi } from '@/lib/admin-api'
import { notFound } from 'next/navigation'
import OpportunityEditor from './OpportunityEditor'

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    const opportunity = await adminApi.getOpportunity(id)
    return <OpportunityEditor opportunity={opportunity} isNew={false} />
  } catch {
    notFound()
  }
}