import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, MilestoneStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney, timeAgo } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import type { Contract, Milestone } from '@/lib/database.types'

export type ContractWithRelations = Contract & {
  jobs: { title: string } | null
  client: { display_name: string } | null
  provider: { display_name: string } | null
  milestones: Milestone[]
}

export function ContractView({
  contract,
  threadId,
  viewer,
}: {
  contract: ContractWithRelations
  threadId: string | null
  viewer: 'client' | 'provider'
}) {
  const milestones = [...(contract.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const total = milestones.reduce((s, m) => s + Number(m.amount), 0)
  const released = milestones.filter((m) => m.status === 'released').reduce((s, m) => s + Number(m.amount), 0)
  const funded = milestones
    .filter((m) => m.status === 'funded' || m.status === 'submitted')
    .reduce((s, m) => s + Number(m.amount), 0)

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h1 className="text-2xl font-bold">{contract.jobs?.title ?? 'Contract'}</h1>
                <p className="text-sm text-[var(--color-fg-muted)] mt-1">
                  {contract.client?.display_name} ↔ {contract.provider?.display_name} · started{' '}
                  {timeAgo(contract.created_at)}
                </p>
              </div>
              <Badge tone={contract.status === 'completed' ? 'success' : contract.status === 'cancelled' ? 'danger' : 'brand'}>
                {contract.status}
              </Badge>
            </div>
            {contract.terms && (
              <p className="text-sm whitespace-pre-wrap text-[var(--color-fg-muted)]">{contract.terms}</p>
            )}
            {threadId && (
              <Link href={`/messages/${threadId}`} className="mt-4 inline-block">
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4" /> Open message thread
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Milestones (escrow)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)]">
                No milestones yet.
                {viewer === 'client' && ' Add milestones to fund the work in stages.'}
              </p>
            ) : (
              milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{m.title}</p>
                      <MilestoneStatusBadge status={m.status} />
                    </div>
                    {m.description && (
                      <p className="text-xs text-[var(--color-fg-muted)] truncate">{m.description}</p>
                    )}
                  </div>
                  <span className="font-semibold shrink-0">{formatMoney(m.amount)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Payment summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Agreed amount" value={formatMoney(contract.agreed_amount)} />
            <Row label="Milestone total" value={formatMoney(total)} />
            <Row label="In escrow" value={formatMoney(funded)} />
            <Row label="Released" value={formatMoney(released)} strong />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[var(--color-fg-muted)]">{label}</span>
      <span className={strong ? 'font-semibold' : ''}>{value}</span>
    </div>
  )
}
