import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { JobStatusBadge, Badge } from '@/components/ui/badge'
import { JobTimeline } from '@/components/job-timeline'
import { ApplyForm } from '@/components/apply-form'
import { MatchFit } from '@/components/ai/match-fit'
import { Attachments } from '@/components/attachments'
import { formatBudget, timeAgo } from '@/lib/utils'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { Job, JobEvent } from '@/lib/database.types'

type JobDetail = Job & { categories: { name: string } | null }

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const ctx = await getEffectiveContext()

  const { data: job } = await supabase
    .from('jobs')
    .select('*,categories(name)')
    .eq('id', id)
    .single()
  if (!job) notFound()
  const j = job as unknown as JobDetail

  const { data: events } = await supabase
    .from('job_events')
    .select('*')
    .eq('job_id', id)
    .order('created_at', { ascending: true })

  // Has the current provider already applied?
  let alreadyApplied = false
  if (ctx?.effectiveRole === 'provider') {
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', id)
      .eq('provider_id', ctx.effectiveUserId)
      .maybeSingle()
    alreadyApplied = !!existing
  }

  const isOwner = ctx?.effectiveRole === 'client' && ctx.effectiveUserId === j.client_id
  const backHref = ctx?.effectiveRole === 'provider' ? '/jobs' : '/jobs'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-2xl font-bold">{j.title}</h1>
                <JobStatusBadge status={j.status} />
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {j.categories?.name && <Badge tone="brand">{j.categories.name}</Badge>}
                <Badge>{formatBudget(j.budget_min, j.budget_max, j.budget_type)}</Badge>
                <Badge tone="neutral">Posted {timeAgo(j.created_at)}</Badge>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-[var(--color-fg)]">
                {j.description}
              </div>
              <div className="mt-5">
                <Attachments entityType="job" entityId={j.id} compact />
              </div>
            </CardContent>
          </Card>

          {/* Apply / status panel */}
          {isOwner ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-between">
                <p className="text-sm text-[var(--color-fg-muted)]">This is your job posting.</p>
                <Link href={`/client/jobs/${j.id}`}>
                  <Button>Manage applicants</Button>
                </Link>
              </CardContent>
            </Card>
          ) : ctx?.effectiveRole === 'provider' ? (
            <>
              <Card>
                <CardContent className="pt-6">
                  <MatchFit
                    job={{
                      title: j.title,
                      description: j.description,
                      category: j.categories?.name ?? null,
                      budget_type: j.budget_type,
                      budget_min: j.budget_min,
                      budget_max: j.budget_max,
                    }}
                    provider={{
                      display_name: ctx.effectiveProfile.display_name,
                      headline: ctx.effectiveProfile.headline,
                      bio: ctx.effectiveProfile.bio,
                      skills: ctx.effectiveProfile.skills,
                      hourly_rate: ctx.effectiveProfile.hourly_rate,
                      location: ctx.effectiveProfile.location,
                    }}
                  />
                </CardContent>
              </Card>
            {alreadyApplied ? (
              <Card>
                <CardContent className="pt-6 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  You&apos;ve applied to this job. Track it in{' '}
                  <Link href="/provider/applications" className="text-brand-700 font-medium">
                    My applications
                  </Link>
                  .
                </CardContent>
              </Card>
            ) : j.status === 'open' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Apply to this job</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApplyForm jobId={j.id} budgetType={j.budget_type} />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-sm text-[var(--color-fg-muted)]">
                  This job is no longer accepting applications.
                </CardContent>
              </Card>
            )}
            </>
          ) : !ctx ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-between">
                <p className="text-sm text-[var(--color-fg-muted)]">Sign in as a provider to apply.</p>
                <Link href="/login">
                  <Button>Sign in</Button>
                </Link>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Timeline */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <JobTimeline events={(events as JobEvent[]) ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
