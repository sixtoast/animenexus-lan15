-- Run this in the Supabase SQL editor (Dashboard → SQL).

create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(text) > 0 and char_length(text) <= 280),
  created_at timestamptz not null default now()
);

create index if not exists confessions_created_at_idx
  on public.confessions (created_at desc);

alter table public.confessions enable row level security;

-- Anyone can read confessions
drop policy if exists "confessions_public_read" on public.confessions;
create policy "confessions_public_read"
  on public.confessions
  for select
  to anon, authenticated
  using (true);

-- Anyone can insert (anonymous board)
drop policy if exists "confessions_public_insert" on public.confessions;
create policy "confessions_public_insert"
  on public.confessions
  for insert
  to anon, authenticated
  with check (
    char_length(text) > 0
    and char_length(text) <= 280
  );

-- No public update/delete (moderate via dashboard or service role)
