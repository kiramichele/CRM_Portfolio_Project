'use client'

import { useState, useTransition } from 'react'
import {
  fundMilestoneAction,
  submitMilestoneAction,
  releaseMilestoneAction,
} from '@/lib/actions/milestones'
import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, Upload, CheckCircle2 } from 'lucide-react'
import type { MilestoneStatus } from '@/lib/database.types'

export function MilestoneActions({
  milestoneId,
  status,
  viewer,
  canAct,
}: {
  milestoneId: string
  status: MilestoneStatus
  viewer: 'client' | 'provider'
  canAct: boolean
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string } | null>) =>
    start(async () => {
      const res = await fn()
      if (res?.error) setErr(res.error)
    })

  if (!canAct) {
    return status === 'pending' ? (
      <span className="text-xs text-[var(--color-fg-muted)]">Awaiting funding</span>
    ) : null
  }

  let button: React.ReactNode = null

  if (viewer === 'client') {
    if (status === 'pending') {
      button = (
        <Button size="sm" disabled={pending} onClick={() => run(() => fundMilestoneAction(milestoneId))}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Fund
        </Button>
      )
    } else if (status === 'funded' || status === 'submitted') {
      button = (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run(() => releaseMilestoneAction(milestoneId))}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Release
        </Button>
      )
    }
  } else {
    // provider
    if (status === 'funded') {
      button = (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => submitMilestoneAction(milestoneId))}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Submit work
        </Button>
      )
    } else if (status === 'submitted') {
      button = <span className="text-xs text-[var(--color-fg-muted)]">Awaiting release</span>
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {button}
      {err && <p className="text-xs text-danger max-w-[12rem] text-right">{err}</p>}
    </div>
  )
}
