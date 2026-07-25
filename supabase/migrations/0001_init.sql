-- Gula phase 1 schema. Run in the Supabase SQL editor (or `supabase db push`).
-- Also required (dashboard): Authentication → Sign In / Up → enable "Anonymous sign-ins".

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  favorite_style text,
  home_city text,
  total_points integer not null default 0,
  total_logs integer not null default 0,
  current_streak integer not null default 0,
  share_with_community boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users manage own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- ── spots ───────────────────────────────────────────────────────────────────
create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text generated always as (lower(trim(name))) stored,
  address text,
  lat double precision,
  lng double precision,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists spots_normalized_name_idx on public.spots (normalized_name);
create index if not exists spots_lat_lng_idx on public.spots (lat, lng);

alter table public.spots enable row level security;

create policy "spots are readable by authenticated users"
  on public.spots for select to authenticated using (true);
create policy "authenticated users can add spots"
  on public.spots for insert to authenticated with check (created_by = auth.uid());

-- ── pizza_logs ──────────────────────────────────────────────────────────────
create table if not exists public.pizza_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id uuid references public.spots (id) on delete set null,
  spot_name text,
  logged_at timestamptz not null default now(),
  photo_url text,
  money_shot integer not null check (money_shot between 0 and 100),
  pizza_score integer check (pizza_score between 0 and 100),
  experience_score integer check (experience_score between 0 and 100),
  send_friend text,
  sub_scores jsonb not null default '{}',
  tags jsonb not null default '{}',
  notes text not null default '',
  points_earned integer not null default 0,
  lat double precision,
  lng double precision,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pizza_logs_user_idx on public.pizza_logs (user_id, logged_at desc);
create index if not exists pizza_logs_public_idx on public.pizza_logs (is_public, logged_at desc);

alter table public.pizza_logs enable row level security;

create policy "users manage own logs"
  on public.pizza_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public logs are readable"
  on public.pizza_logs for select to authenticated using (is_public = true);

-- ── achievements ────────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  earned_at timestamptz not null default now(),
  unique (user_id, type)
);

alter table public.achievements enable row level security;

create policy "users manage own achievements"
  on public.achievements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── storage: pizza photos ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('pizza-photos', 'pizza-photos', true)
on conflict (id) do nothing;

create policy "public read pizza photos"
  on storage.objects for select using (bucket_id = 'pizza-photos');
create policy "users upload own pizza photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pizza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own pizza photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'pizza-photos' and (storage.foldername(name))[1] = auth.uid()::text);
