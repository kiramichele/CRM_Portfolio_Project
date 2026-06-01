'use client'

import { useState } from 'react'
import { aiFetch, AiError } from '@/lib/ai'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

type Provider = {
  display_name?: string | null
  headline?: string | null
  bio?: string | null
  skills?: string[]
  hourly_rate?: number | null
  location?: string | null
}
type Gaps = { summary: string; suggestions: { title: string; detail: string }[] }

export function ProfileGapsPanel({
  provider,
  inDemandSkills,
}: {
  provider: Provider
  inDemandSkills: string[]
}) {
  const [res, setRes] = useState<Gaps | null>(null)
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setErr(null)
    try {
      setRes(await aiFetch<Gaps>('/ai/profile-gaps', { provider, in_demand_skills: inDemandSkills }))
    } catch (e) {
      setErr(e instanceof AiError ? e.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Improve your profile</h2>
        </div>
        {!res && (
          <Button size="sm" variant="outline" onClick={run} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get AI tips'}
          </Button>
        )}
      </div>
      <p className="text-sm text-[var(--color-fg-muted)]">
        AI review of your profile against what wins work on the platform.
      </p>
      {err && <p className="text-sm text-danger mt-2">{err}</p>}

      {res && (
        <div className="mt-3 space-y-3">
          <p className="text-sm">{res.summary}</p>
          <ul className="space-y-2">
            {res.suggestions.map((s, i) => (
              <li key={i} className="rounded-md bg-[var(--color-muted)] p-3">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">{s.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
