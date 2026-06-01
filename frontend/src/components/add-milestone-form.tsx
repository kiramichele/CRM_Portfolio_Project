'use client'

import { useActionState, useState } from 'react'
import { addMilestoneAction, type MilestoneState } from '@/lib/actions/milestones'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Label } from '@/components/ui/field'
import { Plus } from 'lucide-react'

export function AddMilestoneForm({ contractId }: { contractId: string }) {
  const action = addMilestoneAction.bind(null, contractId)
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(action, null)
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add milestone
      </Button>
    )
  }

  return (
    <form
      action={(fd) => {
        formAction(fd)
      }}
      className="space-y-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3"
    >
      <div className="grid sm:grid-cols-[1fr_8rem] gap-3">
        <div>
          <Label htmlFor="ms-title">Title</Label>
          <Input id="ms-title" name="title" required placeholder="e.g. Milestone 1: Design" />
        </div>
        <div>
          <Label htmlFor="ms-amount">Amount ($)</Label>
          <Input id="ms-amount" name="amount" type="number" min="1" step="1" required placeholder="0" />
        </div>
      </div>
      <div>
        <Label htmlFor="ms-desc">Description (optional)</Label>
        <Textarea id="ms-desc" name="description" rows={2} placeholder="What's delivered in this milestone?" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Adding…' : 'Add milestone'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
