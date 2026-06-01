-- ServiceHub — combined migrations (0001-0006). Paste this whole file into the Supabase SQL editor and Run.
-- Generated from migrations/*.sql — edit those files, not this one.



-- ============================================================================
-- FILE: migrations/0001_schema.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — Schema
-- Tables, enums, helper functions, and triggers for the service-marketplace CRM.
-- RLS policies live in 0002_rls.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('client', 'provider', 'admin');

create type job_status as enum (
  'draft',        -- being written by the client, not visible to providers
  'open',         -- accepting applications
  'in_review',    -- client is reviewing applicants, no longer accepting
  'awarded',      -- a provider has been selected, contract created
  'in_progress',  -- work underway
  'completed',    -- work delivered and accepted
  'closed'        -- cancelled / expired without award
);

create type budget_type as enum ('fixed', 'hourly');

create type application_status as enum (
  'submitted',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn'
);

create type contract_status as enum ('active', 'completed', 'cancelled');

-- ----------------------------------------------------------------------------
-- profiles — extends auth.users with role + marketplace fields
-- ----------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         user_role not null default 'client',
  display_name text not null,
  headline     text,
  bio          text,
  avatar_url   text,
  location     text,
  skills       text[] not null default '{}',
  hourly_rate  numeric(10, 2),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- categories — lookup for job categories (powers NL analytics)
-- ----------------------------------------------------------------------------
create table categories (
  id          serial primary key,
  slug        text not null unique,
  name        text not null,
  description text
);

-- ----------------------------------------------------------------------------
-- jobs — postings created by clients
-- ----------------------------------------------------------------------------
create table jobs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles (id) on delete cascade,
  title       text not null,
  description text not null,
  category_id int references categories (id) on delete set null,
  budget_type budget_type not null default 'fixed',
  budget_min  numeric(12, 2),
  budget_max  numeric(12, 2),
  status      job_status not null default 'draft',
  deadline    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint budget_range_valid check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  )
);

create index jobs_status_idx      on jobs (status);
create index jobs_client_id_idx   on jobs (client_id);
create index jobs_category_id_idx on jobs (category_id);
create index jobs_created_at_idx  on jobs (created_at desc);

-- ----------------------------------------------------------------------------
-- applications — providers applying to jobs
-- ----------------------------------------------------------------------------
create table applications (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references jobs (id) on delete cascade,
  provider_id        uuid not null references profiles (id) on delete cascade,
  cover_note         text,
  bid_amount         numeric(12, 2),
  status             application_status not null default 'submitted',
  ai_match_score     int check (ai_match_score between 0 and 100),
  ai_match_rationale text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (job_id, provider_id)  -- one application per provider per job
);

create index applications_job_id_idx      on applications (job_id);
create index applications_provider_id_idx on applications (provider_id);
create index applications_status_idx      on applications (status);

-- ----------------------------------------------------------------------------
-- contracts — created when a job is awarded
-- ----------------------------------------------------------------------------
create table contracts (
  id             uuid primary key default gen_random_uuid(),
  job_id         uuid not null references jobs (id) on delete cascade,
  application_id uuid references applications (id) on delete set null,
  client_id      uuid not null references profiles (id) on delete cascade,
  provider_id    uuid not null references profiles (id) on delete cascade,
  agreed_amount  numeric(12, 2),
  terms          text,
  status         contract_status not null default 'active',
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index contracts_client_id_idx   on contracts (client_id);
create index contracts_provider_id_idx on contracts (provider_id);
create index contracts_job_id_idx      on contracts (job_id);

-- ----------------------------------------------------------------------------
-- threads + messages — one thread per (job, client, provider) pair
-- ----------------------------------------------------------------------------
create table threads (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid references jobs (id) on delete cascade,
  client_id   uuid not null references profiles (id) on delete cascade,
  provider_id uuid not null references profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (job_id, client_id, provider_id)
);

create index threads_client_id_idx   on threads (client_id);
create index threads_provider_id_idx on threads (provider_id);

create table messages (
  id        uuid primary key default gen_random_uuid(),
  thread_id uuid not null references threads (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body      text not null,
  read_at   timestamptz,
  created_at timestamptz not null default now()
);

create index messages_thread_id_idx on messages (thread_id, created_at);

-- ----------------------------------------------------------------------------
-- reviews — left after a contract, both directions
-- ----------------------------------------------------------------------------
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references contracts (id) on delete cascade,
  reviewer_id uuid not null references profiles (id) on delete cascade,
  reviewee_id uuid not null references profiles (id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (contract_id, reviewer_id)
);

create index reviews_reviewee_id_idx on reviews (reviewee_id);

-- ----------------------------------------------------------------------------
-- activity_log — generic audit feed
-- ----------------------------------------------------------------------------
create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles (id) on delete set null,
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index activity_log_entity_idx     on activity_log (entity_type, entity_id);
create index activity_log_created_at_idx on activity_log (created_at desc);

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Role of the current authenticated user. SECURITY DEFINER so it bypasses RLS
-- on profiles (avoids policy recursion). Named auth_user_role() because
-- current_role / role are reserved.
create or replace function public.auth_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_user_role() = 'admin', false);
$$;

-- Keep updated_at fresh on mutation.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at
  before update on jobs
  for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
  before update on applications
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up. Role + display_name
-- come from sign-up metadata (raw_user_meta_data), defaulting sensibly.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'client'),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================================
-- FILE: migrations/0002_rls.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — Row-Level Security
-- This is where the three-portal boundary is enforced:
--   * clients   see only their own jobs and the applications to them
--   * providers see open jobs + their own applications/contracts
--   * admins    see everything
-- Anonymous visitors can browse open jobs + categories (public job board).
-- ============================================================================

alter table profiles     enable row level security;
alter table categories   enable row level security;
alter table jobs         enable row level security;
alter table applications enable row level security;
alter table contracts    enable row level security;
alter table threads      enable row level security;
alter table messages     enable row level security;
alter table reviews      enable row level security;
alter table activity_log enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- Any authenticated user can read profiles (marketplace participants view each
-- other). Open job board also exposes minimal client info via the jobs view.
create policy profiles_select_authenticated on profiles
  for select to authenticated
  using (true);

create policy profiles_insert_self on profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_self on profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy profiles_delete_admin on profiles
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- categories — public read, admin write
-- ----------------------------------------------------------------------------
create policy categories_select_all on categories
  for select to anon, authenticated
  using (true);

create policy categories_write_admin on categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- jobs
-- ----------------------------------------------------------------------------
-- Public + anon: browse open jobs only.
create policy jobs_select_open_anon on jobs
  for select to anon
  using (status = 'open');

-- Authenticated read: clients see their own (any status); providers see any
-- non-draft job plus any job they've applied to; admins see all.
create policy jobs_select_authenticated on jobs
  for select to authenticated
  using (
    public.is_admin()
    or client_id = auth.uid()
    or status <> 'draft'
    or exists (
      select 1 from applications a
      where a.job_id = jobs.id and a.provider_id = auth.uid()
    )
  );

-- Only clients (or admins) create jobs, and only as themselves.
create policy jobs_insert_client on jobs
  for insert to authenticated
  with check (
    client_id = auth.uid()
    and (public.auth_user_role() = 'client' or public.is_admin())
  );

create policy jobs_update_owner on jobs
  for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

create policy jobs_delete_owner on jobs
  for delete to authenticated
  using (client_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- applications
-- ----------------------------------------------------------------------------
-- Provider sees own; client sees applications to their jobs; admin all.
create policy applications_select_party on applications
  for select to authenticated
  using (
    public.is_admin()
    or provider_id = auth.uid()
    or exists (
      select 1 from jobs j
      where j.id = applications.job_id and j.client_id = auth.uid()
    )
  );

-- A provider applies as themselves, only to jobs that are currently open.
create policy applications_insert_provider on applications
  for insert to authenticated
  with check (
    provider_id = auth.uid()
    and (public.auth_user_role() = 'provider' or public.is_admin())
    and exists (
      select 1 from jobs j
      where j.id = job_id and j.status = 'open'
    )
  );

-- Provider may edit/withdraw own application; client may change status of
-- applications to their jobs (shortlist/accept/reject); admin all.
create policy applications_update_party on applications
  for update to authenticated
  using (
    public.is_admin()
    or provider_id = auth.uid()
    or exists (
      select 1 from jobs j
      where j.id = applications.job_id and j.client_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or provider_id = auth.uid()
    or exists (
      select 1 from jobs j
      where j.id = applications.job_id and j.client_id = auth.uid()
    )
  );

create policy applications_delete_owner on applications
  for delete to authenticated
  using (provider_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- contracts
-- ----------------------------------------------------------------------------
create policy contracts_select_party on contracts
  for select to authenticated
  using (
    public.is_admin()
    or client_id = auth.uid()
    or provider_id = auth.uid()
  );

-- The client of the job creates the contract on award.
create policy contracts_insert_client on contracts
  for insert to authenticated
  with check (client_id = auth.uid() or public.is_admin());

create policy contracts_update_party on contracts
  for update to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or provider_id = auth.uid() or public.is_admin());

create policy contracts_delete_admin on contracts
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- threads — only the two parties (and admins)
-- ----------------------------------------------------------------------------
create policy threads_select_party on threads
  for select to authenticated
  using (client_id = auth.uid() or provider_id = auth.uid() or public.is_admin());

create policy threads_insert_party on threads
  for insert to authenticated
  with check (client_id = auth.uid() or provider_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- messages — only participants of the parent thread
-- ----------------------------------------------------------------------------
create policy messages_select_participant on messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and (t.client_id = auth.uid() or t.provider_id = auth.uid())
    )
  );

create policy messages_insert_participant on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from threads t
      where t.id = thread_id
        and (t.client_id = auth.uid() or t.provider_id = auth.uid())
    )
  );

-- Mark-as-read etc. by either participant.
create policy messages_update_participant on messages
  for update to authenticated
  using (
    exists (
      select 1 from threads t
      where t.id = messages.thread_id
        and (t.client_id = auth.uid() or t.provider_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- reviews — public read (reputation), parties write their own
-- ----------------------------------------------------------------------------
create policy reviews_select_authenticated on reviews
  for select to authenticated
  using (true);

create policy reviews_insert_party on reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from contracts c
      where c.id = contract_id
        and (c.client_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create policy reviews_update_owner on reviews
  for update to authenticated
  using (reviewer_id = auth.uid() or public.is_admin())
  with check (reviewer_id = auth.uid() or public.is_admin());

create policy reviews_delete_owner on reviews
  for delete to authenticated
  using (reviewer_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- activity_log — admins read all; users read their own actions
-- ----------------------------------------------------------------------------
create policy activity_log_select_own on activity_log
  for select to authenticated
  using (public.is_admin() or actor_id = auth.uid());

create policy activity_log_insert_self on activity_log
  for insert to authenticated
  with check (actor_id = auth.uid() or public.is_admin());


-- ============================================================================
-- FILE: migrations/0003_categories.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — Category reference data
-- Reference data ships as a migration so the schema is usable immediately.
-- ============================================================================

insert into categories (slug, name, description) values
  ('web-development',    'Web Development',     'Frontend, backend, and full-stack web work'),
  ('mobile-development', 'Mobile Development',  'iOS, Android, and cross-platform apps'),
  ('design',            'Design & Creative',   'UI/UX, branding, illustration, and graphics'),
  ('writing',           'Writing & Content',   'Copywriting, technical writing, and editing'),
  ('data',              'Data & Analytics',    'Data engineering, analysis, and visualization'),
  ('ai-ml',             'AI & Machine Learning','LLM apps, model training, and ML pipelines'),
  ('marketing',         'Marketing & SEO',     'Growth, SEO, ads, and social media'),
  ('devops',            'DevOps & Cloud',      'Infrastructure, CI/CD, and cloud architecture'),
  ('admin-support',     'Admin & Support',     'Virtual assistance, data entry, and customer support'),
  ('video',             'Video & Animation',   'Editing, motion graphics, and animation')
on conflict (slug) do nothing;


-- ============================================================================
-- FILE: migrations/0004_timeline_payments_files.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — timeline, escrow milestones, attachments, notifications, realtime
-- Adds:
--   * job_events       — status timeline per job (auto-written by trigger)
--   * milestones       — escrow-style milestone payments (Stripe test mode)
--   * attachments      — files on jobs / applications / messages (Storage)
--   * notifications    — in-app realtime notifications (auto-written by triggers)
-- and registers the realtime tables.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type milestone_status as enum (
  'pending',    -- defined, not yet funded
  'funded',     -- client funded escrow (Stripe test PaymentIntent captured/held)
  'submitted',  -- provider submitted work for this milestone
  'released',   -- client released funds to provider
  'cancelled'
);

-- ----------------------------------------------------------------------------
-- job_events — the status timeline
-- ----------------------------------------------------------------------------
create table job_events (
  id         uuid primary key default gen_random_uuid(),
  job_id     uuid not null references jobs (id) on delete cascade,
  actor_id   uuid references profiles (id) on delete set null,
  event_type text not null,   -- created | opened | application_received |
                              -- shortlisted | awarded | in_progress | completed | closed | status_changed
  detail     text,
  created_at timestamptz not null default now()
);

create index job_events_job_id_idx on job_events (job_id, created_at);

-- ----------------------------------------------------------------------------
-- milestones — escrow-style payments hung off a contract
-- ----------------------------------------------------------------------------
create table milestones (
  id                        uuid primary key default gen_random_uuid(),
  contract_id               uuid not null references contracts (id) on delete cascade,
  title                     text not null,
  description               text,
  amount                    numeric(12, 2) not null,
  status                    milestone_status not null default 'pending',
  sort_order                int not null default 0,
  due_date                  date,
  stripe_payment_intent_id  text,
  funded_at                 timestamptz,
  released_at               timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index milestones_contract_id_idx on milestones (contract_id, sort_order);

create trigger milestones_set_updated_at
  before update on milestones
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- attachments — polymorphic file metadata; bytes live in Storage
-- ----------------------------------------------------------------------------
create table attachments (
  id           uuid primary key default gen_random_uuid(),
  uploader_id  uuid not null references profiles (id) on delete cascade,
  entity_type  text not null check (entity_type in ('job', 'application', 'message', 'contract', 'milestone')),
  entity_id    uuid not null,
  bucket       text not null default 'attachments',
  storage_path text not null,        -- path within the bucket
  file_name    text not null,
  mime_type    text,
  size_bytes   bigint,
  created_at   timestamptz not null default now()
);

create index attachments_entity_idx on attachments (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- notifications — in-app, delivered live over realtime
-- ----------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,  -- recipient
  type        text not null,
  title       text not null,
  body        text,
  link        text,            -- in-app route to open
  entity_type text,
  entity_id   uuid,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);

-- ============================================================================
-- Triggers that make the timeline + notifications populate themselves
-- (SECURITY DEFINER so they can always write regardless of the actor's RLS).
-- ============================================================================

-- Record a job_event whenever a job is created or its status changes.
create or replace function public.log_job_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into job_events (job_id, actor_id, event_type, detail)
    values (new.id, new.client_id, 'created', 'Job created (' || new.status || ')');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into job_events (job_id, actor_id, event_type, detail)
    values (new.id, auth.uid(), new.status::text, 'Status changed to ' || new.status);
  end if;
  return new;
end;
$$;

create trigger jobs_log_status
  after insert or update on jobs
  for each row execute function public.log_job_status();

-- When a provider applies: log an event + notify the job's client.
create or replace function public.on_application_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_title     text;
  v_provider  text;
begin
  select j.client_id, j.title into v_client_id, v_title from jobs j where j.id = new.job_id;
  select display_name into v_provider from profiles where id = new.provider_id;

  insert into job_events (job_id, actor_id, event_type, detail)
  values (new.job_id, new.provider_id, 'application_received', v_provider || ' applied');

  insert into notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (v_client_id, 'application_received',
          'New application',
          v_provider || ' applied to "' || v_title || '"',
          '/client/jobs/' || new.job_id, 'application', new.id);
  return new;
end;
$$;

create trigger applications_notify
  after insert on applications
  for each row execute function public.on_application_created();

-- When an application is shortlisted/accepted/rejected: notify the provider.
create or replace function public.on_application_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if new.status is distinct from old.status
     and new.status in ('shortlisted', 'accepted', 'rejected') then
    select title into v_title from jobs where id = new.job_id;
    insert into notifications (user_id, type, title, body, link, entity_type, entity_id)
    values (new.provider_id, 'application_' || new.status,
            'Application ' || new.status,
            'Your application to "' || v_title || '" was ' || new.status,
            '/provider/applications', 'application', new.id);
  end if;
  return new;
end;
$$;

create trigger applications_status_notify
  after update on applications
  for each row execute function public.on_application_status();

-- When a message is sent: notify the other party in the thread.
create or replace function public.on_message_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_sender    text;
begin
  select case when t.client_id = new.sender_id then t.provider_id else t.client_id end
    into v_recipient
  from threads t where t.id = new.thread_id;

  select display_name into v_sender from profiles where id = new.sender_id;

  insert into notifications (user_id, type, title, body, link, entity_type, entity_id)
  values (v_recipient, 'message', 'New message',
          v_sender || ': ' || left(new.body, 80),
          '/messages/' || new.thread_id, 'message', new.id);
  return new;
end;
$$;

create trigger messages_notify
  after insert on messages
  for each row execute function public.on_message_created();

-- ============================================================================
-- RLS for the new tables
-- ============================================================================
alter table job_events    enable row level security;
alter table milestones    enable row level security;
alter table attachments   enable row level security;
alter table notifications enable row level security;

-- job_events: visible to anyone who can see the parent job.
create policy job_events_select on job_events
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from jobs j
      where j.id = job_events.job_id
        and (j.client_id = auth.uid()
             or j.status <> 'draft'
             or exists (select 1 from applications a
                        where a.job_id = j.id and a.provider_id = auth.uid()))
    )
  );

-- milestones: the two contract parties (and admins) can read; client manages.
create policy milestones_select_party on milestones
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from contracts c
      where c.id = milestones.contract_id
        and (c.client_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

create policy milestones_write_party on milestones
  for all to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from contracts c
      where c.id = milestones.contract_id
        and (c.client_id = auth.uid() or c.provider_id = auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from contracts c
      where c.id = milestones.contract_id
        and (c.client_id = auth.uid() or c.provider_id = auth.uid())
    )
  );

-- attachments: uploader + admins always; otherwise follow the parent entity.
create policy attachments_select on attachments
  for select to authenticated
  using (
    public.is_admin()
    or uploader_id = auth.uid()
    or (entity_type = 'job' and exists (
          select 1 from jobs j where j.id = attachments.entity_id
            and (j.client_id = auth.uid() or j.status <> 'draft')))
    or (entity_type = 'application' and exists (
          select 1 from applications a join jobs j on j.id = a.job_id
          where a.id = attachments.entity_id
            and (a.provider_id = auth.uid() or j.client_id = auth.uid())))
    or (entity_type = 'message' and exists (
          select 1 from messages m join threads t on t.id = m.thread_id
          where m.id = attachments.entity_id
            and (t.client_id = auth.uid() or t.provider_id = auth.uid())))
  );

create policy attachments_insert_self on attachments
  for insert to authenticated
  with check (uploader_id = auth.uid());

create policy attachments_delete_owner on attachments
  for delete to authenticated
  using (uploader_id = auth.uid() or public.is_admin());

-- notifications: recipients read/update their own; inserts come from the
-- SECURITY DEFINER triggers above (and admins).
create policy notifications_select_own on notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy notifications_update_own on notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert_admin on notifications
  for insert to authenticated
  with check (public.is_admin());

-- ============================================================================
-- Realtime — broadcast changes on these tables to subscribed clients
-- ============================================================================
alter table messages      replica identity full;
alter table notifications replica identity full;
alter table applications  replica identity full;
alter table job_events    replica identity full;

alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table applications;
alter publication supabase_realtime add table job_events;


-- ============================================================================
-- FILE: migrations/0005_storage.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — Storage bucket for attachments
-- Bytes live here; metadata lives in public.attachments.
-- Bucket is private; the app mints signed URLs for authorized downloads.
-- Convention: objects are stored under  <uploader_uid>/<entity_type>/<file>
-- so a user can only write into their own folder.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Upload: authenticated users may write only into their own top-level folder.
create policy "attachments upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: uploader or admin directly; broader access is granted via signed URLs
-- minted server-side after checking public.attachments visibility.
create policy "attachments read own or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.is_admin())
  );

create policy "attachments delete own or admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'attachments'
    and (owner = auth.uid() or public.is_admin())
  );


-- ============================================================================
-- FILE: migrations/0006_attachment_access.sql
-- ============================================================================

-- ============================================================================
-- ServiceHub — attachment download access
-- The 0005 storage read policy was owner-only. To let authorized counterparties
-- download (a provider reading a client's job brief, a client reading an
-- applicant's portfolio), gate Storage reads on the SAME visibility rules as the
-- public.attachments table — via a SECURITY DEFINER function so signed-URL
-- creation works for any authorized user, no service key required.
-- ============================================================================

create or replace function public.can_access_attachment(object_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from attachments a
    where a.bucket = 'attachments'
      and a.storage_path = object_path
      and (
        public.is_admin()
        or a.uploader_id = auth.uid()
        or (a.entity_type = 'job' and exists (
              select 1 from jobs j where j.id = a.entity_id
                and (j.client_id = auth.uid() or j.status <> 'draft')))
        or (a.entity_type = 'application' and exists (
              select 1 from applications ap join jobs j on j.id = ap.job_id
              where ap.id = a.entity_id
                and (ap.provider_id = auth.uid() or j.client_id = auth.uid())))
        or (a.entity_type = 'message' and exists (
              select 1 from messages m join threads t on t.id = m.thread_id
              where m.id = a.entity_id
                and (t.client_id = auth.uid() or t.provider_id = auth.uid())))
        or (a.entity_type = 'contract' and exists (
              select 1 from contracts c where c.id = a.entity_id
                and (c.client_id = auth.uid() or c.provider_id = auth.uid())))
      )
  );
$$;

-- Replace the owner-only read policy with the access-aware one.
drop policy if exists "attachments read own or admin" on storage.objects;

create policy "attachments read if authorized"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attachments'
    and public.can_access_attachment(name)
  );
