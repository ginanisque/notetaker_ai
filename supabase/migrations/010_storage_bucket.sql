insert into storage.buckets (id, name, public)
values ('meeting-audio', 'meeting-audio', false)
on conflict (id) do nothing;

-- Uploads/reads happen server-side via the service-role client after an
-- explicit can_access_meeting() check, so these policies are defense in
-- depth (owner-of-path-prefix only), not the primary access gate.
drop policy if exists "meeting_audio_insert_own" on storage.objects;
create policy "meeting_audio_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'meeting-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meeting_audio_select_own" on storage.objects;
create policy "meeting_audio_select_own"
on storage.objects for select
using (
  bucket_id = 'meeting-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "meeting_audio_delete_own" on storage.objects;
create policy "meeting_audio_delete_own"
on storage.objects for delete
using (
  bucket_id = 'meeting-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);
