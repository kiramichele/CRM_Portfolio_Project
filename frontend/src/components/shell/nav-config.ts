import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  FileText,
  MessageSquare,
  Search,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/lib/database.types'

export type NavItem = { label: string; href: string; icon: LucideIcon }

export const NAV: Record<UserRole, NavItem[]> = {
  client: [
    { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
    { label: 'My jobs', href: '/client/jobs', icon: Briefcase },
    { label: 'Post a job', href: '/client/jobs/new', icon: PlusCircle },
    { label: 'Contracts', href: '/client/contracts', icon: FileText },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
  ],
  provider: [
    { label: 'Dashboard', href: '/provider', icon: LayoutDashboard },
    { label: 'Find work', href: '/jobs', icon: Search },
    { label: 'My applications', href: '/provider/applications', icon: FileText },
    { label: 'Contracts', href: '/provider/contracts', icon: Briefcase },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
  ],
  admin: [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  ],
}
