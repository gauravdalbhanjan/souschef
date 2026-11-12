-- SousChef database schema for Supabase (Postgres 15+).
-- Run this in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- Design:
--   * recipes + recipe_ingredients are SHARED, read-only catalog data.
--   * pantry, cart, cooking_sessions, receipts are PER-USER, protected by
--     Row Level Security so one user can never read or write another's rows.
--   * user_id defaults to auth.uid(), so the app never has to send it.

create extension if not exists pgcrypto;

-- ── Shared catalog ──────────────────────────────────────────────────────────
create table if not exists public.recipes (
  id           bigint generated always as identity primary key,
  slug         text unique not null,
  name         text not null,
  image        text,
  time_mins    integer not null default 20,
  kcal         integer not null default 0,
  servings     integer not null default 2,
  description  text,
  steps        jsonb not null default '[]'::jsonb,
  source       text,
  created_at   timestamptz not null default now()
);

create table if not exists public.recipe_ingredients (
  id          bigint generated always as identity primary key,
  recipe_id   bigint not null references public.recipes(id) on delete cascade,
  canonical   text not null,
  display     text not null,
  quantity    numeric not null default 0,
  unit        text not null default 'unit',
  optional    boolean not null default false,
  staple      boolean not null default false
);
create index if not exists idx_ri_recipe on public.recipe_ingredients(recipe_id);
create index if not exists idx_ri_canon  on public.recipe_ingredients(canonical);

-- ── Per-user data ───────────────────────────────────────────────────────────
create table if not exists public.pantry (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  canonical   text not null,
  display     text not null,
  category    text not null default 'Other',
  quantity    numeric not null default 0,
  unit        text not null default 'unit',
  brand       text,
  purchased   date,
  expiry      date,
  image       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- NULLS NOT DISTINCT: scanning the same unbranded item twice merges into one
  -- row instead of creating duplicates (plain UNIQUE treats NULLs as distinct).
  unique nulls not distinct (user_id, canonical, unit, brand)
);
create index if not exists idx_pantry_user on public.pantry(user_id);

create table if not exists public.cart (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  canonical   text not null,
  display     text not null,
  quantity    numeric not null default 1,
  unit        text not null default 'unit',
  category    text not null default 'Other',
  source      text,
  created_at  timestamptz not null default now(),
  unique (user_id, canonical, unit)
);
create index if not exists idx_cart_user on public.cart(user_id);

create table if not exists public.cooking_sessions (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  recipe_id     bigint not null references public.recipes(id),
  servings      integer not null default 1,
  status        text not null default 'in_progress'
                check (status in ('in_progress','completed','cancelled')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  depletion     jsonb
);
create index if not exists idx_sessions_user on public.cooking_sessions(user_id);

create table if not exists public.receipts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source      text not null,
  raw_text    text,
  items       jsonb,
  committed   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_receipts_user on public.receipts(user_id);

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.pantry              enable row level security;
alter table public.cart                enable row level security;
alter table public.cooking_sessions    enable row level security;
alter table public.receipts            enable row level security;

-- Catalog: anyone can read; nobody can write from the client (seed with SQL /
-- service role only).
drop policy if exists "catalog read recipes" on public.recipes;
create policy "catalog read recipes" on public.recipes
  for select to anon, authenticated using (true);

drop policy if exists "catalog read ingredients" on public.recipe_ingredients;
create policy "catalog read ingredients" on public.recipe_ingredients
  for select to anon, authenticated using (true);

-- Per-user tables: a user may only touch rows where user_id = their own id.
-- (select auth.uid()) is evaluated once per statement, not once per row.
do $$
declare t text;
begin
  foreach t in array array['pantry','cart','cooking_sessions','receipts']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;

-- Keep pantry.updated_at fresh.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_pantry_touch on public.pantry;
create trigger trg_pantry_touch before update on public.pantry
  for each row execute function public.touch_updated_at();
