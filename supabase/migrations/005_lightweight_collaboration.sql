alter table public.action_items
add column if not exists assigned_user_id uuid references auth.users(id) on delete set null,
add column if not exists updated_at timestamp with time zone not null default now();

alter table public.action_items drop constraint if exists action_items_status_check;
alter table public.action_items
add constraint action_items_status_check check (status in ('open', 'in_progress', 'done'));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.meeting_tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone not null default now(),
  unique (workspace_id, name)
);

create table if not exists public.meeting_tag_links (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  tag_id uuid not null references public.meeting_tags(id) on delete cascade,
  primary key (meeting_id, tag_id)
);

create index if not exists comments_meeting_id_idx on public.comments(meeting_id);
create index if not exists meeting_tags_workspace_id_idx on public.meeting_tags(workspace_id);
create index if not exists meeting_tag_links_tag_id_idx on public.meeting_tag_links(tag_id);
create index if not exists action_items_assigned_user_id_idx on public.action_items(assigned_user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_action_items_updated_at on public.action_items;
create trigger touch_action_items_updated_at
before update on public.action_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_comments_updated_at on public.comments;
create trigger touch_comments_updated_at
before update on public.comments
for each row execute function public.touch_updated_at();

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = target_workspace_id
      and w.owner_id = auth.uid()
  );
$$;

alter table public.comments enable row level security;
alter table public.meeting_tags enable row level security;
alter table public.meeting_tag_links enable row level security;

drop policy if exists "comments_select_accessible_meeting" on public.comments;
create policy "comments_select_accessible_meeting"
on public.comments for select
using (public.can_access_meeting(meeting_id));

drop policy if exists "comments_insert_accessible_meeting" on public.comments;
create policy "comments_insert_accessible_meeting"
on public.comments for insert
with check (user_id = auth.uid() and public.can_access_meeting(meeting_id));

drop policy if exists "comments_delete_author_or_workspace_owner" on public.comments;
create policy "comments_delete_author_or_workspace_owner"
on public.comments for delete
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.meetings m
    where m.id = meeting_id
      and m.workspace_id is not null
      and public.is_workspace_owner(m.workspace_id)
  )
);

drop policy if exists "meeting_tags_select_member_or_personal" on public.meeting_tags;
create policy "meeting_tags_select_member_or_personal"
on public.meeting_tags for select
using (workspace_id is null or public.is_workspace_member(workspace_id));

drop policy if exists "meeting_tags_insert_member_or_personal" on public.meeting_tags;
create policy "meeting_tags_insert_member_or_personal"
on public.meeting_tags for insert
with check (workspace_id is null or public.is_workspace_member(workspace_id));

drop policy if exists "meeting_tag_links_select_accessible_meeting" on public.meeting_tag_links;
create policy "meeting_tag_links_select_accessible_meeting"
on public.meeting_tag_links for select
using (public.can_access_meeting(meeting_id));

drop policy if exists "meeting_tag_links_insert_accessible_meeting" on public.meeting_tag_links;
create policy "meeting_tag_links_insert_accessible_meeting"
on public.meeting_tag_links for insert
with check (public.can_access_meeting(meeting_id));

drop policy if exists "meeting_tag_links_delete_accessible_meeting" on public.meeting_tag_links;
create policy "meeting_tag_links_delete_accessible_meeting"
on public.meeting_tag_links for delete
using (public.can_access_meeting(meeting_id));

grant select, insert, update, delete on public.comments to authenticated;
grant select, insert, delete on public.meeting_tags to authenticated;
grant select, insert, delete on public.meeting_tag_links to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
