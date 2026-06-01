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
