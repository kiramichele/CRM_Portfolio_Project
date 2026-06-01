/**
 * Hand-written to mirror supabase/migrations. Once the schema is live you can
 * regenerate the exact types with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 *
 * Note: row shapes are `type` aliases (not `interface`) — supabase-js's typed
 * query builder requires types that satisfy `Record<string, unknown>`, which
 * interfaces do not implicitly do (their rows would resolve to `never`).
 */

export type UserRole = 'client' | 'provider' | 'admin'

export type JobStatus =
  | 'draft'
  | 'open'
  | 'in_review'
  | 'awarded'
  | 'in_progress'
  | 'completed'
  | 'closed'

export type BudgetType = 'fixed' | 'hourly'

export type ApplicationStatus =
  | 'submitted'
  | 'shortlisted'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'

export type ContractStatus = 'active' | 'completed' | 'cancelled'

export type MilestoneStatus =
  | 'pending'
  | 'funded'
  | 'submitted'
  | 'released'
  | 'cancelled'

export type Profile = {
  id: string
  role: UserRole
  display_name: string
  headline: string | null
  bio: string | null
  avatar_url: string | null
  location: string | null
  skills: string[]
  hourly_rate: number | null
  created_at: string
  updated_at: string
}

export type Category = {
  id: number
  slug: string
  name: string
  description: string | null
}

export type Job = {
  id: string
  client_id: string
  title: string
  description: string
  category_id: number | null
  budget_type: BudgetType
  budget_min: number | null
  budget_max: number | null
  status: JobStatus
  deadline: string | null
  created_at: string
  updated_at: string
}

export type Application = {
  id: string
  job_id: string
  provider_id: string
  cover_note: string | null
  bid_amount: number | null
  status: ApplicationStatus
  ai_match_score: number | null
  ai_match_rationale: string | null
  created_at: string
  updated_at: string
}

export type Contract = {
  id: string
  job_id: string
  application_id: string | null
  client_id: string
  provider_id: string
  agreed_amount: number | null
  terms: string | null
  status: ContractStatus
  created_at: string
  completed_at: string | null
}

export type Thread = {
  id: string
  job_id: string | null
  client_id: string
  provider_id: string
  created_at: string
}

export type Message = {
  id: string
  thread_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export type Review = {
  id: string
  contract_id: string
  reviewer_id: string
  reviewee_id: string
  rating: number
  comment: string | null
  created_at: string
}

export type ActivityLog = {
  id: string
  actor_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export type JobEvent = {
  id: string
  job_id: string
  actor_id: string | null
  event_type: string
  detail: string | null
  created_at: string
}

export type Milestone = {
  id: string
  contract_id: string
  title: string
  description: string | null
  amount: number
  status: MilestoneStatus
  sort_order: number
  due_date: string | null
  stripe_payment_intent_id: string | null
  funded_at: string | null
  released_at: string | null
  created_at: string
  updated_at: string
}

export type Attachment = {
  id: string
  uploader_id: string
  entity_type: 'job' | 'application' | 'message' | 'contract' | 'milestone'
  entity_id: string
  bucket: string
  storage_path: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  link: string | null
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}

/** Generic table shape for the Supabase generic client. */
type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile>
      categories: TableShape<Category>
      jobs: TableShape<Job>
      applications: TableShape<Application>
      contracts: TableShape<Contract>
      threads: TableShape<Thread>
      messages: TableShape<Message>
      reviews: TableShape<Review>
      activity_log: TableShape<ActivityLog>
      job_events: TableShape<JobEvent>
      milestones: TableShape<Milestone>
      attachments: TableShape<Attachment>
      notifications: TableShape<Notification>
    }
    Views: Record<string, never>
    Functions: {
      auth_user_role: { Args: Record<string, never>; Returns: UserRole }
      is_admin: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      job_status: JobStatus
      budget_type: BudgetType
      application_status: ApplicationStatus
      contract_status: ContractStatus
      milestone_status: MilestoneStatus
    }
    CompositeTypes: Record<string, never>
  }
}
