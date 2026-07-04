alter table public.workspaces
add column if not exists stripe_customer_id text unique,
add column if not exists stripe_subscription_id text,
add column if not exists subscription_status text not null default 'free',
add column if not exists billing_interval text;

alter table public.workspaces drop constraint if exists workspaces_subscription_status_check;
alter table public.workspaces
add constraint workspaces_subscription_status_check check (subscription_status in ('free', 'active', 'past_due', 'canceled'));

alter table public.workspaces drop constraint if exists workspaces_billing_interval_check;
alter table public.workspaces
add constraint workspaces_billing_interval_check check (billing_interval is null or billing_interval in ('monthly', 'annual'));

create index if not exists workspaces_stripe_customer_id_idx on public.workspaces(stripe_customer_id);

-- No app code updates workspaces directly today (confirmed via grep), so
-- billing writes only ever happen via the admin/service-role client
-- (checkout route, webhook). Mirrors the same hardening applied to
-- profiles in 007 and meetings in 011.
revoke update on public.workspaces from authenticated;

-- Recreate check_and_increment_usage with an added optional workspace id so
-- a recording made into a Team-plan workspace also bypasses the caller's
-- personal usage cap. The parameter list changed, so the old single-arg
-- overload must be dropped explicitly or it would linger unused.
drop function if exists public.check_and_increment_usage(integer);

create or replace function public.check_and_increment_usage(p_seconds integer, p_workspace_id uuid default null)
returns table(allowed boolean, remaining_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap_seconds constant integer := 3600;
  v_status text;
  v_workspace_active boolean := false;
  v_period date := date_trunc('month', now())::date;
  v_current integer;
  v_requested integer := greatest(p_seconds, 0);
begin
  select subscription_status into v_status
  from public.profiles
  where id = auth.uid();

  if p_workspace_id is not null and public.is_workspace_member(p_workspace_id) then
    select (w.subscription_status = 'active') into v_workspace_active
    from public.workspaces w
    where w.id = p_workspace_id;
  end if;

  insert into public.usage_periods (user_id, period_start, transcription_seconds)
  values (auth.uid(), v_period, 0)
  on conflict (user_id, period_start) do nothing;

  select transcription_seconds into v_current
  from public.usage_periods
  where user_id = auth.uid() and period_start = v_period
  for update;

  if v_status = 'active' or coalesce(v_workspace_active, false) then
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

grant execute on function public.check_and_increment_usage(integer, uuid) to authenticated;
grant execute on function public.check_and_increment_usage(integer, uuid) to service_role;
