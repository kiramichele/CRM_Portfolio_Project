import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ApplicationStatusBadge } from '@/components/ui/badge'
import { formatMoney, timeAgo } from '@/lib/utils'
import type { Application } from '@/lib/database.types'

type Row = Application & { jobs: { id: string; title: string; status: string } | null }

export default async function ProviderApplicationsPage() {
  const ctx = await requirePortal('provider')
  const supabase = await createClient()
  const { data } = await supabase
    .from('applications')
    .select('*,jobs(id,title,status)')
    .eq('provider_id', ctx.effectiveUserId)
    .order('created_at', { ascending: false })

  const apps = (data as unknown as Row[]) ?? []

  return (
    <div>
      <PageHeader
        title="My applications"
        subtitle={`${apps.length} application${apps.length === 1 ? '' : 's'}`}
        action={
          <Link href="/jobs">
            <Button>Find more work</Button>
          </Link>
        }
      />

      {apps.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-[var(--color-fg-muted)] mb-4">You haven&apos;t applied yet.</p>
          <Link href="/jobs">
            <Button>Browse the job board</Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--color-border)]">
          {apps.map((a) => (
            <Link
              key={a.id}
              href={a.jobs ? `/jobs/${a.jobs.id}` : '#'}
              className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{a.jobs?.title ?? 'Job'}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  Bid {formatMoney(a.bid_amount)} · applied {timeAgo(a.created_at)}
                </p>
              </div>
              <ApplicationStatusBadge status={a.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
