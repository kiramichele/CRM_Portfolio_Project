import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/lib/database.types'

export const VIEW_AS_COOKIE = 'view_as'

/** The authenticated user's profile, or null if signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return data
}

/**
 * The "effective" context a portal page should render for.
 *
 * Normal users: effective == their own identity and role.
 * Admins with a `view_as` cookie set: they impersonate another user for the
 * walkthrough — effective id/role/profile point at that user, while `realRole`
 * stays 'admin' and `isImpersonating` is true. Admin RLS still authorizes the
 * underlying queries; portal pages filter by `effectiveUserId`.
 */
export type EffectiveContext = {
  realProfile: Profile
  realRole: UserRole
  effectiveUserId: string
  effectiveRole: UserRole
  effectiveProfile: Profile
  isImpersonating: boolean
}

export async function getEffectiveContext(): Promise<EffectiveContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: realProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!realProfile) return null

  // Only admins may impersonate.
  const cookieStore = await cookies()
  const viewAsId = cookieStore.get(VIEW_AS_COOKIE)?.value

  if (realProfile.role === 'admin' && viewAsId && viewAsId !== user.id) {
    const { data: target } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', viewAsId)
      .single()
    if (target) {
      return {
        realProfile,
        realRole: 'admin',
        effectiveUserId: target.id,
        effectiveRole: target.role,
        effectiveProfile: target,
        isImpersonating: true,
      }
    }
  }

  return {
    realProfile,
    realRole: realProfile.role,
    effectiveUserId: realProfile.id,
    effectiveRole: realProfile.role,
    effectiveProfile: realProfile,
    isImpersonating: false,
  }
}

/**
 * Guard a portal layout. Returns the effective context, or redirects:
 * signed-out → /login; wrong role → that user's own home (an admin must use
 * "view as" to enter a client/provider portal).
 */
export async function requirePortal(role: UserRole): Promise<EffectiveContext> {
  const ctx = await getEffectiveContext()
  if (!ctx) redirect('/login')
  if (ctx.effectiveRole !== role) redirect(homePathForRole(ctx.effectiveRole))
  return ctx
}

/** Where a given role lands after login. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'client':
      return '/client'
    case 'provider':
      return '/provider'
    case 'admin':
      return '/admin'
  }
}
