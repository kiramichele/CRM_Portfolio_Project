import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { ContractsList, type ContractListRow } from '@/components/contracts-list'

export default async function ClientContractsPage() {
  const ctx = await requirePortal('client')
  const supabase = await createClient()
  const { data } = await supabase
    .from('contracts')
    .select('id,status,agreed_amount,created_at,jobs(title),provider:profiles!provider_id(display_name)')
    .eq('client_id', ctx.effectiveUserId)
    .order('created_at', { ascending: false })

  const rows: ContractListRow[] = ((data as unknown as Array<ContractListRow & { provider: { display_name: string } | null }>) ?? []).map(
    (c) => ({ ...c, counterparty: c.provider?.display_name ?? 'Provider' }),
  )

  return (
    <div>
      <PageHeader title="Contracts" subtitle={`${rows.length} contract${rows.length === 1 ? '' : 's'}`} />
      <ContractsList rows={rows} basePath="/client/contracts" />
    </div>
  )
}
