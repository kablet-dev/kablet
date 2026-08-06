import { adminApi } from '@/lib/admin-api'
import { notFound } from 'next/navigation'
import OpportunityEditor from './OpportunityEditor'

export default async function OpportunityPage({ params }: { params: { id: string } }) {


  try {
    const opportunity = await adminApi.getOpportunity(params.id)
    return <OpportunityEditor opportunity={opportunity} isNew={false} />
  } catch {
    notFound()
  }
}