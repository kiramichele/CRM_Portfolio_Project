'use client'

import { useState, useTransition } from 'react'
import { setApplicationStatusAction, awardJobAction } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Star, Award, X, Loader2 } from 'lucide-react'
import type { ApplicationStatus } from '@/lib/database.types'

export function ApplicantActions({
  applicationId,
  jobId,
  status,
}: {
  applicationId: string
  jobId: string
  status: ApplicationStatus
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  if (status === 'accepted') return <Button size="sm" variant="outline" disabled>Awarded</Button>
  if (status === 'rejected') return <span className="text-xs text-[var(--color-fg-muted)]">Rejected</span>
  if (status === 'withdrawn') return <span className="text-xs text-[var(--color-fg-muted)]">Withdrawn</span>

  const award = () =>
    start(async () => {
      const res = await awardJobAction(applicationId, jobId)
      if (res?.error) setErr(res.error)
    })

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {pending && <Loader2 className="h-4 w-4 animate-spin text-brand-600" />}
        {status !== 'shortlisted' && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => start(() => setApplicationStatusAction(applicationId, 'shortlisted', jobId))}
          >
            <Star className="h-4 w-4" /> Shortlist
          </Button>
        )}
        <Button size="sm" disabled={pending} onClick={award}>
          <Award className="h-4 w-4" /> Award
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => start(() => setApplicationStatusAction(applicationId, 'rejected', jobId))}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {err && <p className="text-xs text-danger max-w-xs text-right">{err}</p>}
    </div>
  )
}
