'use client'

import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { signInAction, type AuthState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { DemoLogin } from '@/components/demo-login'

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, null)
  const [demoUnavailable, setDemoUnavailable] = useState(false)

  useEffect(() => {
    setDemoUnavailable(new URLSearchParams(window.location.search).get('demo') === 'unavailable')
  }, [])

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center mb-6 text-xl font-bold text-brand-700">
          ServiceHub
        </Link>

        {demoUnavailable && (
          <div className="mb-4 rounded-[var(--radius)] border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            Demo accounts aren&apos;t available — the database hasn&apos;t been seeded yet. Run{' '}
            <code>node supabase/seed.mjs</code> with your service-role key, then try again.
          </div>
        )}

        <div className="mb-4">
          <p className="text-xs font-medium text-[var(--color-fg-muted)] mb-2 text-center">
            One-click demo — no account needed
          </p>
          <DemoLogin variant="inline" />
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-fg-muted)]">or sign in</span>
          <div className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold mb-1">Welcome back</h1>
            <p className="text-sm text-[var(--color-fg-muted)] mb-5">Sign in to your portal.</p>

            <form action={action} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {state?.error && (
                <p className="text-sm text-danger" role="alert">
                  {state.error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-4 text-sm text-center text-[var(--color-fg-muted)]">
              No account?{' '}
              <Link href="/signup" className="text-brand-700 font-medium">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-4 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-3 text-xs text-[var(--color-fg-muted)]">
          <p>
            Demo accounts use password <code>ServiceHub!2026</code> — e.g.{' '}
            <code>acme@servicehub.test</code> (client), <code>maya@servicehub.test</code>{' '}
            (provider), <code>admin@servicehub.test</code> (admin).
          </p>
        </div>
      </div>
    </div>
  )
}
