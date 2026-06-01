'use client'

import { useState, useRef, useEffect } from 'react'
import { signOutAction } from '@/lib/actions/auth'
import { LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-[var(--color-muted)]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          {initials}
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--color-fg-muted)]" />
      </button>
      <div
        className={cn(
          'absolute right-0 mt-2 w-56 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg p-1.5 z-20',
          open ? 'block' : 'hidden',
        )}
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-[var(--color-fg-muted)] capitalize">{role}</p>
        </div>
        <div className="h-px bg-[var(--color-border)] my-1" />
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-fg)] hover:bg-[var(--color-muted)]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
