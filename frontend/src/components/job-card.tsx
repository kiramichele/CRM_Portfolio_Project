import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { JobStatusBadge, Badge } from '@/components/ui/badge'
import { formatBudget, timeAgo } from '@/lib/utils'
import type { Job, JobStatus } from '@/lib/database.types'

export type JobCardData = Pick<
  Job,
  'id' | 'title' | 'description' | 'budget_type' | 'budget_min' | 'budget_max' | 'status' | 'created_at'
> & {
  categories?: { name: string } | null
  applicationCount?: number
}

export function JobCard({
  job,
  href,
  showStatus = false,
}: {
  job: JobCardData
  href: string
  showStatus?: boolean
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-5 h-full transition-shadow hover:shadow-md hover:border-brand-200">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold leading-snug group-hover:text-brand-700">{job.title}</h3>
          {showStatus && <JobStatusBadge status={job.status as JobStatus} />}
        </div>
        <p className="text-sm text-[var(--color-fg-muted)] line-clamp-2 mb-4">{job.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {job.categories?.name && <Badge tone="brand">{job.categories.name}</Badge>}
          <Badge>{formatBudget(job.budget_min, job.budget_max, job.budget_type)}</Badge>
          {job.applicationCount !== undefined && (
            <Badge tone="info">
              {job.applicationCount} applicant{job.applicationCount === 1 ? '' : 's'}
            </Badge>
          )}
          <span className="ml-auto text-[var(--color-fg-muted)]">{timeAgo(job.created_at)}</span>
        </div>
      </Card>
    </Link>
  )
}
