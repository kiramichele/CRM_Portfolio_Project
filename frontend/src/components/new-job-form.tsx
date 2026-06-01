'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { createJobAction, type ActionState } from '@/lib/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Label } from '@/components/ui/field'

type Category = { id: number; name: string }

function SubmitButtons() {
  const { pending } = useFormStatus()
  return (
    <div className="flex gap-2">
      <Button type="submit" name="publish" value="true" disabled={pending}>
        {pending ? 'Saving…' : 'Publish job'}
      </Button>
      <Button type="submit" name="publish" value="false" variant="outline" disabled={pending}>
        Save as draft
      </Button>
    </div>
  )
}

export function NewJobForm({ categories }: { categories: Category[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createJobAction, null)

  return (
    <form action={action} className="space-y-5">
      <div>
        <Label htmlFor="title">Job title</Label>
        <Input id="title" name="title" required placeholder="e.g. Build a customer dashboard in Next.js" />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={8}
          required
          placeholder="Describe the work, deliverables, and what a great applicant looks like…"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category_id">Category</Label>
          <Select id="category_id" name="category_id" defaultValue="">
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="budget_type">Budget type</Label>
          <Select id="budget_type" name="budget_type" defaultValue="fixed">
            <option value="fixed">Fixed price</option>
            <option value="hourly">Hourly</option>
          </Select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="budget_min">Budget min</Label>
          <Input id="budget_min" name="budget_min" type="number" min="0" step="1" placeholder="0" />
        </div>
        <div>
          <Label htmlFor="budget_max">Budget max</Label>
          <Input id="budget_max" name="budget_max" type="number" min="0" step="1" placeholder="0" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButtons />
    </form>
  )
}
