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
