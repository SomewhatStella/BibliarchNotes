-- Run in Supabase SQL Editor as project administrator. No client service key.
begin;
create table public.projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 200), content jsonb not null,
 version bigint not null default 1 check(version > 0), updated_at timestamptz not null default now()
);
create table public.project_members (
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('reader','editor')), primary key(project_id,user_id)
);
create table public.project_versions (
 project_id uuid not null references public.projects(id) on delete cascade,
 version bigint not null, content jsonb not null, created_at timestamptz not null default now(),
 created_by uuid references auth.users(id), primary key(project_id,version)
);
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_versions enable row level security;
create function public.project_access(p_id uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.projects p where p.id=p_id and (p.owner_id=auth.uid() or exists(
 select 1 from public.project_members m where m.project_id=p.id and m.user_id=auth.uid() and (not p_write or m.role='editor'))));
$$;
revoke all on function public.project_access(uuid,boolean) from public;
grant execute on function public.project_access(uuid,boolean) to authenticated;
create policy projects_read on public.projects for select to authenticated using(public.project_access(id));
create policy projects_create on public.projects for insert to authenticated with check(owner_id=auth.uid() and version=1);
create policy members_read on public.project_members for select to authenticated using(public.project_access(project_id));
create policy versions_read on public.project_versions for select to authenticated using(public.project_access(project_id));
-- No direct updates/deletes: all writes must pass atomic CAS RPCs.
revoke all on public.projects,public.project_members,public.project_versions from anon,authenticated;
grant select,insert on public.projects to authenticated;
grant select on public.project_members,public.project_versions to authenticated;
create function public.snapshot_project() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.project_versions(project_id,version,content,created_by) values(new.id,new.version,new.content,auth.uid());
 return new;
end; $$;
revoke all on function public.snapshot_project() from public;
create trigger project_snapshot after insert or update on public.projects for each row execute function public.snapshot_project();
create function public.save_project(p_id uuid,p_expected_version bigint,p_content jsonb) returns public.projects
language plpgsql security definer set search_path='' as $$
declare result public.projects;
begin
 if not public.project_access(p_id,true) then raise exception 'access_denied' using errcode='42501'; end if;
 update public.projects set content=p_content,version=version+1,updated_at=now() where id=p_id and version=p_expected_version returning * into result;
 if not found then raise exception 'version_conflict' using errcode='40001'; end if;
 return result;
end; $$;
create function public.delete_project(p_id uuid,p_expected_version bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.projects where id=p_id and owner_id=auth.uid()) then raise exception 'access_denied' using errcode='42501'; end if;
 delete from public.projects where id=p_id and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='40001'; end if;
end; $$;
create function public.share_project(p_id uuid,p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.projects where id=p_id and owner_id=auth.uid()) then raise exception 'access_denied' using errcode='42501'; end if;
 if p_role not in ('reader','editor') then raise exception 'invalid_role'; end if;
 insert into public.project_members(project_id,user_id,role) values(p_id,p_user_id,p_role)
 on conflict(project_id,user_id) do update set role=excluded.role;
end; $$;
revoke all on function public.save_project(uuid,bigint,jsonb),public.delete_project(uuid,bigint),public.share_project(uuid,uuid,text) from public;
grant execute on function public.save_project(uuid,bigint,jsonb),public.delete_project(uuid,bigint),public.share_project(uuid,uuid,text) to authenticated;
-- Optional private asset bucket. Current UI stores embedded image data in JSON;
-- these policies are groundwork, not a claim that the UI uploads Storage assets.
insert into storage.buckets(id,name,public) values('bibliarch-assets','bibliarch-assets',false) on conflict(id) do nothing;
create policy bibliarch_asset_read on storage.objects for select to authenticated using(
 bucket_id='bibliarch-assets' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.project_access(p.id)));
create policy bibliarch_asset_insert on storage.objects for insert to authenticated with check(
 bucket_id='bibliarch-assets' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.project_access(p.id,true)));
create policy bibliarch_asset_update on storage.objects for update to authenticated using(
 bucket_id='bibliarch-assets' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.project_access(p.id,true))) with check(
 bucket_id='bibliarch-assets' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.project_access(p.id,true)));
create policy bibliarch_asset_delete on storage.objects for delete to authenticated using(
 bucket_id='bibliarch-assets' and exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and public.project_access(p.id,true)));
commit;
