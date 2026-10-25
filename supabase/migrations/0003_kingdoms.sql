-- Pizza Quest phase 1. Run after 0001 and 0002, in the Supabase SQL editor
-- or with `supabase db push`. Safe to re-run.
--
-- Territories are half-open bounding boxes (min inclusive, max exclusive),
-- not H3 and not PostGIS. The same numbers and the same comparison live in
-- src/features/kingdoms.ts so a phone can assign a kingdom offline and this
-- trigger can confirm it. Smallest matching box wins; equal area breaks on
-- slug. A kingdom may have several boxes later without a schema change.
--
-- Crown rule (public rankings only):
--   * Rolling window of 30 days (24h days, not calendar months), overridable
--     per call and clamped to 1..365.
--   * Points are the log's points_earned, which already includes the kingdom
--     bonuses the client itemized at save time.
--   * dense_rank on those points. Exactly one player in first place holds
--     the crown. A tie for first is contested — log count does not break it,
--     and the crown's user is null.
--   * Only logs with is_public from profiles that currently have
--     share_with_community. Opting out drops a player from the public crown
--     immediately. Their private totals are untouched and still returned by
--     my_kingdom_scores.
--   * A leading total of 0 does not contend; an empty kingdom is vacant.
--
-- kingdom_scores is the all-time materialization (user, kingdom) maintained
-- by trigger. The crown does not read it — a stored total cannot roll forward
-- as days expire — so kingdom_crown and kingdom_leaderboard sum pizza_logs.

-- ── kingdoms ────────────────────────────────────────────────────────────────
create table if not exists public.kingdoms (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table if not exists public.kingdom_bounds (
  id uuid primary key default gen_random_uuid(),
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  min_lat double precision not null,
  max_lat double precision not null,
  min_lng double precision not null,
  max_lng double precision not null,
  check (min_lat < max_lat),
  check (min_lng < max_lng)
);

create index if not exists kingdom_bounds_kingdom_idx on public.kingdom_bounds (kingdom_id);

create table if not exists public.kingdom_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  kingdom_id uuid not null references public.kingdoms (id) on delete cascade,
  points integer not null default 0,
  log_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, kingdom_id)
);

create index if not exists kingdom_scores_kingdom_idx
  on public.kingdom_scores (kingdom_id, points desc);

alter table public.kingdoms enable row level security;
alter table public.kingdom_bounds enable row level security;
alter table public.kingdom_scores enable row level security;

drop policy if exists "kingdoms are readable by authenticated users" on public.kingdoms;
create policy "kingdoms are readable by authenticated users"
  on public.kingdoms for select to authenticated using (true);

drop policy if exists "kingdom bounds are readable by authenticated users" on public.kingdom_bounds;
create policy "kingdom bounds are readable by authenticated users"
  on public.kingdom_bounds for select to authenticated using (true);

drop policy if exists "users read own kingdom scores" on public.kingdom_scores;
create policy "users read own kingdom scores"
  on public.kingdom_scores for select to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies. Scores are written by the security-definer
-- trigger below; the catalog is seed data, not something a client creates.

