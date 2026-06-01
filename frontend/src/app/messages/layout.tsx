import { redirect } from 'next/navigation'
import { getEffectiveContext } from '@/lib/auth'
import { AppShell } from '@/components/shell/app-shell'

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  return <AppShell ctx={ctx}>{children}</AppShell>
}
