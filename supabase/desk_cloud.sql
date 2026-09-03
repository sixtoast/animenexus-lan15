-- AnimeNexus soft desk cloud (run in Supabase SQL Editor)
-- LocalStorage remains primary; this is optional cross-device restore.

create table if not exists public.desk_cloud (
  device_key text primary key,
  pack jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.desk_cloud enable row level security;

drop policy if exists "desk_cloud_select" on public.desk_cloud;
drop policy if exists "desk_cloud_upsert" on public.desk_cloud;
drop policy if exists "desk_cloud_update" on public.desk_cloud;

create policy "desk_cloud_select" on public.desk_cloud
  for select using (true);

create policy "desk_cloud_upsert" on public.desk_cloud
  for insert with check (true);

create policy "desk_cloud_update" on public.desk_cloud
  for update using (true);
