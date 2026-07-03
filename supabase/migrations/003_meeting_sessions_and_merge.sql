alter table public.workspaces
add column if not exists recording_policy text not null default 'single_recorder'
check (recording_policy in ('single_recorder', 'open'));

create table if not exists public.meeting_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'ended')),
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone
);

alter table public.meetings
add column if not exists meeting_session_id uuid references public.meeting_sessions(id) on delete set null,
add column if not exists merged_from uuid[] not null default '{}';

create index if not exists meeting_sessions_workspace_status_idx on public.meeting_sessions(workspace_id, status);
create index if not exists meetings_meeting_session_id_idx on public.meetings(meeting_session_id);

alter table public.meeting_sessions enable row level security;

drop policy if exists "meeting_sessions_select_workspace_member" on public.meeting_sessions;
create policy "meeting_sessions_select_workspace_member"
on public.meeting_sessions for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "meeting_sessions_insert_workspace_member" on public.meeting_sessions;
create policy "meeting_sessions_insert_workspace_member"
on public.meeting_sessions for insert
with check (host_id = auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists "meeting_sessions_update_host_or_admin" on public.meeting_sessions;
create policy "meeting_sessions_update_host_or_admin"
on public.meeting_sessions for update
using (host_id = auth.uid() or public.is_workspace_admin(workspace_id))
with check (host_id = auth.uid() or public.is_workspace_admin(workspace_id));

grant select, insert, update on public.meeting_sessions to authenticated;
