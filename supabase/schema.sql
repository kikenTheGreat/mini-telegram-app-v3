-- Telegram Mini App Database Schema
-- Run this in Supabase SQL Editor or via: supabase db push

-- Enable extensions (usually already enabled)
-- create extension if not exists "uuid-ossp";

-- Users bound to Telegram id (text to keep it simple)
create table if not exists profiles (
  user_id text primary key,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz default now()
);

-- Task progress (including daily)
create table if not exists task_progress (
  user_id text references profiles(user_id) on delete cascade,
  task_id text not null,
  status text not null check (status in ('default','completed','claimed')),
  updated_at timestamptz default now(),
  primary key (user_id, task_id)
);

-- Daily claims (unique per day)
create table if not exists daily_claims (
  user_id text references profiles(user_id) on delete cascade,
  claim_date date not null,
  created_at timestamptz default now(),
  unique (user_id, claim_date)
);

-- Spin history
create table if not exists spins (
  id bigserial primary key,
  user_id text references profiles(user_id) on delete cascade,
  username text,
  prize text,
  icon text,
  created_at timestamptz default now()
);
create index if not exists spins_user_created_idx on spins(user_id, created_at desc);

-- Invite events (share/click/join)
create table if not exists invite_events (
  id bigserial primary key,
  user_id text references profiles(user_id) on delete cascade,
  username text,
  event_type text not null check (event_type in ('share','click','join')),
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists invite_events_user_idx on invite_events(user_id, created_at desc);

-- Invite aggregate (for leaderboard)
create table if not exists invite_stats (
  user_id text primary key references profiles(user_id) on delete cascade,
  username text,
  invites integer not null default 0,
  updated_at timestamptz default now()
);
create index if not exists invite_stats_invites_idx on invite_stats(invites desc);

-- Monthly wager volume (month in yyyy-mm)
create table if not exists wager_monthly (
  user_id text references profiles(user_id) on delete cascade,
  username text,
  month text not null,
  volume numeric not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, month)
);
create index if not exists wager_monthly_month_vol_idx on wager_monthly(month, volume desc);

-- Enable RLS
alter table profiles enable row level security;
alter table task_progress enable row level security;
alter table daily_claims enable row level security;
alter table spins enable row level security;
alter table invite_events enable row level security;
alter table invite_stats enable row level security;
alter table wager_monthly enable row level security;

-- RLS Policies (adjust auth.uid() if using custom JWT claims)
-- For Telegram-only auth via Edge Functions, you can restrict client writes entirely

-- Profiles: users can read/write their own
create policy "profiles_self_select" on profiles
  for select using (true); -- public read for leaderboards

create policy "profiles_self_insert" on profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_self_update" on profiles
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Task progress: self read/write
create policy "task_progress_self_select" on task_progress
  for select using (auth.uid() = user_id);

create policy "task_progress_self_insert" on task_progress
  for insert with check (auth.uid() = user_id);

create policy "task_progress_self_update" on task_progress
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Daily claims: self read/write
create policy "daily_claims_self_select" on daily_claims
  for select using (auth.uid() = user_id);

create policy "daily_claims_self_insert" on daily_claims
  for insert with check (auth.uid() = user_id);

-- Spins: self read, insert only
create policy "spins_self_select" on spins
  for select using (auth.uid() = user_id);

create policy "spins_self_insert" on spins
  for insert with check (auth.uid() = user_id);

-- Invite events: self insert/read
create policy "invite_events_self_insert" on invite_events
  for insert with check (auth.uid() = user_id);

create policy "invite_events_self_select" on invite_events
  for select using (auth.uid() = user_id);

-- Leaderboards are public to authenticated users (no PII beyond username)
create policy "invite_stats_read_all" on invite_stats
  for select using (true); -- public read

create policy "wager_monthly_read_all" on wager_monthly
  for select using (true); -- public read

-- Helper function to increment invite count atomically
create or replace function inc_invite_stat(p_user_id text, p_username text default null)
returns void language plpgsql security definer as $$
begin
  insert into invite_stats (user_id, username, invites)
  values (p_user_id, p_username, 1)
  on conflict (user_id) do update 
    set invites = invite_stats.invites + 1, 
        updated_at = now(),
        username = coalesce(excluded.username, invite_stats.username);
end;
$$;

-- Helper function to record wager volume for current month
create or replace function record_wager(p_user_id text, p_username text, p_amount numeric)
returns void language plpgsql security definer as $$
declare
  v_month text := to_char(current_date, 'YYYY-MM');
begin
  insert into wager_monthly (user_id, username, month, volume)
  values (p_user_id, p_username, v_month, p_amount)
  on conflict (user_id, month) do update
    set volume = wager_monthly.volume + excluded.volume,
        updated_at = now(),
        username = coalesce(excluded.username, wager_monthly.username);
end;
$$;
