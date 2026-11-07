-- 004: account deletion that always works + admin tools for Notes/Books.
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- Why: the Books tables (002) point at auth.users without ON DELETE CASCADE, so anyone
-- who ever saved a book to the cloud could not delete their account — the database
-- refused to remove the user row while their books still referenced it.
begin;

-- 1. "Is the person calling this an admin?" Security definer so policies on profiles
--    can use it without recursing into their own RLS.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 2. Every foreign key in public that points at a user, a profile or a story and would
--    BLOCK a delete gets rebuilt: required column -> CASCADE, optional column -> SET NULL.
--    (Catches the Books tables and anything older we don't have SQL for.)
do $$
declare
  r record;
  act text;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl, a.attname as col, a.attnotnull as required,
           c.confrelid::regclass as reftbl, af.attname as refcol
    from pg_constraint c
    join pg_attribute a  on a.attrelid  = c.conrelid  and a.attnum  = c.conkey[1]
    join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
    where c.contype = 'f'
      and array_length(c.conkey, 1) = 1
      and c.connamespace = 'public'::regnamespace
      and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass, 'public.stories'::regclass)
      and c.confdeltype in ('a', 'r')          -- NO ACTION / RESTRICT
  loop
    act := case when r.required then 'cascade' else 'set null' end;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references %s(%I) on delete %s',
                   r.tbl, r.conname, r.col, r.reftbl, r.refcol, act);
    raise notice 'Fixed %.% -> on delete %', r.tbl, r.col, act;
  end loop;
end $$;

-- 2b. Older Supabase projects tie uploaded pictures (storage.objects.owner) to the user
--     with a blocking key. Loosen it to SET NULL if it exists; skip quietly if we aren't
--     allowed to change storage tables (newer projects don't have this key at all).
do $$
declare r record;
begin
  for r in
    select c.conname from pg_constraint c
    where c.contype = 'f' and c.conrelid = 'storage.objects'::regclass
      and c.confrelid = 'auth.users'::regclass and c.confdeltype in ('a', 'r')
  loop
    begin
      execute format('alter table storage.objects drop constraint %I', r.conname);
      execute format('alter table storage.objects add constraint %I foreign key (owner) references auth.users(id) on delete set null', r.conname);
      raise notice 'Fixed storage.objects.owner -> on delete set null';
    exception when others then
      raise notice 'Could not change storage.objects (%): %', r.conname, sqlerrm;
    end;
  end loop;
end $$;

-- 3. One call deletes everything, in one transaction: stories (and their boards),
--    profile, collaborations, Books projects, then the sign-in itself. If any step
--    fails nothing is half-deleted.
drop function if exists public.delete_own_account();
create function public.delete_own_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  delete from public.stories  where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users      where id = uid;
end $$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- 4. Admins can mark people (profiles.classification: "School", "Friends, tests, and family"...).
alter table public.profiles add column if not exists classification text;
drop policy if exists admin_update_profiles on public.profiles;
create policy admin_update_profiles on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 5. Admins can read, re-status, annotate and delete feedback.
alter table public.feedback add column if not exists priority text;
alter table public.feedback add column if not exists admin_notes text;
drop policy if exists admin_manage_feedback on public.feedback;
create policy admin_manage_feedback on public.feedback for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 6. Who's active: last sign-in and story activity per user (admins only).
drop function if exists public.admin_user_activity();
create function public.admin_user_activity()
returns table (id uuid, last_sign_in_at timestamptz, story_count bigint, last_story_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  return query
    select u.id, u.last_sign_in_at, coalesce(s.n, 0), s.last_at
    from auth.users u
    left join (
      select st.user_id, count(*) as n, max(st.updated_at) as last_at
      from public.stories st group by st.user_id
    ) s on s.user_id = u.id;
end $$;
revoke all on function public.admin_user_activity() from public, anon;
grant execute on function public.admin_user_activity() to authenticated;

commit;
