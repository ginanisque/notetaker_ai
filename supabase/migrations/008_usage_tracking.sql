create table if not exists public.usage_periods (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  transcription_seconds integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  primary key (user_id, period_start)
);

create index if not exists usage_periods_user_id_idx on public.usage_periods(user_id);

alter table public.usage_periods enable row level security;

drop policy if exists "usage_periods_select_own" on public.usage_periods;
create policy "usage_periods_select_own"
on public.usage_periods for select
using (user_id = auth.uid());

-- Free-tier cap is fixed inside the function (not a parameter) so a caller
-- cannot raise their own limit by invoking the RPC directly with a
-- different value.
create or replace function public.check_and_increment_usage(p_seconds integer)
returns table(allowed boolean, remaining_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap_seconds constant integer := 3600;
  v_status text;
  v_period date := date_trunc('month', now())::date;
  v_current integer;
  v_requested integer := greatest(p_seconds, 0);
begin
  select subscription_status into v_status
  from public.profiles
  where id = auth.uid();

  insert into public.usage_periods (user_id, period_start, transcription_seconds)
  values (auth.uid(), v_period, 0)
  on conflict (user_id, period_start) do nothing;

  select transcription_seconds into v_current
  from public.usage_periods
  where user_id = auth.uid() and period_start = v_period
  for update;

  if v_status = 'active' then
    update public.usage_periods
    set transcription_seconds = transcription_seconds + v_requested,
        updated_at = now()
    where user_id = auth.uid() and period_start = v_period;

    return query select true, null::integer;
    return;
  end if;

  if v_current + v_requested > v_cap_seconds then
    return query select false, greatest(v_cap_seconds - v_current, 0);
    return;
  end if;

  update public.usage_periods
  set transcription_seconds = transcription_seconds + v_requested,
      updated_at = now()
  where user_id = auth.uid() and period_start = v_period;

  return query select true, greatest(v_cap_seconds - (v_current + v_requested), 0);
end;
$$;

grant select on public.usage_periods to authenticated;
grant execute on function public.check_and_increment_usage(integer) to authenticated;

grant select, insert, update, delete on public.usage_periods to service_role;
grant execute on function public.check_and_increment_usage(integer) to service_role;
