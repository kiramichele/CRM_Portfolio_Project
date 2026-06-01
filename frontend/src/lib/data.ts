import { createClient } from '@/lib/supabase/server'
import type { ContractWithRelations } from '@/components/contract-view'

/** Fetch a contract with its job, parties, milestones, and message thread id. */
export async function fetchContract(
  id: string,
): Promise<{ contract: ContractWithRelations; threadId: string | null } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contracts')
    .select(
      '*,jobs(title),client:profiles!client_id(display_name),provider:profiles!provider_id(display_name),milestones(*)',
    )
    .eq('id', id)
    .single()
  if (!data) return null

  const contract = data as unknown as ContractWithRelations

  const { data: thread } = await supabase
    .from('threads')
    .select('id')
    .eq('job_id', contract.job_id)
    .eq('client_id', contract.client_id)
    .eq('provider_id', contract.provider_id)
    .maybeSingle()

  return { contract, threadId: thread?.id ?? null }
}
