'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { aiFetch, AiError, type SearchFilters } from '@/lib/ai'
import { Input } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'

export function NlSearch({ categories }: { categories: { slug: string }[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function run() {
    if (!query.trim()) return
    setPending(true)
    setErr(null)
    try {
      const f = await aiFetch<SearchFilters>('/ai/search/parse', {
        query,
        categories: categories.map((c) => c.slug),
      })
      const params = new URLSearchParams()
      const kw = [f.keywords, f.remote ? 'remote' : null].filter(Boolean).join(' ').trim()
      if (kw) params.set('q', kw)
      if (f.category_slug) params.set('category', f.category_slug)
      if (f.min_budget != null) params.set('min', String(f.min_budget))
      if (f.max_budget != null) params.set('max', String(f.max_budget))
      if (f.budget_type) params.set('type', f.budget_type)
      router.push(`/jobs?${params.toString()}`)
    } catch (e) {
      setErr(e instanceof AiError ? e.message : 'Something went wrong.')
      setPending(false)
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-brand-200 bg-brand-50/40 p-3 mb-4">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-brand-600" /> Search in plain English
      </div>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder='e.g. "remote python work over $2k"'
        />
        <Button onClick={run} disabled={pending || !query.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>
      {err && <p className="text-xs text-danger mt-2">{err}</p>}
    </div>
  )
}
