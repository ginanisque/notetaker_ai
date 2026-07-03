create table if not exists public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamp with time zone not null default now(),
  accepted_at timestamp with time zone,
  unique (workspace_id, invited_email)
);

create index if not exists workspace_invites_workspace_id_idx on public.workspace_invites(workspace_id);
create index if not exists workspace_invites_invited_email_idx on public.workspace_invites(lower(invited_email));

alter table public.workspace_invites enable row level security;

drop policy if exists "workspace_invites_select_related" on public.workspace_invites;
create policy "workspace_invites_select_related"
on public.workspace_invites for select
using (
  public.is_workspace_admin(workspace_id)
  or lower(invited_email) = lower(auth.jwt()->>'email')
);

drop policy if exists "workspace_invites_insert_admin" on public.workspace_invites;
create policy "workspace_invites_insert_admin"
on public.workspace_invites for insert
with check (public.is_workspace_admin(workspace_id) and invited_by = auth.uid());

drop policy if exists "workspace_invites_update_admin_or_invitee" on public.workspace_invites;
create policy "workspace_invites_update_admin_or_invitee"
on public.workspace_invites for update
using (
  public.is_workspace_admin(workspace_id)
  or lower(invited_email) = lower(auth.jwt()->>'email')
)
with check (
  public.is_workspace_admin(workspace_id)
  or lower(invited_email) = lower(auth.jwt()->>'email')
);

grant select, insert, update on public.workspace_invites to authenticated;
