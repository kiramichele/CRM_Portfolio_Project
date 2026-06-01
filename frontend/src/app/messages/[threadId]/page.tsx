import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveContext } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { MessageThread } from '@/components/message-thread'
import { ArrowLeft } from 'lucide-react'
import type { Message } from '@/lib/database.types'

type ThreadFull = {
  id: string
  job_id: string | null
  client_id: string
  provider_id: string
  jobs: { title: string } | null
  client: { id: string; display_name: string } | null
  provider: { id: string; display_name: string } | null
}

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('threads')
    .select('id,job_id,client_id,provider_id,jobs(title),client:profiles!client_id(id,display_name),provider:profiles!provider_id(id,display_name)')
    .eq('id', threadId)
    .single()
  if (!thread) notFound()
  const t = thread as unknown as ThreadFull

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  const names: Record<string, string> = {}
  if (t.client) names[t.client.id] = t.client.display_name
  if (t.provider) names[t.provider.id] = t.provider.display_name

  const counterparty =
    t.client_id === ctx.effectiveUserId ? t.provider?.display_name : t.client?.display_name
  const isParticipant =
    ctx.effectiveUserId === t.client_id || ctx.effectiveUserId === t.provider_id

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Messages
      </Link>

      <Card>
        <CardContent className="pt-5">
          <div className="border-b border-[var(--color-border)] pb-3 mb-3">
            <h1 className="font-semibold">{counterparty ?? 'Conversation'}</h1>
            {t.jobs?.title && (
              <p className="text-xs text-[var(--color-fg-muted)]">Re: {t.jobs.title}</p>
            )}
          </div>
          <MessageThread
            threadId={threadId}
            currentUserId={ctx.effectiveUserId}
            names={names}
            initial={(messages as Message[]) ?? []}
            canSend={isParticipant && !ctx.isImpersonating}
          />
        </CardContent>
      </Card>
    </div>
  )
}
