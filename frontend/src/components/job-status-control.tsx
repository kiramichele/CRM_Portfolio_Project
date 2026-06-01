'use client'

import { useTransition } from 'react'
import { updateJobStatusAction } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import type { JobStatus } from '@/lib/database.types'

export function JobStatusControl({ jobId, status }: { jobId: string; status: JobStatus }) {
  const [pending, start] = useTransition()
  const go = (s: string) => start(() => updateJobStatusAction(jobId, s))

  if (status === 'draft')
    return (
      <Button size="sm" disabled={pending} onClick={() => go('open')}>
        Publish job
      </Button>
    )
  if (status === 'open')
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go('in_review')}>
        Move to review
      </Button>
    )
  if (status === 'in_review')
    return (
      <Button size="sm" variant="outline" disabled={pending} onClick={() => go('open')}>
        Reopen for applications
      </Button>
    )
  return null
}
