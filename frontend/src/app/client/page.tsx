import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { JobStatusBadge } from '@/components/ui/badge'
import { formatMoney, timeAgo } from '@/lib/utils'
import { Briefcase, Users, FileText, Wallet, PlusCircle, ArrowRight } from 'lucide-react'
import type { Job } from '@/lib/database.types'

type JobRow = Pick<Job, 'id' | 'title' | 'status' | 'created_at'> & {
  applications: { count: number }[]
}

export default async function ClientDashboard() {
  const ctx = await requirePortal('client')
  const uid = ctx.effectiveUserId
  const supabase = await createClient()

  const [{ data: jobsData }, { data: contracts }, { data: milestones }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id,title,status,created_at,applications(count)')
      .eq('client_id', uid)
      .order('created_at', { ascending: false }),
    supabase.from('contracts').select('id,status').eq('client_id', uid),
    supabase
      .from('milestones')
      .select('amount,status,contracts!inner(client_id)')
      .eq('contracts.client_id', uid),
  ])

  const jobs = (jobsData as unknown as JobRow[]) ?? []
  const openJobs = jobs.filter((j) => j.status === 'open' || j.status === 'in_review').length
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applications?.[0]?.count ?? 0), 0)
  const activeContracts = (contracts ?? []).filter((c) => c.status === 'active').length
  const inEscrow = ((milestones as unknown as { amount: number; status: string }[]) ?? [])
    .filter((m) => m.status === 'funded')
    .reduce((s, m) => s + Number(m.amount), 0)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${ctx.effectiveProfile.display_name.split(' ')[0]}`}
        subtitle="Here's what's happening with your jobs."
        action={
          <Link href="/client/jobs/new">
            <Button>
              <PlusCircle className="h-4 w-4" /> Post a job
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active jobs" value={openJobs} icon={Briefcase} />
        <StatCard label="Total applicants" value={totalApplicants} icon={Users} />
        <StatCard label="Active contracts" value={activeContracts} icon={FileText} />
        <StatCard label="In escrow" value={formatMoney(inEscrow)} icon={Wallet} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Your jobs</h2>
        <Link href="/client/jobs" className="text-sm text-brand-700 flex items-center gap-1">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-[var(--color-fg-muted)] mb-4">
            You haven&apos;t posted any jobs yet.
          </p>
          <Link href="/client/jobs/new">
            <Button>Post your first job</Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--color-border)]">
          {jobs.slice(0, 6).map((job) => (
            <Link
              key={job.id}
              href={`/client/jobs/${job.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{job.title}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">{timeAgo(job.created_at)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm text-[var(--color-fg-muted)]">
                  {job.applications?.[0]?.count ?? 0} applicants
                </span>
                <JobStatusBadge status={job.status} />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
