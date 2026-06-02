-- ============================================================================
-- Spice Workshop — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
-- ============================================================================

-- One row per job. customer/vehicle/marks/line_items kept as JSONB so the whole
-- job is one read/write. For a single-shop tool this is simpler than 5 tables
-- and the data is naturally hierarchical (a job OWNS its items, never shared).
-- TRADE-OFF: you lose easy cross-job SQL like "total revenue from wraps". If you
-- need that reporting later, line_items should become its own table. Documented
-- on purpose so the choice is yours, not a hidden default.

create table if not exists jobs (
  id           uuid primary key default gen_random_uuid(),
  owner        uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  status       text not null default 'Quote' check (status in ('Quote','Invoice','Paid')),
  customer     jsonb not null default '{}'::jsonb,   -- {name, phone, email}
  vehicle      jsonb not null default '{}'::jsonb,   -- {make, model, year, plate, color, vin}
  marks        jsonb not null default '[]'::jsonb,   -- [{id,x,y,view,type,note}]
  line_items   jsonb not null default '[]'::jsonb,   -- [{id,desc,type,qty,price}]
  notes        text default '',
  discount     numeric not null default 0,
  tax_rate     numeric not null default 0,
  deposit      numeric not null default 0,
  photos       jsonb not null default '[]'::jsonb    -- [{path, caption}] -> Storage bucket
);

create index if not exists jobs_owner_idx on jobs(owner, created_at desc);

-- keep updated_at fresh
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists jobs_touch on jobs;
create trigger jobs_touch before update on jobs
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security: a user sees ONLY their own jobs. This is the whole
-- multi-user safety story. Without it, anyone logged in reads everyone's data.
-- ---------------------------------------------------------------------------
alter table jobs enable row level security;

drop policy if exists "own jobs select" on jobs;
create policy "own jobs select" on jobs for select using (auth.uid() = owner);

drop policy if exists "own jobs insert" on jobs;
create policy "own jobs insert" on jobs for insert with check (auth.uid() = owner);

drop policy if exists "own jobs update" on jobs;
create policy "own jobs update" on jobs for update using (auth.uid() = owner);

drop policy if exists "own jobs delete" on jobs;
create policy "own jobs delete" on jobs for delete using (auth.uid() = owner);

-- ---------------------------------------------------------------------------
-- Workshop settings (business name, currency, tax). One row per user.
-- ---------------------------------------------------------------------------
create table if not exists settings (
  owner      uuid primary key references auth.users(id) on delete cascade,
  biz_name   text default 'My Workshop',
  tagline    text default 'Dent · Coating · Wraps',
  phone      text default '',
  email      text default '',
  address    text default '',
  currency   text default 'Rs',
  tax_rate   numeric default 0,   -- GST off by default; toggle per-job or set a standing rate here
  updated_at timestamptz default now()
);

alter table settings enable row level security;
drop policy if exists "own settings" on settings;
create policy "own settings" on settings for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- ---------------------------------------------------------------------------
-- STORAGE for damage photos. Run AFTER creating a bucket named 'photos'
-- (Dashboard → Storage → New bucket → name: photos → Private).
-- These policies restrict each user to their own folder (photos/<uid>/...).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos write" on storage.objects;
create policy "own photos write" on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects for delete
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
