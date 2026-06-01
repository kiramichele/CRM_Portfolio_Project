import { requirePortal } from '@/lib/auth'
import { AppShell } from '@/components/shell/app-shell'

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePortal('provider')
  return <AppShell ctx={ctx}>{children}</AppShell>
}
