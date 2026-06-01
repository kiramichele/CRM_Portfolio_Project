'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, timeAgo } from '@/lib/utils'
import type { Notification } from '@/lib/database.types'

export function NotificationBell({
  userId,
  initial,
}: {
  userId: string
  initial: Notification[]
}) {
  const [items, setItems] = useState<Notification[]>(initial)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const unread = items.filter((n) => !n.read_at).length

  // Live updates: subscribe to inserts for this user.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, 30))
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id)
    if (!unreadIds.length) return
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
    router.refresh()
  }, [items, router])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen((o) => !o)
          if (!open) markAllRead()
        }}
        className="relative grid h-9 w-9 place-items-center rounded-full hover:bg-[var(--color-muted)]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-[var(--color-fg-muted)]" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <div
        className={cn(
          'absolute right-0 mt-2 w-80 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-20 overflow-hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <span className="text-xs text-brand-700">{unread} new</span>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--color-fg-muted)]">
              No notifications yet.
            </p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? '#'}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-4 py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]',
                  !n.read_at && 'bg-brand-50/40',
                )}
              >
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && (
                  <p className="text-xs text-[var(--color-fg-muted)] line-clamp-2">{n.body}</p>
                )}
                <p className="text-[11px] text-[var(--color-fg-muted)] mt-1">{timeAgo(n.created_at)}</p>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
