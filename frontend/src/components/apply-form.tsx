'use client'

import { useActionState } from 'react'
import { applyToJobAction, type ActionState } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/field'

export function ApplyForm({ jobId, budgetType }: { jobId: string; budgetType: 'fixed' | 'hourly' }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(applyToJobAction, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />
      <div>
        <Label htmlFor="bid_amount">
          Your bid {budgetType === 'hourly' ? '(hourly rate)' : '(fixed price)'}
        </Label>
        <Input id="bid_amount" name="bid_amount" type="number" min="0" step="1" placeholder="0" />
      </div>
      <div>
        <Label htmlFor="cover_note">Cover note</Label>
        <Textarea
          id="cover_note"
          name="cover_note"
          rows={5}
          placeholder="Introduce yourself and explain why you're a great fit…"
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit application'}
      </Button>
    </form>
  )
}
