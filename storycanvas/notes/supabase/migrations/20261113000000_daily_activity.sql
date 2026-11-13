-- Daily active people for the admin page.
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run more than once.
-- Additive only: one new table and three functions. Nothing existing is changed.
--
-- Until now the database only kept each person's LAST sign-in, so there was no way to
-- say how many people used Bibliarch on a given day. From now on Notes and Books mark
-- "this person was here today" once a day (record_activity). For days before that,
-- admin_daily_activity also reads what Supabase already keeps: sign-ins and session
-- refreshes in the auth log, and when stories were created.
--
-- Days are counted in Central time (America/Chicago), so "today" matches the admin's clock.
begin;

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_activity_day_idx on public.daily_activity (day);
-- No policies: nobody reads or writes the table directly, only through the functions below.
alter table public.daily_activity enable row level security;
revoke all on public.daily_activity from anon, authenticated;

-- Called by the apps for the signed-in person. Only ever marks the caller, only for today.
create or replace function public.record_activity() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  insert into public.daily_activity (user_id, day)
  values (uid, (now() at time zone 'America/Chicago')::date)
  on conflict (user_id, day) do update set last_seen = now();
end $$;
revoke all on function public.record_activity() from public, anon;
grant execute on function public.record_activity() to authenticated;

-- One row per (day, person) who used the site in the last p_days days (today included).
-- Admins only. The page groups these into daily counts, averages and "who was on".
drop function if exists public.admin_daily_activity(integer);
create function public.admin_daily_activity(p_days integer default 90)
returns table (day date, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'America/Chicago';
  today date := (now() at time zone tz)::date;
  first_day date;
  since timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  first_day := today - (greatest(1, least(coalesce(p_days, 90), 3660)) - 1);
  since := first_day::timestamp at time zone tz;
  return query
    with seen as (
      select a.user_id as uid, a.day as d from public.daily_activity a where a.day >= first_day
      union
      -- Sign-ins, sign-ups and hourly session refreshes recorded by Supabase Auth.
      select (l.payload ->> 'actor_id')::uuid, (l.created_at at time zone tz)::date
      from auth.audit_log_entries l
      where l.created_at >= since
        and l.payload ->> 'action' in ('login', 'user_signedup', 'token_refreshed')
        and l.payload ->> 'actor_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      union
      -- Every session refresh issues a new refresh token, so these mark days someone had the site open.
      select r.user_id::uuid, (r.created_at at time zone tz)::date
      from auth.refresh_tokens r
      where r.created_at >= since
        and r.user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      union
      select s.user_id, (s.created_at at time zone tz)::date
      from public.stories s
      where s.created_at >= since
    )
    select seen.d, seen.uid
    from seen
    join auth.users u on u.id = seen.uid   -- leave out deleted accounts
    where seen.d between first_day and today
    order by seen.d, seen.uid;
end $$;
revoke all on function public.admin_daily_activity(integer) from public, anon;
grant execute on function public.admin_daily_activity(integer) to authenticated;

-- Sign-ups per day, from the same window, for the "new people" line.
drop function if exists public.admin_daily_signups(integer);
create function public.admin_daily_signups(p_days integer default 90)
returns table (day date, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'America/Chicago';
  today date := (now() at time zone tz)::date;
  first_day date;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  first_day := today - (greatest(1, least(coalesce(p_days, 90), 3660)) - 1);
  return query
    select (u.created_at at time zone tz)::date, u.id
    from auth.users u
    where u.created_at >= first_day::timestamp at time zone tz
    order by 1, 2;
end $$;
revoke all on function public.admin_daily_signups(integer) from public, anon;
grant execute on function public.admin_daily_signups(integer) to authenticated;

commit;
