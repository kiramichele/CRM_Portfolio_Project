import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProfile, homePathForRole } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { JobCard, type JobCardData } from '@/components/job-card'
import { Card } from '@/components/ui/card'
import { NlSearch } from '@/components/ai/nl-search'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function JobBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string; type?: string }>
}) {
  const { q, category, min, max, type } = await searchParams
  const profile = await getProfile()
  const supabase = await createClient()

  const { data: categories } = await supabase.from('categories').select('id,slug,name').order('name')

  let query = supabase
    .from('jobs')
    .select('id,title,description,budget_type,budget_min,budget_max,status,created_at,category_id,categories(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  if (category) {
    const cat = (categories ?? []).find((c) => c.slug === category)
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (min) query = query.gte('budget_max', Number(min)) // job can pay at least `min`
  if (max) query = query.lte('budget_min', Number(max))
  if (type === 'fixed' || type === 'hourly') query = query.eq('budget_type', type)

  const { data: jobs } = await query
  const list = (jobs as unknown as JobCardData[]) ?? []

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">ServiceHub</Link>
          <nav className="flex items-center gap-2">
            {profile ? (
              <Link href={homePathForRole(profile.role)}>
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
                <Link href="/signup"><Button size="sm">Get started</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-1">Find work</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mb-6">
          {list.length} open job{list.length === 1 ? '' : 's'}
        </p>

        {/* AI natural-language search */}
        <NlSearch categories={(categories ?? []).map((c) => ({ slug: c.slug }))} />

        {/* Plain search (GET form — no JS needed) */}
        <form className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-muted)]" />
            <Input
              name="q"
              defaultValue={q ?? ''}
              placeholder="Search jobs…"
              className="pl-9"
            />
          </div>
          {category && <input type="hidden" name="category" value={category} />}
          <Button type="submit">Search</Button>
        </form>

        {/* Category chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          <CategoryChip label="All" href={q ? `/jobs?q=${encodeURIComponent(q)}` : '/jobs'} active={!category} />
          {(categories ?? []).map((c) => {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            params.set('category', c.slug)
            return (
              <CategoryChip
                key={c.id}
                label={c.name}
                href={`/jobs?${params.toString()}`}
                active={category === c.slug}
              />
            )
          })}
        </div>

        {list.length === 0 ? (
          <Card className="p-12 text-center text-sm text-[var(--color-fg-muted)]">
            No open jobs match your search.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((job) => (
              <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full px-3 py-1 text-sm border transition-colors',
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700'
          : 'border-[var(--color-border)] text-[var(--color-fg-muted)] hover:bg-[var(--color-muted)]',
      )}
    >
      {label}
    </Link>
  )
}
