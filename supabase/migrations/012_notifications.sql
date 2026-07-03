alter table public.profiles
add column if not exists notifications_read_at timestamp with time zone not null default now();

-- Only path to writing this column: profiles' update grant to authenticated
-- is already narrowed to full_name only (007_billing_columns.sql), so this
-- security-definer function is the sole way a user can mark their own
-- notifications read, consistent with the trash feature's pattern.
create or replace function public.mark_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set notifications_read_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.mark_notifications_read() to service_role;
