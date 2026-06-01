'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV } from './nav-config'
import type { UserRole } from '@/lib/database.types'

export function SidebarNav({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const items = NAV[role]

  return (
    <nav className="space-y-1">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-brand-50 text-brand-700'
                : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-muted)] hover:text-[var(--color-fg)]',
            )}
          >
            <Icon className="shrink-0" style={{ width: 18, height: 18 }} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
