'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { homePathForRole, VIEW_AS_COOKIE } from '@/lib/auth'
import type { UserRole } from '@/lib/database.types'

export type AuthState = { error?: string } | null

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user!.id)
    .single()

  redirect(homePathForRole((profile?.role ?? 'client') as UserRole))
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const displayName = String(formData.get('display_name') ?? '')
  const role = String(formData.get('role') ?? 'client') as UserRole

  if (role !== 'client' && role !== 'provider') return { error: 'Pick a valid role.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, display_name: displayName } },
  })
  if (error) return { error: error.message }

  // If email confirmation is disabled (recommended for the demo), we get a
  // session immediately and can route to the portal. Otherwise prompt to confirm.
  if (!data.session) {
    return { error: 'Check your email to confirm your account, then sign in.' }
  }
  redirect(homePathForRole(role))
}

/**
 * One-click demo login — lets a portfolio reviewer enter as any role without
 * creating an account. Signs in with the seeded demo credentials.
 */
const DEMO_PASSWORD = 'ServiceHub!2026'
const DEMO_EMAILS: Record<'client' | 'provider' | 'admin', string> = {
  client: 'acme@servicehub.test',
  provider: 'maya@servicehub.test',
  admin: 'admin@servicehub.test',
}

export async function demoLoginAction(role: 'client' | 'provider' | 'admin') {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAILS[role],
    password: DEMO_PASSWORD,
  })
  if (error) {
    // Seed not run yet, or password differs.
    redirect('/login?demo=unavailable')
  }
  // Clear any lingering admin impersonation from a previous demo session.
  const cookieStore = await cookies()
  cookieStore.delete(VIEW_AS_COOKIE)
  redirect(homePathForRole(role))
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(VIEW_AS_COOKIE)
  redirect('/login')
}

/** Admin-only: impersonate another user for the walkthrough, then enter their portal. */
export async function impersonateAction(userId: string) {
  const supabase = await createClient()
  const me = await supabase.auth.getUser()
  const { data: meProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', me.data.user?.id ?? '')
    .single()
  if (meProfile?.role !== 'admin') return

  const { data: target } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()
  if (!target || target.role === 'admin') return

  const cookieStore = await cookies()
  cookieStore.set(VIEW_AS_COOKIE, userId, { httpOnly: true, sameSite: 'lax', path: '/' })
  redirect(homePathForRole(target.role as UserRole))
}

export async function clearViewAsAction() {
  const cookieStore = await cookies()
  cookieStore.delete(VIEW_AS_COOKIE)
  redirect('/admin')
}
