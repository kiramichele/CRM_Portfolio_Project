'use client'

import { useState } from 'react'
import { aiFetch, AiError } from '@/lib/ai'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, ListOrdered, Trophy } from 'lucide-react'

type JobLite = {
  title: string
  description: string
  category?: string | null
  budget_type?: string | null
  budget_min?: number | null
  budget_max?: number | null
}
type Applicant = {
  id: string
  name?: string | null
  headline?: string | null
  skills?: string[]
  bid_amount?: number | null
  cover_note?: string | null
}

type Ranking = { ranking: { id: string; score: number; summary: string }[]; overview: string }
type Shortlist = {
  picks: { id: string; name?: string; why: string }[]
  comparison: string
  recommendation: string
}

export function ApplicantAiPanel({ job, applicants }: { job: JobLite; applicants: Applicant[] }) {
  const [mode, setMode] = useState<'rank' | 'shortlist' | null>(null)
  const [pending, setPending] = useState<'rank' | 'shortlist' | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [ranking, setRanking] = useState<Ranking | null>(null)
  const [shortlist, setShortlist] = useState<Shortlist | null>(null)

  const nameOf = (id: string) => applicants.find((a) => a.id === id)?.name ?? 'Applicant'

  async function run(which: 'rank' | 'shortlist') {
    setPending(which)
    setErr(null)
    try {
      const path = which === 'rank' ? '/ai/rank-applicants' : '/ai/shortlist-explainer'
      const payload = { job, applicants }
      if (which === 'rank') setRanking(await aiFetch<Ranking>(path, payload))
      else setShortlist(await aiFetch<Shortlist>(path, payload))
      setMode(which)
    } catch (e) {
      setErr(e instanceof AiError ? e.message : 'Something went wrong.')
    } finally {
      setPending(null)
    }
  }

  return (
    <Card className="p-4 border-brand-200 bg-brand-50/40 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h3 className="font-semibold text-sm">AI applicant review</h3>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => run('rank')} disabled={pending !== null}>
          {pending === 'rank' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
          Rank applicants
        </Button>
        <Button size="sm" variant="outline" onClick={() => run('shortlist')} disabled={pending !== null}>
          {pending === 'shortlist' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
          Explain shortlist
        </Button>
      </div>
      {err && <p className="text-xs text-danger mt-2">{err}</p>}

      {mode === 'rank' && ranking && (
        <div className="mt-3 space-y-2">
          <p className="text-sm text-[var(--color-fg-muted)]">{ranking.overview}</p>
          {[...ranking.ranking]
            .sort((a, b) => b.score - a.score)
            .map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-md bg-[var(--color-surface)] p-2.5">
                <Badge tone="info" className="shrink-0">{r.score}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{nameOf(r.id)}</p>
                  <p className="text-xs text-[var(--color-fg-muted)]">{r.summary}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      {mode === 'shortlist' && shortlist && (
        <div className="mt-3 space-y-2">
          {shortlist.picks.map((p, i) => (
            <div key={p.id} className="rounded-md bg-[var(--color-surface)] p-2.5">
              <p className="text-sm font-medium">
                {i + 1}. {p.name ?? nameOf(p.id)}
              </p>
              <p className="text-xs text-[var(--color-fg-muted)]">{p.why}</p>
            </div>
          ))}
          <p className="text-xs text-[var(--color-fg-muted)]">{shortlist.comparison}</p>
          <p className="text-sm font-medium text-brand-700">{shortlist.recommendation}</p>
        </div>
      )}
    </Card>
  )
}
