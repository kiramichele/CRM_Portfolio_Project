import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { EffectiveContext } from '@/lib/auth'
import type { Notification, UserRole } from '@/lib/database.types'
import { NAV } from './nav-config'
import { SidebarNav } from './sidebar-nav'
import { UserMenu } from './user-menu'
import { NotificationBell } from './notification-bell'
import { ImpersonationBanner } from './impersonation-banner'

export async function AppShell({
  ctx,
  children,
}: {
  ctx: EffectiveContext
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', ctx.effectiveUserId)
    .order('created_at', { ascending: false })
    .limit(30)

  const role = ctx.effectiveRole as UserRole

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <Link href={`/${role}`} className="text-lg font-bold text-brand-700 px-3 mb-6">
          ServiceHub
        </Link>
        <SidebarNav items={NAV[role]} />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-16 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur flex items-center justify-between px-4 sm:px-6">
          <div className="md:hidden font-bold text-brand-700">ServiceHub</div>
          <div className="hidden md:block text-sm text-[var(--color-fg-muted)] capitalize">
            {role} portal
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell userId={ctx.effectiveUserId} initial={(notifications as Notification[]) ?? []} />
            <UserMenu name={ctx.effectiveProfile.display_name} role={ctx.effectiveRole} />
          </div>
        </header>

        {ctx.isImpersonating && (
          <ImpersonationBanner name={ctx.effectiveProfile.display_name} role={ctx.effectiveRole} />
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