-- ── Seattle seed ────────────────────────────────────────────────────────────
-- Numbers must match SEATTLE_KINGDOMS in src/features/kingdoms.ts.
insert into public.kingdoms (id, slug, name, city) values
  ('4b1a11a0-0000-4000-8000-000000000001', 'ballard', 'Ballard', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000002', 'fremont', 'Fremont', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000003', 'wallingford', 'Wallingford', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000004', 'green-lake', 'Green Lake', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000005', 'university-district', 'University District', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000006', 'queen-anne', 'Queen Anne', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000007', 'south-lake-union', 'South Lake Union', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000008', 'capitol-hill', 'Capitol Hill', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-000000000009', 'downtown', 'Downtown', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000a', 'international-district', 'International District', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000b', 'beacon-hill', 'Beacon Hill', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000c', 'georgetown', 'Georgetown', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000d', 'columbia-city', 'Columbia City', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000e', 'west-seattle', 'West Seattle', 'Seattle'),
  ('4b1a11a0-0000-4000-8000-00000000000f', 'magnolia', 'Magnolia', 'Seattle')
on conflict (id) do update
  set slug = excluded.slug,
      name = excluded.name,
      city = excluded.city;

delete from public.kingdom_bounds b
using public.kingdoms k
where b.kingdom_id = k.id
  and k.slug in (
    'ballard', 'fremont', 'wallingford', 'green-lake', 'university-district',
    'queen-anne', 'south-lake-union', 'capitol-hill', 'downtown',
    'international-district', 'beacon-hill', 'georgetown', 'columbia-city',
    'west-seattle', 'magnolia'
  );

insert into public.kingdom_bounds (kingdom_id, min_lat, max_lat, min_lng, max_lng) values
  ('4b1a11a0-0000-4000-8000-000000000001', 47.662, 47.695, -122.415, -122.35),
  ('4b1a11a0-0000-4000-8000-000000000002', 47.643, 47.662, -122.37, -122.335),
  ('4b1a11a0-0000-4000-8000-000000000003', 47.648, 47.668, -122.335, -122.315),
  ('4b1a11a0-0000-4000-8000-000000000004', 47.668, 47.695, -122.35, -122.315),
  ('4b1a11a0-0000-4000-8000-000000000005', 47.648, 47.672, -122.315, -122.29),
  ('4b1a11a0-0000-4000-8000-000000000006', 47.622, 47.643, -122.375, -122.348),
  ('4b1a11a0-0000-4000-8000-000000000007', 47.622, 47.643, -122.348, -122.328),
  ('4b1a11a0-0000-4000-8000-000000000008', 47.605, 47.643, -122.328, -122.296),
  ('4b1a11a0-0000-4000-8000-000000000009', 47.598, 47.622, -122.36, -122.332),
  ('4b1a11a0-0000-4000-8000-00000000000a', 47.59, 47.605, -122.332, -122.312),
  ('4b1a11a0-0000-4000-8000-00000000000b', 47.555, 47.59, -122.32, -122.292),
  ('4b1a11a0-0000-4000-8000-00000000000c', 47.53, 47.555, -122.335, -122.3),
  ('4b1a11a0-0000-4000-8000-00000000000d', 47.548, 47.575, -122.292, -122.27),
  ('4b1a11a0-0000-4000-8000-00000000000e', 47.54, 47.59, -122.42, -122.355),
  ('4b1a11a0-0000-4000-8000-00000000000f', 47.63, 47.662, -122.412, -122.38);

-- ── assignment ──────────────────────────────────────────────────────────────
create or replace function public.kingdom_at(p_lat double precision, p_lng double precision)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.kingdom_id
  from public.kingdom_bounds b
  join public.kingdoms k on k.id = b.kingdom_id
  where p_lat >= b.min_lat and p_lat < b.max_lat
    and p_lng >= b.min_lng and p_lng < b.max_lng
  order by ((b.max_lat - b.min_lat) * (b.max_lng - b.min_lng)) asc, k.slug asc
  limit 1;
$$;

alter table public.pizza_logs
  add column if not exists kingdom_id uuid references public.kingdoms (id) on delete set null;

create index if not exists pizza_logs_kingdom_window_idx
  on public.pizza_logs (kingdom_id, logged_at desc)
  where kingdom_id is not null and is_public;

-- Overwrites any client-supplied kingdom_id. A full device fix wins. When
-- either coordinate is missing, both are taken from the spot so a latitude
-- from the phone is never paired with a longitude from the shop — the same
-- rule as resolveLogCoords in src/features/kingdoms.ts.
create or replace function public.assign_log_kingdom()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  spot_lat double precision;
  spot_lng double precision;
begin
  if (new.lat is null or new.lng is null) and new.spot_id is not null then
    select s.lat, s.lng into spot_lat, spot_lng
    from public.spots s
    where s.id = new.spot_id;
    if spot_lat is not null and spot_lng is not null then
      new.lat := spot_lat;
      new.lng := spot_lng;
    end if;
  end if;

  if new.lat is not null and new.lng is not null then
    new.kingdom_id := public.kingdom_at(new.lat, new.lng);
  else
    new.kingdom_id := null;
  end if;
  return new;
end;
$$;

create or replace function public.refresh_kingdom_score(p_user uuid, p_kingdom uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_points integer;
  total_logs integer;
begin
  if p_user is null or p_kingdom is null then
    return;
  end if;

  select coalesce(sum(l.points_earned), 0)::integer, count(*)::integer
    into total_points, total_logs
  from public.pizza_logs l
  where l.user_id = p_user and l.kingdom_id = p_kingdom;

  if total_logs = 0 then
    delete from public.kingdom_scores
    where user_id = p_user and kingdom_id = p_kingdom;
    return;
  end if;

  insert into public.kingdom_scores (user_id, kingdom_id, points, log_count, updated_at)
  values (p_user, p_kingdom, total_points, total_logs, now())
  on conflict (user_id, kingdom_id) do update
    set points = excluded.points,
        log_count = excluded.log_count,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.sync_kingdom_score_from_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_kingdom_score(old.user_id, old.kingdom_id);
    return old;
  end if;

  if tg_op = 'UPDATE'
     and (old.user_id is distinct from new.user_id or old.kingdom_id is distinct from new.kingdom_id) then
    perform public.refresh_kingdom_score(old.user_id, old.kingdom_id);
  end if;

  perform public.refresh_kingdom_score(new.user_id, new.kingdom_id);
  return new;
end;
$$;

drop trigger if exists pizza_logs_assign_kingdom on public.pizza_logs;
create trigger pizza_logs_assign_kingdom
  before insert or update on public.pizza_logs
  for each row execute function public.assign_log_kingdom();

drop trigger if exists pizza_logs_sync_kingdom_score on public.pizza_logs;
create trigger pizza_logs_sync_kingdom_score
  after insert or update or delete on public.pizza_logs
  for each row execute function public.sync_kingdom_score_from_log();

-- Touch every log so the BEFORE trigger backfills kingdom_id and copies a
-- spot pin onto logs that were saved without a device fix. updated_at is
-- unchanged on purpose: this must not make every cloud row look newer than
-- the phone's copy. The AFTER trigger rebuilds kingdom_scores per row; the
-- statement below rewrites them once so a re-run is authoritative.
update public.pizza_logs set updated_at = updated_at;

delete from public.kingdom_scores;
insert into public.kingdom_scores (user_id, kingdom_id, points, log_count, updated_at)
select
  l.user_id,
  l.kingdom_id,
  coalesce(sum(l.points_earned), 0)::integer,
  count(*)::integer,
  now()
from public.pizza_logs l
where l.kingdom_id is not null
group by l.user_id, l.kingdom_id;

-- ── reads ───────────────────────────────────────────────────────────────────
-- security definer, same reason as the global leaderboard: a ranking has to
-- read other people's rows, and RLS deliberately forbids that. Each function
-- returns aggregates only. my_kingdom_scores is filtered to auth.uid().

create or replace function public.kingdoms_near(
  p_lat double precision,
  p_lng double precision,
  radius_km double precision default 12
)
returns table (
  id uuid,
  slug text,
  name text,
  city text,
  center_lat double precision,
  center_lng double precision,
  distance_km double precision,
  contains_point boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with boxes as (
    select
      k.id as kingdom_id,
      k.slug as kingdom_slug,
      k.name as kingdom_name,
      k.city as kingdom_city,
      min(b.min_lat) as min_lat,
      max(b.max_lat) as max_lat,
      min(b.min_lng) as min_lng,
      max(b.max_lng) as max_lng,
      bool_or(
        p_lat >= b.min_lat and p_lat < b.max_lat
        and p_lng >= b.min_lng and p_lng < b.max_lng
      ) as inside
    from public.kingdoms k
    join public.kingdom_bounds b on b.kingdom_id = k.id
    group by k.id, k.slug, k.name, k.city
  ),
  located as (
    select
      boxes.kingdom_id,
      boxes.kingdom_slug,
      boxes.kingdom_name,
      boxes.kingdom_city,
      (boxes.min_lat + boxes.max_lat) / 2 as c_lat,
      (boxes.min_lng + boxes.max_lng) / 2 as c_lng,
      boxes.inside,
      (
        6371 * 2 * asin(least(1, sqrt(
          power(sin(radians(((boxes.min_lat + boxes.max_lat) / 2) - p_lat) / 2), 2)
          + cos(radians(p_lat)) * cos(radians((boxes.min_lat + boxes.max_lat) / 2))
            * power(sin(radians(((boxes.min_lng + boxes.max_lng) / 2) - p_lng) / 2), 2)
        )))
      ) as dist
    from boxes
  )
  select
    located.kingdom_id,
    located.kingdom_slug,
    located.kingdom_name,
    located.kingdom_city,
    located.c_lat,
    located.c_lng,
    located.dist,
    located.inside
  from located
  where located.inside
     or located.dist <= least(greatest(coalesce(radius_km, 12), 0), 100)
  order by located.inside desc, located.dist asc, located.kingdom_slug asc;
$$;

create or replace function public.kingdom_leaderboard(
  target_kingdom uuid,
  window_days integer default 30,
  limit_count integer default 50
)
returns table (
  rank integer,
  user_id uuid,
  display_name text,
  avatar_url text,
  points integer,
  logs integer
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      l.user_id as uid,
      coalesce(sum(l.points_earned), 0)::integer as points,
      count(*)::integer as logs
    from public.pizza_logs l
    join public.profiles p on p.id = l.user_id
    where l.kingdom_id = target_kingdom
      and l.is_public
      and p.share_with_community
      and l.logged_at >= now() - make_interval(
        days => least(greatest(coalesce(window_days, 30), 1), 365)
      )
    group by l.user_id
    having coalesce(sum(l.points_earned), 0) > 0
  )
  select
    dense_rank() over (order by t.points desc)::integer,
    t.uid,
    p.display_name,
    p.avatar_url,
    t.points,
    t.logs
  from totals t
  left join public.profiles p on p.id = t.uid
  order by t.points desc, t.logs desc, t.uid
  limit least(greatest(coalesce(limit_count, 50), 1), 200);
$$;

create or replace function public.kingdom_crown(
  target_kingdom uuid,
  window_days integer default 30
)
returns table (
  kingdom_id uuid,
  status text,
  user_id uuid,
  display_name text,
  avatar_url text,
  points integer,
  logs integer,
  holder_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      l.user_id as uid,
      coalesce(sum(l.points_earned), 0)::integer as points,
      count(*)::integer as logs
    from public.pizza_logs l
    join public.profiles p on p.id = l.user_id
    where l.kingdom_id = target_kingdom
      and l.is_public
      and p.share_with_community
      and l.logged_at >= now() - make_interval(
        days => least(greatest(coalesce(window_days, 30), 1), 365)
      )
    group by l.user_id
    having coalesce(sum(l.points_earned), 0) > 0
  ),
  ranked as (
    select
      t.uid,
      t.points,
      t.logs,
      dense_rank() over (order by t.points desc) as rnk
    from totals t
  ),
  top as (
    select ranked.uid, ranked.points, ranked.logs
    from ranked
    where ranked.rnk = 1
  ),
  summary as (
    select
      count(*)::integer as holders,
      coalesce(max(top.points), 0)::integer as top_points
    from top
  ),
  winner as (
    select top.uid, top.logs
    from top
    join summary on summary.holders = 1
  )
  select
    target_kingdom,
    case
      when summary.holders = 0 then 'vacant'
      when summary.holders = 1 then 'held'
      else 'contested'
    end,
    winner.uid,
    p.display_name,
    p.avatar_url,
    summary.top_points,
    winner.logs,
    summary.holders
  from summary
  left join winner on true
  left join public.profiles p on p.id = winner.uid;
$$;

create or replace function public.my_kingdom_scores(window_days integer default 30)
returns table (
  kingdom_id uuid,
  kingdom_name text,
  city text,
  points integer,
  logs integer,
  all_time_points integer,
  all_time_logs integer
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select l.kingdom_id as kid, l.points_earned, l.logged_at
    from public.pizza_logs l
    where l.user_id = auth.uid()
      and l.kingdom_id is not null
  ),
  rolled as (
    select
      mine.kid,
      coalesce(sum(mine.points_earned), 0)::integer as summed_points,
      count(*)::integer as summed_logs,
      coalesce(sum(mine.points_earned) filter (
        where mine.logged_at >= now() - make_interval(
          days => least(greatest(coalesce(window_days, 30), 1), 365)
        )
      ), 0)::integer as window_points,
      count(*) filter (
        where mine.logged_at >= now() - make_interval(
          days => least(greatest(coalesce(window_days, 30), 1), 365)
        )
      )::integer as window_logs
    from mine
    group by mine.kid
  )
  select
    rolled.kid,
    k.name,
    k.city,
    rolled.window_points,
    rolled.window_logs,
    -- Prefer the trigger-maintained all-time row; fall back to the sum when
    -- the trigger has not caught up yet. A missing row is null, so a stored
    -- zero (a real total) is preserved.
    case when s.kingdom_id is not null then s.points else rolled.summed_points end,
    case when s.kingdom_id is not null then s.log_count else rolled.summed_logs end
  from rolled
  join public.kingdoms k on k.id = rolled.kid
  left join public.kingdom_scores s
    on s.kingdom_id = rolled.kid and s.user_id = auth.uid()
  order by rolled.window_points desc, rolled.summed_points desc, k.name asc;
$$;

revoke execute on function public.kingdom_at(double precision, double precision) from public, anon;
revoke execute on function public.assign_log_kingdom() from public, anon;
revoke execute on function public.sync_kingdom_score_from_log() from public, anon;
revoke execute on function public.refresh_kingdom_score(uuid, uuid) from public, anon;
revoke execute on function public.kingdoms_near(double precision, double precision, double precision) from public, anon;
revoke execute on function public.kingdom_leaderboard(uuid, integer, integer) from public, anon;
revoke execute on function public.kingdom_crown(uuid, integer) from public, anon;
revoke execute on function public.my_kingdom_scores(integer) from public, anon;

-- Trigger functions need execute for the signed-in role that writes a log.
-- refresh_kingdom_score only recomputes from pizza_logs; it cannot invent points.
grant execute on function public.kingdom_at(double precision, double precision) to authenticated;
grant execute on function public.assign_log_kingdom() to authenticated;
grant execute on function public.sync_kingdom_score_from_log() to authenticated;
grant execute on function public.refresh_kingdom_score(uuid, uuid) to authenticated;
grant execute on function public.kingdoms_near(double precision, double precision, double precision) to authenticated;
grant execute on function public.kingdom_leaderboard(uuid, integer, integer) to authenticated;
grant execute on function public.kingdom_crown(uuid, integer) to authenticated;
grant execute on function public.my_kingdom_scores(integer) to authenticated;
