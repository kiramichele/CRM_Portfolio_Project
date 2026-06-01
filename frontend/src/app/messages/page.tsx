import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Card } from '@/components/ui/card'
import { timeAgo } from '@/lib/utils'

type ThreadRow = {
  id: string
  created_at: string
  client_id: string
  provider_id: string
  jobs: { title: string } | null
  client: { display_name: string } | null
  provider: { display_name: string } | null
}

export default async function MessagesPage() {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  const uid = ctx.effectiveUserId
  const supabase = await createClient()

  const { data } = await supabase
    .from('threads')
    .select('id,created_at,client_id,provider_id,jobs(title),client:profiles!client_id(display_name),provider:profiles!provider_id(display_name)')
    .or(`client_id.eq.${uid},provider_id.eq.${uid}`)
    .order('created_at', { ascending: false })

  const threads = (data as unknown as ThreadRow[]) ?? []

  return (
    <div>
      <PageHeader title="Messages" subtitle={`${threads.length} conversation${threads.length === 1 ? '' : 's'}`} />
      {threads.length === 0 ? (
        <Card className="p-12 text-center text-sm text-[var(--color-fg-muted)]">
          No conversations yet. A thread opens automatically when a job is awarded.
        </Card>
      ) : (
        <Card className="divide-y divide-[var(--color-border)]">
          {threads.map((t) => {
            const counterparty =
              t.client_id === uid ? t.provider?.display_name : t.client?.display_name
            const initials = (counterparty ?? '?')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()
            return (
              <Link
                key={t.id}
                href={`/messages/${t.id}`}
                className="flex items-center gap-3 p-4 hover:bg-[var(--color-muted)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{counterparty ?? 'Conversation'}</p>
                  <p className="text-xs text-[var(--color-fg-muted)] truncate">{t.jobs?.title}</p>
                </div>
                <span className="text-xs text-[var(--color-fg-muted)] shrink-0">{timeAgo(t.created_at)}</span>
              </Link>
            )
          })}
        </Card>
      )}
    </div>
  )
}
