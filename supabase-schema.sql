-- Imposter Game Database Schema
-- Run this in the Supabase SQL Editor

-- Rooms table
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'voting', 'results')),
  categories text[] not null default '{"Everyday Objects"}',
  imposter_count int not null default 1,
  time_limit int, -- seconds, null = disabled
  hint_type text not null default 'none' check (hint_type in ('none', 'category', 'word')),
  word text,
  hint_text text,
  created_at timestamptz not null default now()
);

-- Players table
create table players (
  id text primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  name text not null,
  is_imposter boolean not null default false,
  vote_for text,
  joined_at timestamptz not null default now()
);

-- Index for fast lookups
create index idx_rooms_code on rooms(code);
create index idx_players_room_id on players(room_id);

-- Enable Realtime
alter table rooms replica identity full;
alter table players replica identity full;

-- RLS policies (permissive for party game)
alter table rooms enable row level security;
alter table players enable row level security;

create policy "Anyone can read rooms" on rooms for select using (true);
create policy "Anyone can insert rooms" on rooms for insert with check (true);
create policy "Anyone can update rooms" on rooms for update using (true);
create policy "Anyone can delete rooms" on rooms for delete using (true);

create policy "Anyone can read players" on players for select using (true);
create policy "Anyone can insert players" on players for insert with check (true);
create policy "Anyone can update players" on players for update using (true);
create policy "Anyone can delete players" on players for delete using (true);

-- Add tables to realtime publication
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
