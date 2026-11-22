-- WebWatch parcel persistence
-- Run this migration in the Supabase SQL Editor for your project.

create table if not exists public.tracked_parcels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tracking_number text not null check (char_length(tracking_number) between 5 and 100),
  carrier text not null check (char_length(carrier) between 1 and 120),
  current_status text,
  expected_delivery text,
  service_name text,
  latest_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracked_parcels_user_tracking_carrier_key unique (user_id, tracking_number, carrier)
);

create index if not exists tracked_parcels_user_updated_idx
  on public.tracked_parcels (user_id, updated_at desc);

alter table public.tracked_parcels enable row level security;

drop policy if exists "Users can read their own parcels" on public.tracked_parcels;
create policy "Users can read their own parcels"
  on public.tracked_parcels for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can save their own parcels" on public.tracked_parcels;
create policy "Users can save their own parcels"
  on public.tracked_parcels for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own parcels" on public.tracked_parcels;
create policy "Users can update their own parcels"
  on public.tracked_parcels for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own parcels" on public.tracked_parcels;
create policy "Users can delete their own parcels"
  on public.tracked_parcels for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tracked_parcels to authenticated;
