'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { sendMessageAction } from '@/lib/actions/messages'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { cn, timeAgo } from '@/lib/utils'
import { Send } from 'lucide-react'
import type { Message } from '@/lib/database.types'

export function MessageThread({
  threadId,
  currentUserId,
  names,
  initial,
  canSend,
}: {
  threadId: string
  currentUserId: string
  names: Record<string, string>
  initial: Message[]
  canSend: boolean
}) {
  const [messages, setMessages] = useState<Message[]>(initial)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Live updates for new messages in this thread.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as Message
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function submit() {
    if (!body.trim()) return
    const text = body
    setBody('')
    setError(null)
    start(async () => {
      const res = await sendMessageAction(threadId, text)
      if (res?.error) {
        setError(res.error)
        setBody(text)
      }
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-96">
      <div className="flex-1 overflow-y-auto space-y-3 p-1">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-fg-muted)] py-8">
            No messages yet. Say hello!
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[75%]', mine ? 'items-end' : 'items-start')}>
                  {!mine && (
                    <p className="text-xs text-[var(--color-fg-muted)] mb-0.5 ml-1">
                      {names[m.sender_id] ?? 'User'}
                    </p>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
                      mine
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : 'bg-[var(--color-muted)] text-[var(--color-fg)] rounded-bl-sm',
                    )}
                  >
                    {m.body}
                  </div>
                  <p className={cn('text-[11px] text-[var(--color-fg-muted)] mt-0.5', mine ? 'text-right mr-1' : 'ml-1')}>
                    {timeAgo(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <div className="border-t border-[var(--color-border)] pt-3 mt-2">
          {error && <p className="text-xs text-danger mb-2">{error}</p>}
          <div className="flex gap-2 items-end">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              rows={2}
              placeholder="Type a message…"
              className="min-h-0"
            />
            <Button onClick={submit} disabled={pending || !body.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t border-[var(--color-border)] pt-3 mt-2 text-xs text-[var(--color-fg-muted)] text-center">
          Read-only in admin preview.
        </p>
      )}
    </div>
  )
}
