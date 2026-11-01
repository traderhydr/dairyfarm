-- Dairy Farm Manager: one JSON document per user, readable/writable only by its owner.
-- Safe to run more than once: it only creates what is missing.

create table if not exists public.farm_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  version    integer     not null default 1,
  updated_at timestamptz not null default now(),
  constraint farm_data_size check (octet_length(data::text) < 5000000)
);

alter table public.farm_data enable row level security;

drop policy if exists "farm_data_select_own" on public.farm_data;
create policy "farm_data_select_own" on public.farm_data
  for select using (auth.uid() = user_id);
drop policy if exists "farm_data_insert_own" on public.farm_data;
create policy "farm_data_insert_own" on public.farm_data
  for insert with check (auth.uid() = user_id);
drop policy if exists "farm_data_update_own" on public.farm_data;
create policy "farm_data_update_own" on public.farm_data
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "farm_data_delete_own" on public.farm_data;
create policy "farm_data_delete_own" on public.farm_data
  for delete using (auth.uid() = user_id);

create or replace function public.touch_farm_data()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists farm_data_touch on public.farm_data;
create trigger farm_data_touch before update on public.farm_data
  for each row execute function public.touch_farm_data();

-- Live updates between a user's devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'farm_data'
  ) then
    alter publication supabase_realtime add table public.farm_data;
  end if;
end $$;

-- In-app "delete my account" (required by Google Play / App Store).
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();  -- cascades to farm_data
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
