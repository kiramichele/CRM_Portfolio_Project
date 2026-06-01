import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requirePortal } from '@/lib/auth'
import { fetchContract } from '@/lib/data'
import { ContractView } from '@/components/contract-view'
import { ArrowLeft } from 'lucide-react'

export default async function ProviderContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requirePortal('provider')
  const result = await fetchContract(id)
  if (!result) notFound()
  if (result.contract.provider_id !== ctx.effectiveUserId) redirect('/provider/contracts')

  return (
    <div>
      <Link
        href="/provider/contracts"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Contracts
      </Link>
      <ContractView
        contract={result.contract}
        threadId={result.threadId}
        viewer="provider"
        canAct={!ctx.isImpersonating}
      />
    </div>
  )
}
