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
