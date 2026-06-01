import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProfile, homePathForRole } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { JobCard, type JobCardData } from '@/components/job-card'
import { DemoLogin } from '@/components/demo-login'
import { ArrowRight, Briefcase, ShieldCheck, Sparkles } from 'lucide-react'

export default async function LandingPage() {
  const profile = await getProfile()

  let jobs: JobCardData[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('jobs')
      .select('id,title,description,budget_type,budget_min,budget_max,status,created_at,categories(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6)
    jobs = (data as unknown as JobCardData[]) ?? []
  } catch {
    // Env not configured yet — show the page without live jobs.
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-brand-700">
            ServiceHub
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/jobs">
              <Button variant="ghost" size="sm">Browse jobs</Button>
            </Link>
            {profile ? (
              <Link href={homePathForRole(profile.role)}>
                <Button size="sm">Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 mb-6">
          <Sparkles className="h-4 w-4" /> AI-assisted matching & proposals
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
          The marketplace CRM where work gets done.
        </h1>
        <p className="mt-5 text-lg text-[var(--color-fg-muted)] max-w-xl mx-auto">
          Post jobs, hire vetted providers, and manage every engagement — with escrow
          milestones, live messaging, and AI that scores the fit.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/jobs">
            <Button size="lg" variant="outline">Browse the job board</Button>
          </Link>
        </div>

        {/* One-click demo — no account needed */}
        <div className="mt-12 max-w-3xl mx-auto">
          <p className="text-sm font-medium text-[var(--color-fg-muted)] mb-3">
            Reviewing this portfolio? Jump straight in — no sign-up:
          </p>
          <DemoLogin variant="card" />
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
          {[
            { icon: Briefcase, title: 'Three portals', body: 'Client, provider, and admin — each with a tailored workflow.' },
            { icon: ShieldCheck, title: 'Escrow milestones', body: 'Fund work upfront and release on delivery (Stripe test mode).' },
            { icon: Sparkles, title: 'AI throughout', body: 'Match scores, applicant ranking, and natural-language search.' },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <Icon className="h-6 w-6 text-brand-600 mb-2" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-[var(--color-fg-muted)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open jobs */}
      {jobs.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold">Latest open jobs</h2>
            <Link href="/jobs" className="text-sm text-brand-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-[var(--color-border)] py-8 text-center text-sm text-[var(--color-fg-muted)]">
        ServiceHub — a portfolio project.
      </footer>
    </div>
  )
}
