-- Safety net for Notes (feedback item 2: "I lost something I made, can I get it back?").
--
--   canvas_snapshots  Version history: a copy of a board taken at most every 10 minutes while
--                     it's edited (written by the client before a save), newest 20 per board kept.
--   deleted_nodes     Recently deleted: every card deleted from a board, with its list members and
--                     arrows, kept 30 days so it can be restored onto its original board.
--
-- Access mirrors canvas_data (inferred from the app; the production policies aren't in this repo):
-- the story owner and accepted collaborators can read; only the owner and accepted *editor*
-- collaborators can write. Viewers are read-only. No service role is involved anywhere.
--
-- Safe to apply more than once. The app works without it (panels say history isn't available yet).

create or replace function public.notes_story_access(p_story uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from stories s where s.id = p_story and s.user_id = auth.uid()) then 'owner'
    else (
      select sc.role from story_collaborators sc
      where sc.story_id = p_story and sc.user_id = auth.uid() and sc.accepted_at is not null
      limit 1
    )
  end;
$$;
revoke all on function public.notes_story_access(uuid) from public;
grant execute on function public.notes_story_access(uuid) to authenticated;

-- ── Version history ─────────────────────────────────────────────────────────
create table if not exists public.canvas_snapshots (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  canvas_type text not null,
  nodes jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  palette jsonb,
  reason text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists canvas_snapshots_board_idx on public.canvas_snapshots (story_id, canvas_type, created_at desc);

alter table public.canvas_snapshots enable row level security;
drop policy if exists canvas_snapshots_read on public.canvas_snapshots;
create policy canvas_snapshots_read on public.canvas_snapshots for select to authenticated
  using (public.notes_story_access(story_id) is not null);
drop policy if exists canvas_snapshots_insert on public.canvas_snapshots;
create policy canvas_snapshots_insert on public.canvas_snapshots for insert to authenticated
  with check (public.notes_story_access(story_id) in ('owner', 'editor') and created_by is not distinct from auth.uid());
-- No update/delete policies: versions are append-only for clients; the trigger below trims them.
grant select, insert on public.canvas_snapshots to authenticated;

create or replace function public.trim_canvas_snapshots() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from canvas_snapshots
  where story_id = new.story_id and canvas_type = new.canvas_type
    and id not in (
      select id from canvas_snapshots
      where story_id = new.story_id and canvas_type = new.canvas_type
      order by created_at desc
      limit 20
    );
  return null;
end $$;
drop trigger if exists canvas_snapshots_trim on public.canvas_snapshots;
create trigger canvas_snapshots_trim after insert on public.canvas_snapshots
  for each row execute function public.trim_canvas_snapshots();

-- ── Recently deleted ────────────────────────────────────────────────────────
create table if not exists public.deleted_nodes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  canvas_type text not null,
  node jsonb not null,
  members jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  deleted_by uuid default auth.uid() references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  restored_at timestamptz
);
create index if not exists deleted_nodes_story_idx on public.deleted_nodes (story_id, deleted_at desc);

alter table public.deleted_nodes enable row level security;
drop policy if exists deleted_nodes_read on public.deleted_nodes;
create policy deleted_nodes_read on public.deleted_nodes for select to authenticated
  using (public.notes_story_access(story_id) is not null);
drop policy if exists deleted_nodes_insert on public.deleted_nodes;
create policy deleted_nodes_insert on public.deleted_nodes for insert to authenticated
  with check (public.notes_story_access(story_id) in ('owner', 'editor') and deleted_by is not distinct from auth.uid());
drop policy if exists deleted_nodes_mark_restored on public.deleted_nodes;
create policy deleted_nodes_mark_restored on public.deleted_nodes for update to authenticated
  using (public.notes_story_access(story_id) in ('owner', 'editor'))
  with check (public.notes_story_access(story_id) in ('owner', 'editor'));
grant select, insert on public.deleted_nodes to authenticated;
-- Restoring only ever stamps restored_at; the deleted card itself can't be rewritten.
revoke update on public.deleted_nodes from authenticated;
grant update (restored_at) on public.deleted_nodes to authenticated;

create or replace function public.trim_deleted_nodes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from deleted_nodes where story_id = new.story_id and deleted_at < now() - interval '30 days';
  return null;
end $$;
drop trigger if exists deleted_nodes_trim on public.deleted_nodes;
create trigger deleted_nodes_trim after insert on public.deleted_nodes
  for each row execute function public.trim_deleted_nodes();
