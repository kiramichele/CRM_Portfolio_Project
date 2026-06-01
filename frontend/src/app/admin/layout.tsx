import { requirePortal } from '@/lib/auth'
import { AppShell } from '@/components/shell/app-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal('admin')
  return <AppShell ctx={ctx}>{children}</AppShell>
}
