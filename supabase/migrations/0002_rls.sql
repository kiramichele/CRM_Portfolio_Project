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
