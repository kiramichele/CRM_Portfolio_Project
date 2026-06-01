'use client'

import { useState } from 'react'
import { aiFetch, AiError } from '@/lib/ai'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

type Answer = { answer: string; highlights: string[] }

export function AnalyticsAsk({
  data,
  suggestions,
}: {
  data: unknown
  suggestions: string[]
}) {
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [res, setRes] = useState<Answer | null>(null)

  async function ask(q: string) {
    if (!q.trim()) return
    setQuestion(q)
    setPending(true)
    setErr(null)
    try {
      setRes(await aiFetch<Answer>('/ai/analytics', { question: q, data }))
    } catch (e) {
      setErr(e instanceof AiError ? e.message : 'Something went wrong.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold">Ask the data</h2>
      </div>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Natural-language analytics over the platform snapshot below.
      </p>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(question)}
          placeholder="e.g. Which categories have the most unfilled jobs?"
        />
        <Button onClick={() => ask(question)} disabled={pending || !question.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ask'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={pending}
            className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-fg-muted)] hover:bg-[var(--color-muted)] disabled:opacity-60"
          >
            {s}
          </button>
        ))}
      </div>

      {err && <p className="text-sm text-danger mt-3">{err}</p>}

      {res && (
        <div className="mt-4 rounded-[var(--radius)] bg-[var(--color-muted)] p-4">
          <p className="text-sm">{res.answer}</p>
          {res.highlights.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-[var(--color-fg-muted)] list-disc pl-4">
              {res.highlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}
