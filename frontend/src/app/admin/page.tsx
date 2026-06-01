import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { ViewAsSwitcher } from '@/components/shell/view-as-switcher'
import { Users, Briefcase, FileText, Wallet } from 'lucide-react'

export default async function AdminOverview() {
  await requirePortal('admin')
  const supabase = await createClient()

  const [
    { count: userCount },
    { count: jobCount },
    { count: openCount },
    { count: contractCount },
    { data: milestones },
    { data: demoUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('milestones').select('amount,status'),
    supabase
      .from('profiles')
      .select('id,display_name,headline,role')
      .neq('role', 'admin')
      .order('role')
      .limit(12),
  ])

  const gmv = ((milestones as { amount: number; status: string }[]) ?? [])
    .filter((m) => m.status === 'funded' || m.status === 'released')
    .reduce((s, m) => s + Number(m.amount), 0)

  return (
    <div className="space-y-8">
      <PageHeader title="Platform overview" subtitle="A bird's-eye view of ServiceHub." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Users" value={userCount ?? 0} icon={Users} />
        <StatCard label="Open jobs" value={`${openCount ?? 0} / ${jobCount ?? 0}`} icon={Briefcase} hint="open / total" />
        <StatCard label="Active contracts" value={contractCount ?? 0} icon={FileText} />
        <StatCard label="Escrow GMV" value={`$${gmv.toLocaleString()}`} icon={Wallet} />
      </div>

      <ViewAsSwitcher users={(demoUsers as never) ?? []} />
    </div>
  )
}
