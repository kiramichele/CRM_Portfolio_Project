import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/ui/badge'
import { formatBudget, timeAgo } from '@/lib/utils'
import { PlusCircle } from 'lucide-react'
import type { Job } from '@/lib/database.types'

type JobRow = Job & { applications: { count: number }[] }

export default async function ClientJobsPage() {
  const ctx = await requirePortal('client')
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('*,applications(count)')
    .eq('client_id', ctx.effectiveUserId)
    .order('created_at', { ascending: false })

  const jobs = (data as unknown as JobRow[]) ?? []

  return (
    <div>
      <PageHeader
        title="My jobs"
        subtitle={`${jobs.length} job${jobs.length === 1 ? '' : 's'}`}
        action={
          <Link href="/client/jobs/new">
            <Button>
              <PlusCircle className="h-4 w-4" /> Post a job
            </Button>
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-[var(--color-fg-muted)] mb-4">No jobs yet.</p>
          <Link href="/client/jobs/new">
            <Button>Post your first job</Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--color-border)]">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/client/jobs/${job.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{job.title}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  {formatBudget(job.budget_min, job.budget_max, job.budget_type)} · {timeAgo(job.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-[var(--color-fg-muted)]">
                  {job.applications?.[0]?.count ?? 0} applicants
                </span>
                <JobStatusBadge status={job.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
