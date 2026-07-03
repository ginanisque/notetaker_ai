create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamp with time zone not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date timestamp with time zone not null default now(),
  transcript text not null,
  summary_json jsonb not null,
  audio_url text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  task text not null,
  owner_name text not null,
  owner_email text,
  deadline text not null default 'Not specified',
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamp with time zone not null default now()
);

create index if not exists workspace_members_workspace_id_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);
create index if not exists meetings_owner_id_idx on public.meetings(owner_id);
create index if not exists meetings_workspace_id_idx on public.meetings(workspace_id);
create index if not exists action_items_meeting_id_idx on public.action_items(meeting_id);
create index if not exists action_items_owner_email_idx on public.action_items(owner_email);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.add_workspace_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do update
  set role = 'owner';

  return new;
end;
$$;

drop trigger if exists on_workspace_created on public.workspaces;
create trigger on_workspace_created
after insert on public.workspaces
for each row execute function public.add_workspace_owner_member();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace function public.can_access_meeting(target_meeting_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetings m
    where m.id = target_meeting_id
      and (
        m.owner_id = auth.uid()
        or (
          m.workspace_id is not null
          and public.is_workspace_member(m.workspace_id)
        )
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.meetings enable row level security;
alter table public.action_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_select_member" on public.workspaces;
create policy "workspaces_select_member"
on public.workspaces for select
using (owner_id = auth.uid() or public.is_workspace_member(id));

drop policy if exists "workspaces_insert_owner" on public.workspaces;
create policy "workspaces_insert_owner"
on public.workspaces for insert
with check (owner_id = auth.uid());

drop policy if exists "workspaces_update_admin" on public.workspaces;
create policy "workspaces_update_admin"
on public.workspaces for update
using (owner_id = auth.uid() or public.is_workspace_admin(id))
with check (owner_id = auth.uid() or public.is_workspace_admin(id));

drop policy if exists "workspaces_delete_admin" on public.workspaces;
create policy "workspaces_delete_admin"
on public.workspaces for delete
using (owner_id = auth.uid() or public.is_workspace_admin(id));

drop policy if exists "workspace_members_select_member" on public.workspace_members;
create policy "workspace_members_select_member"
on public.workspace_members for select
using (user_id = auth.uid() or public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_insert_admin" on public.workspace_members;
create policy "workspace_members_insert_admin"
on public.workspace_members for insert
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "workspace_members_update_admin" on public.workspace_members;
create policy "workspace_members_update_admin"
on public.workspace_members for update
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "workspace_members_delete_admin" on public.workspace_members;
create policy "workspace_members_delete_admin"
on public.workspace_members for delete
using (public.is_workspace_admin(workspace_id));

drop policy if exists "meetings_select_owner_or_workspace" on public.meetings;
create policy "meetings_select_owner_or_workspace"
on public.meetings for select
using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_member(workspace_id))
);

drop policy if exists "meetings_insert_owner_or_workspace" on public.meetings;
create policy "meetings_insert_owner_or_workspace"
on public.meetings for insert
with check (
  owner_id = auth.uid()
  and (workspace_id is null or public.is_workspace_member(workspace_id))
);

drop policy if exists "meetings_update_owner_or_admin" on public.meetings;
create policy "meetings_update_owner_or_admin"
on public.meetings for update
using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_admin(workspace_id))
)
with check (
  owner_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_admin(workspace_id))
);

drop policy if exists "meetings_delete_owner_or_admin" on public.meetings;
create policy "meetings_delete_owner_or_admin"
on public.meetings for delete
using (
  owner_id = auth.uid()
  or (workspace_id is not null and public.is_workspace_admin(workspace_id))
);

drop policy if exists "action_items_select_accessible_meeting" on public.action_items;
create policy "action_items_select_accessible_meeting"
on public.action_items for select
using (public.can_access_meeting(meeting_id));

drop policy if exists "action_items_insert_accessible_meeting" on public.action_items;
create policy "action_items_insert_accessible_meeting"
on public.action_items for insert
with check (public.can_access_meeting(meeting_id));

drop policy if exists "action_items_update_assignee_or_workspace" on public.action_items;
create policy "action_items_update_assignee_or_workspace"
on public.action_items for update
using (
  owner_email = auth.jwt()->>'email'
  or public.can_access_meeting(meeting_id)
)
with check (
  owner_email = auth.jwt()->>'email'
  or public.can_access_meeting(meeting_id)
);

drop policy if exists "action_items_delete_meeting_owner_or_admin" on public.action_items;
create policy "action_items_delete_meeting_owner_or_admin"
on public.action_items for delete
using (
  exists (
    select 1
    from public.meetings m
    where m.id = meeting_id
      and (
        m.owner_id = auth.uid()
        or (m.workspace_id is not null and public.is_workspace_admin(m.workspace_id))
      )
  )
);
