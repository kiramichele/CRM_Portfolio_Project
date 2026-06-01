'use client'

import { useTransition } from 'react'
import { demoLoginAction } from '@/lib/actions/auth'
import { cn } from '@/lib/utils'
import { Briefcase, Hammer, ShieldCheck, Loader2 } from 'lucide-react'

const ROLES = [
  { key: 'client', label: 'View as Client', icon: Briefcase, blurb: 'Post jobs, review applicants, fund milestones' },
  { key: 'provider', label: 'View as Provider', icon: Hammer, blurb: 'Browse the board, apply, manage contracts' },
  { key: 'admin', label: 'View as Admin', icon: ShieldCheck, blurb: 'Oversee everything + switch into any portal' },
] as const

export function DemoLogin({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const [pending, startTransition] = useTransition()

  function enter(role: 'client' | 'provider' | 'admin') {
    startTransition(() => demoLoginAction(role))
  }

  return (
    <div
      className={cn(
        variant === 'card'
          ? 'grid sm:grid-cols-3 gap-3'
          : 'flex flex-wrap items-center justify-center gap-2',
      )}
    >
      {ROLES.map(({ key, label, icon: Icon, blurb }) => (
        <button
          key={key}
          onClick={() => enter(key)}
          disabled={pending}
          className={cn(
            'group rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60',
            variant === 'card' ? 'p-4' : 'px-4 py-2 flex items-center gap-2',
          )}
        >
          <div className="flex items-center gap-2">
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            ) : (
              <Icon className="h-5 w-5 text-brand-600" />
            )}
            <span className="font-medium text-sm">{label}</span>
          </div>
          {variant === 'card' && (
            <p className="mt-1.5 text-xs text-[var(--color-fg-muted)]">{blurb}</p>
          )}
        </button>
      ))}
    </div>
  )
}
