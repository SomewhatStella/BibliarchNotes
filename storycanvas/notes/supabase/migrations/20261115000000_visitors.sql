-- Visitors without an account, and how many of them go on to make one.
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run more than once.
-- Additive only: two new tables and four functions. Nothing existing is changed.
--
-- How it works: a browser that isn't signed in gets a random ID (kept in that browser only,
-- no cookie). Each day it visits, the site notes the day, the first page it landed on and the
-- site that sent it (e.g. tiktok.com). No IP address, no name, no device details are stored.
-- When that browser later signs in, the ID is tied to the account once:
--   * the account was made after the first visit → it counts as a sign-up from that visit;
--   * the account is older → it was an existing user on a new device, and is left out of
--     "people without an account" altogether.
begin;

create table if not exists public.visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  first_day date not null default (now() at time zone 'America/Chicago')::date,
  landing_path text,
  referrer_host text,
  utm_source text,
  user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  outcome text check (outcome in ('signup', 'existing'))
);
create index if not exists visitors_first_day_idx on public.visitors (first_day);
create index if not exists visitors_claimed_idx on public.visitors (claimed_at) where outcome = 'signup';

create table if not exists public.visitor_days (
  visitor_id uuid not null references public.visitors(visitor_id) on delete cascade,
  day date not null,
  views integer not null default 1,
  primary key (visitor_id, day)
);
create index if not exists visitor_days_day_idx on public.visitor_days (day);

-- No policies: only the functions below touch these tables.
alter table public.visitors enable row level security;
alter table public.visitor_days enable row level security;
revoke all on public.visitors, public.visitor_days from anon, authenticated;

-- Called by the site for a browser that isn't signed in, once per page per visit.
create or replace function public.record_visit(p_visitor uuid, p_path text, p_referrer text default null, p_source text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d date := (now() at time zone 'America/Chicago')::date;
begin
  if p_visitor is null or auth.uid() is not null then return; end if;
  insert into public.visitors (visitor_id, landing_path, referrer_host, utm_source)
  values (p_visitor, left(p_path, 200), nullif(left(lower(p_referrer), 120), ''), nullif(left(lower(p_source), 60), ''))
  on conflict (visitor_id) do nothing;
  insert into public.visitor_days (visitor_id, day) values (p_visitor, d)
  on conflict (visitor_id, day) do update set views = least(public.visitor_days.views + 1, 10000);
end $$;
revoke all on function public.record_visit(uuid, text, text, text) from public;
grant execute on function public.record_visit(uuid, text, text, text) to anon, authenticated;

-- Called once by a signed-in browser that has a visitor ID: ties that ID to the account.
create or replace function public.claim_visitor(p_visitor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_visitor is null then return; end if;
  update public.visitors v
     set user_id = uid,
         claimed_at = now(),
         outcome = case when u.created_at >= v.first_seen - interval '10 minutes' then 'signup' else 'existing' end
    from auth.users u
   where v.visitor_id = p_visitor and v.user_id is null and v.outcome is null and u.id = uid;
end $$;
revoke all on function public.claim_visitor(uuid) from public, anon;
grant execute on function public.claim_visitor(uuid) to authenticated;

-- Where a visitor came from, in plain words.
create or replace function public.visitor_source(p_host text, p_utm text, p_landing text)
returns text language sql immutable set search_path = '' as $$
  select case
    when s ~ 'tiktok' then 'TikTok'
    when s ~ 'pinterest|pin\.it' then 'Pinterest'
    when s ~ 'tumblr' then 'Tumblr'
    when s ~ 'reddit' then 'Reddit'
    when s ~ 'discord' then 'Discord'
    when s ~ 'youtube|youtu\.be' then 'YouTube'
    when s ~ 'instagram' then 'Instagram'
    when s ~ '(^| )(x|twitter)( |$)|twitter\.com|(^| )x\.com|(^| )t\.co' then 'X / Twitter'
    when s ~ 'facebook|fb\.com|(^| )m\.facebook' then 'Facebook'
    when s ~ 'chatgpt|openai|perplexity|claude\.ai|gemini|copilot' then 'AI assistants'
    when s ~ 'google' then 'Google'
    when s ~ 'bing|duckduckgo|yahoo|ecosia|brave|yandex|baidu' then 'Other search engines'
    when coalesce(p_host, '') = '' and coalesce(p_utm, '') = '' and p_landing like '/notes/view/%' then 'Someone’s public story link'
    when coalesce(p_host, '') = '' and coalesce(p_utm, '') = '' then 'Direct or unknown'
    else coalesce(nullif(p_utm, ''), regexp_replace(p_host, '^www\.', ''))
  end
  from (select lower(coalesce(p_utm, '') || ' ' || coalesce(p_host, '')) as s) x;
$$;

-- Everything the admin page shows, already added up. Admins only.
create or replace function public.admin_visitor_summary(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  tz constant text := 'America/Chicago';
  today date := (now() at time zone tz)::date;
  win_start date;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  win_start := today - (greatest(1, least(coalesce(p_days, 30), 3660)) - 1);

  with anon_v as (   -- visitors who aren't existing users on another device
    select v.*, (v.claimed_at at time zone tz)::date as signup_day
    from public.visitors v
    where v.outcome is distinct from 'existing'
  ),
  per_day as (
    select g.d::date as day,
      (select count(*) from public.visitor_days vd join anon_v a using (visitor_id) where vd.day = g.d::date) as visitors,
      (select count(*) from anon_v a where a.first_day = g.d::date) as new_visitors,
      (select count(*) from anon_v a where a.outcome = 'signup' and a.signup_day = g.d::date) as signups
    from generate_series(win_start, today, interval '1 day') g(d)
  ),
  arrived as (       -- first visit inside the window: where they came from and whether they joined
    select public.visitor_source(a.referrer_host, a.utm_source, a.landing_path) as source,
      coalesce(nullif(a.landing_path, ''), '/') as landing,
      a.outcome = 'signup' as joined
    from anon_v a where a.first_day >= win_start
  )
  select jsonb_build_object(
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'visitors', visitors, 'new', new_visitors, 'signups', signups) order by day), '[]') from per_day),
    'unique_visitors', (select count(distinct vd.visitor_id) from public.visitor_days vd join anon_v a using (visitor_id) where vd.day >= win_start and vd.day < today),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('name', source, 'visitors', n, 'signups', j) order by n desc, source), '[]')
                from (select source, count(*) n, count(*) filter (where joined) j from arrived group by source) s),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('name', landing, 'visitors', n, 'signups', j) order by n desc, landing), '[]')
              from (select landing, count(*) n, count(*) filter (where joined) j from arrived group by landing order by n desc limit 15) p),
    'all_signups', (select count(*) from auth.users u where (u.created_at at time zone tz)::date between win_start and today - 1),
    'tracking_since', (select min(first_day) from public.visitors)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_visitor_summary(integer) from public, anon;
grant execute on function public.admin_visitor_summary(integer) to authenticated;

commit;
