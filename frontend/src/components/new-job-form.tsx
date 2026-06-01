'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { createJobAction, type ActionState } from '@/lib/actions/jobs'
import { aiFetch, AiError, type JobDraft } from '@/lib/ai'
import { Button } from '@/components/ui/button'
import { Input, Textarea, Select, Label } from '@/components/ui/field'
import { Card } from '@/components/ui/card'
import { Sparkles, Loader2 } from 'lucide-react'

type Category = { id: number; name: string; slug: string }

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

  // Controlled so the AI assistant can populate the fields.
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [budgetType, setBudgetType] = useState<'fixed' | 'hourly'>('fixed')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')

  // AI draft panel
  const [brief, setBrief] = useState('')
  const [aiPending, setAiPending] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [tips, setTips] = useState<string[]>([])

  async function draftWithAI() {
    if (!brief.trim()) return
    setAiPending(true)
    setAiError(null)
    setTips([])
    try {
      const draft = await aiFetch<JobDraft>('/ai/job-assistant', {
        brief,
        categories: categories.map((c) => c.slug),
      })
      setTitle(draft.title)
      setDescription(draft.description)
      setBudgetType(draft.budget_type)
      setBudgetMin(draft.budget_min != null ? String(draft.budget_min) : '')
      setBudgetMax(draft.budget_max != null ? String(draft.budget_max) : '')
      const cat = categories.find((c) => c.slug === draft.category_slug)
      if (cat) setCategoryId(String(cat.id))
      setTips(draft.tips ?? [])
    } catch (e) {
      setAiError(e instanceof AiError ? e.message : 'Something went wrong.')
    } finally {
      setAiPending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* AI draft assistant */}
      <Card className="p-5 border-brand-200 bg-brand-50/40">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-sm">Draft with AI</h2>
        </div>
        <p className="text-xs text-[var(--color-fg-muted)] mb-3">
          Describe the work in a sentence or two and we&apos;ll draft a polished posting you can edit.
        </p>
        <Textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={2}
          placeholder="e.g. Need a React dev to build a customer dashboard with charts, ~3 weeks, $5k budget"
        />
        {aiError && <p className="text-xs text-danger mt-2">{aiError}</p>}
        <div className="mt-3">
          <Button type="button" size="sm" onClick={draftWithAI} disabled={aiPending || !brief.trim()}>
            {aiPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiPending ? 'Drafting…' : 'Generate draft'}
          </Button>
        </div>
        {tips.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-[var(--color-fg-muted)] list-disc pl-4">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </Card>

      <form action={action} className="space-y-5">
        <div>
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Build a customer dashboard in Next.js"
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={8}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the work, deliverables, and what a great applicant looks like…"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="category_id">Category</Label>
            <Select
              id="category_id"
              name="category_id"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
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
            <Select
              id="budget_type"
              name="budget_type"
              value={budgetType}
              onChange={(e) => setBudgetType(e.target.value as 'fixed' | 'hourly')}
            >
              <option value="fixed">Fixed price</option>
              <option value="hourly">Hourly</option>
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget_min">Budget min</Label>
            <Input
              id="budget_min"
              name="budget_min"
              type="number"
              min="0"
              step="1"
              value={budgetMin}
              onChange={(e) => setBudgetMin(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="budget_max">Budget max</Label>
            <Input
              id="budget_max"
              name="budget_max"
              type="number"
              min="0"
              step="1"
              value={budgetMax}
              onChange={(e) => setBudgetMax(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <SubmitButtons />
      </form>
    </div>
  )
}
