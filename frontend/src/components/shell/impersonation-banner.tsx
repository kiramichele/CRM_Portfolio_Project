'use client'

import { useTransition } from 'react'
import { clearViewAsAction } from '@/lib/actions/auth'
import { Eye, X } from 'lucide-react'

export function ImpersonationBanner({ name, role }: { name: string; role: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className="bg-amber-100 text-amber-900 px-4 sm:px-6 py-2 text-sm flex items-center justify-between">
      <span className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        Viewing as <strong>{name}</strong> <span className="capitalize">({role})</span> — admin preview
      </span>
      <button
        onClick={() => startTransition(() => clearViewAsAction())}
        disabled={pending}
        className="flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-amber-200 disabled:opacity-60"
      >
        <X className="h-4 w-4" /> Exit to admin
      </button>
    </div>
  )
}
