'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signUpAction, type AuthState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Briefcase, Hammer } from 'lucide-react'

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, null)
  const [role, setRole] = useState<'client' | 'provider'>('client')

  return (
    <div className="min-h-screen grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center mb-6 text-xl font-bold text-brand-700">
          ServiceHub
        </Link>
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-lg font-semibold mb-1">Create your account</h1>
            <p className="text-sm text-[var(--color-fg-muted)] mb-5">
              Hire talent or find work.
            </p>

            <form action={action} className="space-y-4">
              <input type="hidden" name="role" value={role} />
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'client', label: 'I want to hire', icon: Briefcase },
                    { key: 'provider', label: 'I want to work', icon: Hammer },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setRole(key)}
                    className={cn(
                      'rounded-[var(--radius)] border p-3 text-left transition-colors',
                      role === key
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
                    )}
                  >
                    <Icon className="h-5 w-5 mb-1.5 text-brand-600" />
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-[var(--color-fg-muted)] capitalize">
                      {key}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <Label htmlFor="display_name">Name</Label>
                <Input id="display_name" name="display_name" required />
              </div>
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
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {state?.error && (
                <p className="text-sm text-danger" role="alert">
                  {state.error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Creating…' : 'Create account'}
              </Button>
            </form>

            <p className="mt-4 text-sm text-center text-[var(--color-fg-muted)]">
              Already have an account?{' '}
              <Link href="/login" className="text-brand-700 font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
