-- 005: Stop anyone (even logged-out visitors) from reading every user's email.
--
-- Before: the policy "Users can search profiles" (SELECT, using true, role public)
-- let the public anon key list every profile with its email address.
-- After: a profile is readable only by
--   * its owner,
--   * admins (is_admin(), from 004),
--   * people connected to it through a story share (owner <-> collaborator,
--     inviter <-> invitee, fellow accepted collaborators).
-- Inviting someone goes through search_users(), which matches an exact email
-- (and returns it, since the person typed it) or a username fragment (email hidden).
-- Safe to run more than once.

begin;

create or replace function public.can_see_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    target = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.story_collaborators sc
      join public.stories s on s.id = sc.story_id
      where (s.user_id = auth.uid() and sc.user_id = target)
         or (s.user_id = target and sc.user_id = auth.uid())
         or (sc.invited_by = target and sc.user_id = auth.uid())
         or (sc.invited_by = auth.uid() and sc.user_id = target)
    )
    or exists (
      select 1
      from public.story_collaborators mine
      join public.story_collaborators theirs on theirs.story_id = mine.story_id
      where mine.user_id = auth.uid()
        and mine.accepted_at is not null
        and theirs.user_id = target
    )
  );
$$;
revoke all on function public.can_see_profile(uuid) from public, anon;
grant execute on function public.can_see_profile(uuid) to authenticated;

drop policy if exists "Users can view connected profiles" on public.profiles;
create policy "Users can view connected profiles" on public.profiles
  for select to authenticated
  using (public.can_see_profile(id));

create or replace function public.search_users(q text)
returns table (id uuid, username text, email text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  term text := btrim(coalesce(q, ''));
begin
  if auth.uid() is null or length(term) < 2 then
    return;
  end if;
  if position('@' in term) > 0 then
    -- Exact address only: you have to already know it.
    return query
      select p.id, p.username, p.email
      from public.profiles p
      where lower(p.email) = lower(term) and p.id <> auth.uid()
      limit 1;
  else
    -- Username fragment: emails stay hidden.
    return query
      select p.id, p.username, null::text
      from public.profiles p
      where p.username ilike '%' || replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
        and p.id <> auth.uid()
      order by length(p.username), p.username
      limit 10;
  end if;
end;
$$;
revoke all on function public.search_users(text) from public, anon;
grant execute on function public.search_users(text) to authenticated;

-- The open policy goes last, once the replacements above exist.
drop policy if exists "Users can search profiles" on public.profiles;

commit;
