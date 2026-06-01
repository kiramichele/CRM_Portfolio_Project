/** Tiny client for the FastAPI AI service (browser → service, CORS-allowed). */

// Strip trailing slashes so `${BASE}/ai/...` can't become a 404-ing `//ai/...`.
const BASE = (process.env.NEXT_PUBLIC_AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

export class AiError extends Error {}

export async function aiFetch<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiError('AI service unreachable. Is it running on ' + BASE + '?')
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => null)
    throw new AiError(detail?.detail ?? `AI request failed (${res.status}).`)
  }
  return res.json() as Promise<T>
}

// --- response shapes (mirror ai-service/app/specs.py) ----------------------
export type JobDraft = {
  title: string
  description: string
  budget_type: 'fixed' | 'hourly'
  budget_min: number | null
  budget_max: number | null
  category_slug: string | null
  tips: string[]
}

export type MatchScore = { score: number; rationale: string }

export type SearchFilters = {
  keywords: string | null
  min_budget: number | null
  max_budget: number | null
  budget_type: 'fixed' | 'hourly' | null
  remote: boolean | null
  category_slug: string | null
}
