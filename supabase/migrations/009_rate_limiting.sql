create table if not exists public.rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists rate_limit_hits_user_route_created_idx on public.rate_limit_hits(user_id, route, created_at);

alter table public.rate_limit_hits enable row level security;
-- No client-facing policies: all access goes through check_rate_limit().

-- Per-route limits are fixed inside the function (not parameters) so a
-- caller cannot raise their own ceiling by invoking the RPC directly with
-- different arguments. Unrecognized routes get a conservative default.
create or replace function public.check_rate_limit(p_route text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_window_seconds integer;
  v_count integer;
begin
  case p_route
    when 'transcribe' then v_max := 20; v_window_seconds := 600;
    when 'summarize' then v_max := 20; v_window_seconds := 600;
    else v_max := 10; v_window_seconds := 600;
  end case;

  delete from public.rate_limit_hits
  where user_id = auth.uid()
    and route = p_route
    and created_at < now() - make_interval(secs => v_window_seconds);

  insert into public.rate_limit_hits (user_id, route)
  values (auth.uid(), p_route);

  select count(*) into v_count
  from public.rate_limit_hits
  where user_id = auth.uid()
    and route = p_route
    and created_at >= now() - make_interval(secs => v_window_seconds);

  return v_count <= v_max;
end;
$$;

grant execute on function public.check_rate_limit(text) to authenticated;
grant select, insert, update, delete on public.rate_limit_hits to service_role;
grant execute on function public.check_rate_limit(text) to service_role;
