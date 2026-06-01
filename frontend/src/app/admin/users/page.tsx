import { createClient } from '@/lib/supabase/server'
import { requirePortal } from '@/lib/auth'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/utils'
import type { Profile } from '@/lib/database.types'

export default async function AdminUsersPage() {
  await requirePortal('admin')
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  const users = (data as Profile[]) ?? []

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.length} accounts`} />
      <Card className="divide-y divide-[var(--color-border)]">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {u.display_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{u.display_name}</p>
              <p className="text-xs text-[var(--color-fg-muted)] truncate">{u.headline ?? '—'}</p>
            </div>
            <Badge tone={u.role === 'admin' ? 'brand' : u.role === 'client' ? 'info' : 'neutral'}>
              {u.role}
            </Badge>
            <span className="text-xs text-[var(--color-fg-muted)] w-16 text-right">
              {timeAgo(u.created_at)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
