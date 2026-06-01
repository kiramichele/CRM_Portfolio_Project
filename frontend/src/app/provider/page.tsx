import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ApplicationStatusBadge } from '@/components/ui/badge'
import { formatMoney, timeAgo } from '@/lib/utils'
import { Send, Star, Briefcase, Wallet, Search, ArrowRight } from 'lucide-react'
import type { Application } from '@/lib/database.types'

type AppRow = Pick<Application, 'id' | 'status' | 'created_at' | 'bid_amount'> & {
  jobs: { id: string; title: string } | null
}

export default async function ProviderDashboard() {
  const ctx = await requirePortal('provider')
  const uid = ctx.effectiveUserId
  const supabase = await createClient()

  const [{ data: appsData }, { data: contracts }, { data: milestones }] = await Promise.all([
    supabase
      .from('applications')
      .select('id,status,created_at,bid_amount,jobs(id,title)')
      .eq('provider_id', uid)
      .order('created_at', { ascending: false }),
    supabase.from('contracts').select('id,status').eq('provider_id', uid),
    supabase
      .from('milestones')
      .select('amount,status,contracts!inner(provider_id)')
      .eq('contracts.provider_id', uid),
  ])

  const apps = (appsData as unknown as AppRow[]) ?? []
  const submitted = apps.filter((a) => a.status === 'submitted').length
  const shortlisted = apps.filter((a) => a.status === 'shortlisted').length
  const activeContracts = (contracts ?? []).filter((c) => c.status === 'active').length
  const earned = ((milestones as unknown as { amount: number; status: string }[]) ?? [])
    .filter((m) => m.status === 'released')
    .reduce((s, m) => s + Number(m.amount), 0)

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${ctx.effectiveProfile.display_name.split(' ')[0]}`}
        subtitle="Track your applications and active work."
        action={
          <Link href="/jobs">
            <Button>
              <Search className="h-4 w-4" /> Find work
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending applications" value={submitted} icon={Send} />
        <StatCard label="Shortlisted" value={shortlisted} icon={Star} />
        <StatCard label="Active contracts" value={activeContracts} icon={Briefcase} />
        <StatCard label="Earned" value={formatMoney(earned)} icon={Wallet} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent applications</h2>
        <Link href="/provider/applications" className="text-sm text-brand-700 flex items-center gap-1">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {apps.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-[var(--color-fg-muted)] mb-4">
            You haven&apos;t applied to any jobs yet.
          </p>
          <Link href="/jobs">
            <Button>Browse the job board</Button>
          </Link>
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--color-border)]">
          {apps.slice(0, 6).map((a) => (
            <Link
              key={a.id}
              href={a.jobs ? `/jobs/${a.jobs.id}` : '#'}
              className="flex items-center justify-between gap-4 p-4 hover:bg-[var(--color-muted)]"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{a.jobs?.title ?? 'Job'}</p>
                <p className="text-xs text-[var(--color-fg-muted)]">
                  Bid {formatMoney(a.bid_amount)} · {timeAgo(a.created_at)}
                </p>
              </div>
              <ApplicationStatusBadge status={a.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}
