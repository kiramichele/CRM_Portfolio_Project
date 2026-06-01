import { requirePortal } from '@/lib/auth'
import { AppShell } from '@/components/shell/app-shell'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal('client')
  return <AppShell ctx={ctx}>{children}</AppShell>
}
