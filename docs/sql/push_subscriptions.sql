-- Run in Supabase SQL Editor (optional, for durable push endpoints)

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  p256dh text,
  auth text,
  prefs jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- Prefer service role for server writes. If using anon key only, tighten RLS.
alter table public.push_subscriptions enable row level security;

-- Allow inserts/updates from anon only if you intentionally use the anon key server-side.
-- Safer: use SUPABASE_SERVICE_ROLE_KEY in Vercel and no public policies.
