alter table public.profiles
add column if not exists stripe_customer_id text unique,
add column if not exists stripe_subscription_id text,
add column if not exists subscription_status text not null default 'free';

alter table public.profiles drop constraint if exists profiles_subscription_status_check;
alter table public.profiles
add constraint profiles_subscription_status_check check (subscription_status in ('free', 'active', 'past_due', 'canceled'));

create index if not exists profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);

-- Narrow the blanket update grant from 001 so a user cannot self-upgrade
-- their own subscription_status via the REST API. Only the service role
-- (Stripe webhook) may write the billing columns.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
