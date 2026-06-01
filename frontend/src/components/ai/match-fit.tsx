'use client'

import { useState } from 'react'
import { aiFetch, AiError, type MatchScore } from '@/lib/ai'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type JobLite = {
  title: string
  description: string
  category?: string | null
  budget_type?: string | null
  budget_min?: number | null
  budget_max?: number | null
}
type ProviderLite = {
  display_name?: string | null
  headline?: string | null
  bio?: string | null
  skills?: string[]
  hourly_rate?: number | null
  location?: string | null
}

export function MatchFit({ job, provider }: { job: JobLite; provider: ProviderLite }) {
  const [res, setRes] = useState<MatchScore | null>(null)
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setErr(null)
    try {
      setRes(await aiFetch<MatchScore>('/ai/match-score', { job, provider }))
    } catch (e) {
      setErr(e instanceof AiError ? e.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  const tone =
    res == null ? '' : res.score >= 75 ? 'text-emerald-600' : res.score >= 50 ? 'text-amber-600' : 'text-red-600'

  return (
    <div>
      {res ? (
        <div className="flex items-start gap-3">
          <div className={cn('text-3xl font-bold tabular-nums', tone)}>{res.score}</div>
          <div>
            <p className="text-sm font-medium">AI fit score</p>
            <p className="text-sm text-[var(--color-fg-muted)]">{res.rationale}</p>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={run} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {pending ? 'Scoring…' : 'Score my fit with AI'}
        </Button>
      )}
      {err && <p className="text-xs text-danger mt-2">{err}</p>}
    </div>
  )
}
