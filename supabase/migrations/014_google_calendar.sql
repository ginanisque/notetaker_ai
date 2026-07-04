create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google',
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, provider)
);

create index if not exists calendar_connections_user_id_idx on public.calendar_connections(user_id);

alter table public.calendar_connections enable row level security;

-- This table holds live OAuth secrets, not just status flags, so it gets a
-- stricter posture than any other table in this app: no policies and no
-- grants for `authenticated` at all. Every read/write goes through our own
-- auth-checked API routes using the service-role/admin client.
grant select, insert, update, delete on public.calendar_connections to service_role;

alter table public.meetings
add column if not exists calendar_provider text,
add column if not exists calendar_event_id text,
add column if not exists calendar_event_url text,
add column if not exists attendees_json jsonb;
