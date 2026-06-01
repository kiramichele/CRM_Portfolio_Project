import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobStatusBadge, ApplicationStatusBadge, Badge } from '@/components/ui/badge'
import { JobTimeline } from '@/components/job-timeline'
import { ApplicantActions } from '@/components/applicant-actions'
import { JobStatusControl } from '@/components/job-status-control'
import { formatBudget, formatMoney, timeAgo } from '@/lib/utils'
import { ArrowLeft, Eye } from 'lucide-react'
import type { Job, JobEvent, Application, Profile } from '@/lib/database.types'

type ApplicantRow = Application & {
  provider: Pick<Profile, 'id' | 'display_name' | 'headline' | 'skills' | 'location' | 'hourly_rate'> | null
}

export default async function ManageJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requirePortal('client')
  const supabase = await createClient()

  const { data: job } = await supabase.from('jobs').select('*,categories(name)').eq('id', id).single()
  if (!job) notFound()
  const j = job as unknown as Job & { categories: { name: string } | null }
  if (j.client_id !== ctx.effectiveUserId) redirect('/client/jobs')

  const [{ data: apps }, { data: events }] = await Promise.all([
    supabase
      .from('applications')
      .select('*,provider:profiles!provider_id(id,display_name,headline,skills,location,hourly_rate)')
      .eq('job_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('job_events').select('*').eq('job_id', id).order('created_at', { ascending: true }),
  ])

  const applicants = (apps as unknown as ApplicantRow[]) ?? []

  return (
    <div>
      <Link
        href="/client/jobs"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> My jobs
      </Link>

      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-2xl font-bold">{j.title}</h1>
        <JobStatusBadge status={j.status} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {j.categories?.name && <Badge tone="brand">{j.categories.name}</Badge>}
        <Badge>{formatBudget(j.budget_min, j.budget_max, j.budget_type)}</Badge>
        <Badge tone="neutral">Posted {timeAgo(j.created_at)}</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Link href={`/jobs/${j.id}`}>
            <span className="inline-flex items-center gap-1 text-sm text-brand-700">
              <Eye className="h-4 w-4" /> Public view
            </span>
          </Link>
          <JobStatusControl jobId={j.id} status={j.status} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Applicants */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold mb-3">
            Applicants <span className="text-[var(--color-fg-muted)]">({applicants.length})</span>
          </h2>
          {applicants.length === 0 ? (
            <Card className="p-10 text-center text-sm text-[var(--color-fg-muted)]">
              No applications yet. Once your job is open, applicants will appear here.
            </Card>
          ) : (
            <div className="space-y-3">
              {applicants.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                        {(a.provider?.display_name ?? '?')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{a.provider?.display_name ?? 'Provider'}</p>
                          <ApplicationStatusBadge status={a.status} />
                        </div>
                        {a.provider?.headline && (
                          <p className="text-xs text-[var(--color-fg-muted)]">{a.provider.headline}</p>
                        )}
                        <p className="text-sm mt-1">
                          Bid <strong>{formatMoney(a.bid_amount)}</strong>
                          {a.provider?.location ? ` · ${a.provider.location}` : ''}
                        </p>
                      </div>
                    </div>
                    {a.ai_match_score != null && (
                      <Badge tone="info" className="shrink-0">
                        {a.ai_match_score}% match
                      </Badge>
                    )}
                  </div>

                  {a.cover_note && (
                    <p className="text-sm text-[var(--color-fg-muted)] mt-3 whitespace-pre-wrap">
                      {a.cover_note}
                    </p>
                  )}
                  {a.provider?.skills && a.provider.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {a.provider.skills.slice(0, 6).map((s) => (
                        <Badge key={s} tone="neutral">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <ApplicantActions applicationId={a.id} jobId={j.id} status={a.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
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
