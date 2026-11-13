-- Public view links: "anyone with this link can look at my story, no account needed".
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run more than once.
-- Additive only: one new table and one function. Nothing existing is changed.
--
-- A story has at most one public link. Only its owner can turn it on or off. Visitors never
-- touch the tables: public_story(token) hands back that one story's boards, read-only, and
-- nothing else (no collaborators, no emails). Turning the link off makes the token useless.
begin;

create table if not exists public.public_links (
  story_id uuid primary key references public.stories(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.public_links enable row level security;
revoke all on public.public_links from anon;

drop policy if exists public_links_owner_read on public.public_links;
create policy public_links_owner_read on public.public_links for select to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()));
drop policy if exists public_links_owner_insert on public.public_links;
create policy public_links_owner_insert on public.public_links for insert to authenticated
  with check (exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()));
drop policy if exists public_links_owner_delete on public.public_links;
create policy public_links_owner_delete on public.public_links for delete to authenticated
  using (exists (select 1 from public.stories s where s.id = story_id and s.user_id = auth.uid()));

-- The whole story for a public link, or null when the link doesn't exist (or was turned off).
create or replace function public.public_story(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'author', (select p.username from public.profiles p where p.id = s.user_id),
    'canvases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'story_id', c.story_id, 'canvas_type', c.canvas_type, 'nodes', c.nodes,
        'connections', c.connections, 'palette', c.palette, 'updated_at', c.updated_at))
      from public.canvas_data c where c.story_id = s.id), '[]'::jsonb)
  )
  from public.public_links l
  join public.stories s on s.id = l.story_id
  where length(coalesce(p_token, '')) >= 24 and l.token = p_token;
$$;
revoke all on function public.public_story(text) from public;
grant execute on function public.public_story(text) to anon, authenticated;

commit;
