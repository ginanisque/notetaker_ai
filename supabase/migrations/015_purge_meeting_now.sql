-- Lets the owner permanently delete a trashed meeting immediately instead of
-- waiting for the nightly /api/cron/purge-trash job's 30-day window. Follows
-- the same security-definer + owner-check + grant/revoke pattern as
-- soft_delete_meeting/restore_meeting in 011_meeting_trash.sql - only
-- deletes a row that is already in trash (deleted_at is not null) and owned
-- by the caller. Returns the audio_url so the caller can also remove the
-- Storage object.
create or replace function public.purge_meeting_now(p_meeting_id uuid)
returns table (audio_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    delete from public.meetings
    where id = p_meeting_id
      and owner_id = auth.uid()
      and deleted_at is not null
    returning meetings.audio_url;
end;
$$;

grant execute on function public.purge_meeting_now(uuid) to authenticated;
grant execute on function public.purge_meeting_now(uuid) to service_role;
