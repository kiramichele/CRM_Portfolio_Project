import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { AnalyticsAsk } from '@/components/ai/analytics-ask'

export default async function AdminAnalyticsPage() {
  await requirePortal('admin')
  const supabase = await createClient()

  const [{ data: jobs }, { count: applicationCount }, { data: contracts }, { data: milestones }] =
    await Promise.all([
      supabase.from('jobs').select('status,created_at,categories(name)'),
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('contracts').select('status'),
      supabase.from('milestones').select('amount,status'),
    ])

  type JobRow = { status: string; created_at: string; categories: { name: string } | null }
  const jobRows = (jobs as unknown as JobRow[]) ?? []

  // Aggregate into a compact snapshot for the model to reason over.
  const byStatus: Record<string, number> = {}
  const byCategory: Record<string, { total: number; unfilled: number }> = {}
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  let newThisMonth = 0
  const UNFILLED = new Set(['open', 'in_review'])

  for (const j of jobRows) {
    byStatus[j.status] = (byStatus[j.status] ?? 0) + 1
    const cat = j.categories?.name ?? 'Uncategorized'
    byCategory[cat] ??= { total: 0, unfilled: 0 }
    byCategory[cat].total += 1
    if (UNFILLED.has(j.status)) byCategory[cat].unfilled += 1
    if (new Date(j.created_at) >= monthStart) newThisMonth += 1
  }

  const ms = (milestones as { amount: number; status: string }[]) ?? []
  const escrow = {
    funded: ms.filter((m) => m.status === 'funded').reduce((s, m) => s + Number(m.amount), 0),
    released: ms.filter((m) => m.status === 'released').reduce((s, m) => s + Number(m.amount), 0),
  }

  const snapshot = {
    generated_for: 'platform analytics',
    jobs_total: jobRows.length,
    jobs_by_status: byStatus,
    jobs_by_category: Object.entries(byCategory).map(([category, v]) => ({ category, ...v })),
    new_jobs_this_month: newThisMonth,
    applications_total: applicationCount ?? 0,
    contracts_by_status: (contracts ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {}),
    escrow_usd: escrow,
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Ask questions about the platform in plain English." />

      <AnalyticsAsk
        data={snapshot}
        suggestions={[
          'Which categories have the most unfilled jobs?',
          'How many jobs were posted this month?',
          "What's our escrow GMV and how is it split?",
          'Which job status is most common?',
        ]}
      />

      <Card className="p-5">
        <h2 className="font-semibold mb-2 text-sm">Snapshot the AI is reasoning over</h2>
        <pre className="text-xs overflow-x-auto text-[var(--color-fg-muted)] bg-[var(--color-muted)] rounded-md p-3">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </Card>
    </div>
  )
}
