import * as React from 'react'
import { cn } from '@/lib/utils'
import type { ApplicationStatus, JobStatus, MilestoneStatus } from '@/lib/database.types'

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-[var(--color-muted)] text-[var(--color-fg-muted)]',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-sky-50 text-sky-700',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}

const jobTone: Record<JobStatus, Tone> = {
  draft: 'neutral',
  open: 'success',
  in_review: 'info',
  awarded: 'brand',
  in_progress: 'brand',
  completed: 'success',
  closed: 'neutral',
}

const jobLabel: Record<JobStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  in_review: 'In review',
  awarded: 'Awarded',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={jobTone[status]}>{jobLabel[status]}</Badge>
}

const appTone: Record<ApplicationStatus, Tone> = {
  submitted: 'neutral',
  shortlisted: 'info',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'neutral',
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={appTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>
}

const msTone: Record<MilestoneStatus, Tone> = {
  pending: 'neutral',
  funded: 'info',
  submitted: 'warning',
  released: 'success',
  cancelled: 'danger',
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return <Badge tone={msTone[status]}>{status[0].toUpperCase() + status.slice(1)}</Badge>
}
