import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatMoney, timeAgo } from '@/lib/utils'
import type { Contract } from '@/lib/database.types'

export type ContractListRow = Pick<
  Contract,
  'id' | 'status' | 'agreed_amount' | 'created_at'
> & {
  jobs: { title: string } | null
  counterparty: string
}

export function ContractsList({ rows, basePath }: { rows: ContractListRow[]; basePath: string }) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 text-center text-sm text-[var(--color-fg-muted)]">
        No contracts yet. They appear here once a job is awarded.
      </Card>
    )
  }
  return (
    <Card className="divide-y divide-[var(--color-border)]">
      {rows.map((c) => (
        <Link
          key={c.id}
          href={`${basePath}/${c.id}`}
          className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
        >
          <div className="min-w-0">
            <p className="font-medium truncate">{c.jobs?.title ?? 'Contract'}</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {c.counterparty} · {formatMoney(c.agreed_amount)} · {timeAgo(c.created_at)}
            </p>
          </div>
          <Badge tone={c.status === 'completed' ? 'success' : c.status === 'cancelled' ? 'danger' : 'brand'}>
            {c.status}
          </Badge>
        </Link>
      ))}
    </Card>
  )
}
