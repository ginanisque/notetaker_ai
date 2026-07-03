alter table public.meetings add column if not exists deleted_at timestamp with time zone;

create index if not exists meetings_deleted_at_idx on public.meetings(deleted_at);

-- Owner-only trash operations. auth.uid() = owner_id is checked inside the
-- function body, independent of any table grant, so this is the sole path
-- for moving a meeting in or out of trash.
create or replace function public.soft_delete_meeting(p_meeting_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.meetings
  set deleted_at = now()
  where id = p_meeting_id
    and owner_id = auth.uid()
    and deleted_at is null;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.restore_meeting(p_meeting_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.meetings
  set deleted_at = null
  where id = p_meeting_id
    and owner_id = auth.uid()
    and deleted_at is not null;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- No app code performs a direct update/delete on meetings today (confirmed
-- by grep) -- everything now goes through the functions above, or the
-- service-role client for the final 30-day purge. Revoking these grants
-- closes the gap where a workspace admin or a raw REST call could flip
-- deleted_at or hard-delete a row, bypassing the trash window entirely.
revoke update on public.meetings from authenticated;
revoke delete on public.meetings from authenticated;

drop policy if exists "meetings_update_owner_or_admin" on public.meetings;
drop policy if exists "meetings_delete_owner_or_admin" on public.meetings;

grant execute on function public.soft_delete_meeting(uuid) to authenticated;
grant execute on function public.restore_meeting(uuid) to authenticated;
grant execute on function public.soft_delete_meeting(uuid) to service_role;
grant execute on function public.restore_meeting(uuid) to service_role;
