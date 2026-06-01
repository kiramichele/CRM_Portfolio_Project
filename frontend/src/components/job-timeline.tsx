import {
  FilePlus2,
  Megaphone,
  UserPlus,
  Star,
  Award,
  Hammer,
  CheckCircle2,
  XCircle,
  Circle,
  type LucideIcon,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { JobEvent } from '@/lib/database.types'

const META: Record<string, { icon: LucideIcon; label: string }> = {
  created: { icon: FilePlus2, label: 'Job created' },
  opened: { icon: Megaphone, label: 'Opened for applications' },
  open: { icon: Megaphone, label: 'Opened for applications' },
  application_received: { icon: UserPlus, label: 'Application received' },
  shortlisted: { icon: Star, label: 'Applicant shortlisted' },
  in_review: { icon: Star, label: 'Reviewing applicants' },
  awarded: { icon: Award, label: 'Awarded' },
  in_progress: { icon: Hammer, label: 'Work in progress' },
  completed: { icon: CheckCircle2, label: 'Completed' },
  closed: { icon: XCircle, label: 'Closed' },
}

export function JobTimeline({ events }: { events: JobEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-[var(--color-fg-muted)]">No activity yet.</p>
  }

  return (
    <ol className="relative space-y-5">
      {events.map((e, i) => {
        const meta = META[e.event_type] ?? { icon: Circle, label: e.event_type }
        const Icon = meta.icon
        const last = i === events.length - 1
        return (
          <li key={e.id} className="relative flex gap-3">
            {!last && (
              <span className="absolute left-[15px] top-8 bottom-[-20px] w-px bg-[var(--color-border)]" />
            )}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" />
            </span>
            <div className="pt-1">
              <p className="text-sm font-medium leading-tight">{meta.label}</p>
              {e.detail && (
                <p className="text-xs text-[var(--color-fg-muted)]">{e.detail}</p>
              )}
              <p className="text-[11px] text-[var(--color-fg-muted)] mt-0.5">
                {timeAgo(e.created_at)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
