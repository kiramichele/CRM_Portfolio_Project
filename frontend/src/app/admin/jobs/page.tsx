import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/ui/badge'
import { formatBudget, timeAgo } from '@/lib/utils'
import type { Job } from '@/lib/database.types'

type Row = Job & {
  client: { display_name: string } | null
  categories: { name: string } | null
}

export default async function AdminJobsPage() {
  await requirePortal('admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('*,client:profiles!client_id(display_name),categories(name)')
    .order('created_at', { ascending: false })
  const jobs = (data as unknown as Row[]) ?? []

  return (
    <div>
      <PageHeader title="Jobs" subtitle={`${jobs.length} jobs across the platform`} />
      <Card className="divide-y divide-[var(--color-border)]">
        {jobs.map((j) => (
          <Link
            key={j.id}
            href={`/jobs/${j.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{j.title}</p>
              <p className="text-xs text-[var(--color-fg-muted)]">
                {j.client?.display_name ?? 'Client'} · {j.categories?.name ?? 'Uncategorized'} ·{' '}
                {formatBudget(j.budget_min, j.budget_max, j.budget_type)} · {timeAgo(j.created_at)}
              </p>
            </div>
            <JobStatusBadge status={j.status} />
          </Link>
        ))}
      </Card>
    </div>
  )
}
