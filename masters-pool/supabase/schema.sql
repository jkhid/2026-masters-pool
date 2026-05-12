create extension if not exists pgcrypto;

do $$ begin
  create type contest_status as enum ('setup', 'open', 'revealed', 'complete', 'archived');
exception
  when duplicate_object then null;
end $$;

create table if not exists majors (
  key text primary key,
  name text not null,
  display_order integer not null
);

insert into majors (key, name, display_order)
values
  ('masters', 'Masters', 1),
  ('pga-championship', 'PGA Championship', 2),
  ('us-open', 'U.S. Open', 3),
  ('open-championship', 'The Open Championship', 4)
on conflict (key) do update set
  name = excluded.name,
  display_order = excluded.display_order;

create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  major_key text not null references majors(key),
  year integer not null check (year >= 1900),
  name text not null,
  status contest_status not null default 'setup',
  starts_at timestamptz,
  reveal_at timestamptz,
  expected_participants integer check (expected_participants is null or expected_participants > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (major_key, year)
);

-- Migration for existing contests tables
alter table contests
  add column if not exists expected_participants integer
  check (expected_participants is null or expected_participants > 0);

create table if not exists tiers (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  tier_number integer not null check (tier_number between 1 and 6),
  label text not null,
  created_at timestamptz not null default now(),
  unique (contest_id, tier_number)
);

create table if not exists tier_golfers (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references tiers(id) on delete cascade,
  name text not null,
  world_rank integer,
  seed integer,
  notes text,
  created_at timestamptz not null default now(),
  unique (tier_id, name)
);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  name_key text not null,
  display_name text not null,
  pin_salt text not null,
  pin_hash text not null,
  is_booted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contest_id, name_key)
);

create table if not exists picks (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  tier_id uuid not null references tiers(id) on delete cascade,
  golfer_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, tier_id)
);

create table if not exists result_snapshots (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  standings jsonb not null,
  scoring jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contests_status_idx on contests(status);
create index if not exists tiers_contest_idx on tiers(contest_id);
create index if not exists tier_golfers_tier_idx on tier_golfers(tier_id);
create index if not exists participants_contest_idx on participants(contest_id);
create index if not exists picks_participant_idx on picks(participant_id);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contests_touch_updated_at on contests;
create trigger contests_touch_updated_at
before update on contests
for each row execute function touch_updated_at();

drop trigger if exists participants_touch_updated_at on participants;
create trigger participants_touch_updated_at
before update on participants
for each row execute function touch_updated_at();

drop trigger if exists picks_touch_updated_at on picks;
create trigger picks_touch_updated_at
before update on picks
for each row execute function touch_updated_at();
