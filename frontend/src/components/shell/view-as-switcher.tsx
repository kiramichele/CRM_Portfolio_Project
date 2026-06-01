'use client'

import { useTransition } from 'react'
import { impersonateAction } from '@/lib/actions/auth'
import { Card } from '@/components/ui/card'
import { Eye, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoUser = { id: string; display_name: string; headline: string | null; role: string }

export function ViewAsSwitcher({ users }: { users: DemoUser[] }) {
  const [pending, startTransition] = useTransition()

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Eye className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold">View as another user</h2>
      </div>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        Step into any client or provider portal to see exactly what they see. An exit banner
        keeps the preview obvious.
      </p>
      <div className="grid sm:grid-cols-2 gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => startTransition(() => impersonateAction(u.id))}
            disabled={pending}
            className={cn(
              'flex items-center gap-3 rounded-[var(--radius)] border border-[var(--color-border)] p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60',
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
              {u.display_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{u.display_name}</span>
              <span className="block text-xs text-[var(--color-fg-muted)] truncate capitalize">
                {u.role}
                {u.headline ? ` · ${u.headline}` : ''}
              </span>
            </span>
            {pending && <Loader2 className="h-4 w-4 animate-spin ml-auto text-brand-600" />}
          </button>
        ))}
      </div>
    </Card>
  )
}
