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
