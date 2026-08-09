-- Gula leaderboard. Run in the Supabase SQL editor (or `supabase db push`).
--
-- Both functions are `security definer` on purpose. A leaderboard has to read
-- across every user's rows, which row-level security deliberately forbids for
-- the calling user. Exposing them as functions keeps that widening narrow and
-- auditable: callers get ranked aggregates only, never the underlying logs.
--
-- PRIVACY: these rank every account, including users who have not opted into
-- `share_with_community`. That is the current product decision. To restrict
-- the board to opted-in users later, add `where p.share_with_community` to
-- both function bodies; no client change is needed.

-- ── all-time board ──────────────────────────────────────────────────────────
-- Reads the running totals already maintained on profiles.
create or replace function public.leaderboard_all_time(limit_count integer default 100)
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
  select
    rank() over (order by p.total_points desc)::integer,
    p.id,
    p.display_name,
    p.avatar_url,
    p.total_points,
    p.total_logs
  from public.profiles p
  where p.total_logs > 0
  order by p.total_points desc, p.total_logs desc
  limit limit_count;
$$;

-- ── windowed board (used for "this month") ──────────────────────────────────
-- The client passes local month boundaries so the board agrees with the
-- active-days calendar, which is keyed on local dates rather than UTC.
create or replace function public.leaderboard_range(
  range_start timestamptz,
  range_end timestamptz,
  limit_count integer default 100
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
    where l.logged_at >= range_start
      and l.logged_at < range_end
    group by l.user_id
  )
  select
    rank() over (order by t.points desc)::integer,
    t.uid,
    p.display_name,
    p.avatar_url,
    t.points,
    t.logs
  from totals t
  left join public.profiles p on p.id = t.uid
  order by t.points desc, t.logs desc
  limit limit_count;
$$;

create index if not exists pizza_logs_logged_at_idx on public.pizza_logs (logged_at);

revoke execute on function public.leaderboard_all_time(integer) from public, anon;
revoke execute on function public.leaderboard_range(timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.leaderboard_all_time(integer) to authenticated;
grant execute on function public.leaderboard_range(timestamptz, timestamptz, integer) to authenticated;
