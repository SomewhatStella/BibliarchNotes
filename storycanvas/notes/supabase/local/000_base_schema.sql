-- LOCAL DEVELOPMENT ONLY. Never run this against the live project.
--
-- The live Notes tables were created by the old storycanvas app and their SQL was never
-- committed here. This rebuilds the same shape (from src/types/supabase.ts and how the app
-- queries them) so a local Supabase in Docker can run Notes + Books end to end, with fake
-- accounts, without touching real users. Apply it first, then books/supabase/00*.sql, then
-- notes/supabase/migrations/*.sql.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  created_at timestamptz not null default now(),
  is_admin boolean default false,
  classification text
);
alter table public.profiles enable row level security;
create policy "Users can search profiles" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settings jsonb default '{}'::jsonb
);

create table if not exists public.story_collaborators (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (story_id, user_id)
);

create table if not exists public.canvas_data (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  canvas_type text not null,
  parent_id uuid,
  nodes jsonb not null default '[]'::jsonb,
  connections jsonb not null default '[]'::jsonb,
  palette jsonb,
  updated_at timestamptz not null default now(),
  unique (story_id, canvas_type)
);

create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  expires_at timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_name text,
  type text not null,
  title text not null,
  description text not null,
  page_url text,
  browser_info text,
  screen_size text,
  status text default 'new',
  priority text,
  admin_notes text
);

-- Access helpers (security definer so policies don't recurse into each other).
create or replace function public.story_role(p_story uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from stories s where s.id = p_story and s.user_id = auth.uid()) then 'owner'
    else (select sc.role from story_collaborators sc where sc.story_id = p_story and sc.user_id = auth.uid() and sc.accepted_at is not null limit 1)
  end;
$$;

alter table public.stories enable row level security;
create policy stories_read on public.stories for select to authenticated using (public.story_role(id) is not null);
create policy stories_insert on public.stories for insert to authenticated with check (user_id = auth.uid());
create policy stories_update on public.stories for update to authenticated using (public.story_role(id) in ('owner', 'editor'));
create policy stories_delete on public.stories for delete to authenticated using (user_id = auth.uid());

alter table public.story_collaborators enable row level security;
create policy collab_read on public.story_collaborators for select to authenticated
  using (user_id = auth.uid() or public.story_role(story_id) is not null);
create policy collab_owner_write on public.story_collaborators for all to authenticated
  using (public.story_role(story_id) = 'owner' or user_id = auth.uid())
  with check (public.story_role(story_id) = 'owner' or user_id = auth.uid());

alter table public.canvas_data enable row level security;
create policy canvas_read on public.canvas_data for select to authenticated using (public.story_role(story_id) is not null);
create policy canvas_insert on public.canvas_data for insert to authenticated with check (public.story_role(story_id) in ('owner', 'editor'));
create policy canvas_update on public.canvas_data for update to authenticated using (public.story_role(story_id) in ('owner', 'editor'));
create policy canvas_delete on public.canvas_data for delete to authenticated using (public.story_role(story_id) in ('owner', 'editor'));

alter table public.share_tokens enable row level security;
create policy tokens_owner on public.share_tokens for all to authenticated
  using (public.story_role(story_id) = 'owner') with check (public.story_role(story_id) = 'owner');

alter table public.feedback enable row level security;
create policy feedback_insert on public.feedback for insert with check (true);
create policy feedback_admin_read on public.feedback for select to authenticated
  using (coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false));
create policy feedback_admin_write on public.feedback for update to authenticated
  using (coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false));
create policy feedback_admin_delete on public.feedback for delete to authenticated
  using (coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false));

create or replace function public.accept_share_invite(invite_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t share_tokens;
begin
  select * into t from share_tokens where token = invite_token;
  if t.id is null then return jsonb_build_object('success', false, 'error', 'Invalid invite'); end if;
  if t.expires_at is not null and t.expires_at < now() then return jsonb_build_object('success', false, 'error', 'Invite expired'); end if;
  if t.max_uses is not null and t.use_count >= t.max_uses then return jsonb_build_object('success', false, 'error', 'Invite used up'); end if;
  insert into story_collaborators (story_id, user_id, role, invited_by, accepted_at)
  values (t.story_id, auth.uid(), t.role, t.created_by, now())
  on conflict (story_id, user_id) do update set accepted_at = coalesce(story_collaborators.accepted_at, now());
  update share_tokens set use_count = use_count + 1 where id = t.id;
  return jsonb_build_object('success', true, 'story_id', t.story_id);
end $$;
grant execute on function public.accept_share_invite(text) to authenticated;

create or replace function public.admin_user_activity() returns setof jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', p.id, 'email', p.email, 'username', p.username, 'created_at', p.created_at)
  from profiles p where coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.delete_own_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
grant execute on function public.delete_own_account() to authenticated;

insert into storage.buckets (id, name, public) values ('story-images', 'story-images', true) on conflict (id) do nothing;
create policy story_images_read on storage.objects for select using (bucket_id = 'story-images');
create policy story_images_write on storage.objects for insert to authenticated with check (bucket_id = 'story-images');
