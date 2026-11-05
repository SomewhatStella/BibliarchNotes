-- Additive Books-only migration. Run ONCE in Supabase SQL Editor.
-- Does not modify Notes tables. Supersedes 001 for this app; do NOT run 001.
begin;
create table public.books_projects (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 200), content jsonb not null,
 version bigint not null default 1 check(version > 0), updated_at timestamptz not null default now()
);
create table public.books_project_members (
 project_id uuid not null references public.books_projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('reader','editor')), primary key(project_id,user_id)
);
create table public.books_project_versions (
 project_id uuid not null references public.books_projects(id) on delete cascade,
 version bigint not null, content jsonb not null, created_at timestamptz not null default now(),
 created_by uuid references auth.users(id), primary key(project_id,version)
);
alter table public.books_projects enable row level security;
alter table public.books_project_members enable row level security;
alter table public.books_project_versions enable row level security;
create function public.books_project_access(p_id uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.books_projects p where p.id=p_id and (p.owner_id=auth.uid() or exists(
 select 1 from public.books_project_members m where m.project_id=p.id and m.user_id=auth.uid() and (not p_write or m.role='editor'))));
$$;
revoke all on function public.books_project_access(uuid,boolean) from public;
grant execute on function public.books_project_access(uuid,boolean) to authenticated;
create policy projects_read on public.books_projects for select to authenticated using(public.books_project_access(id));
create policy projects_create on public.books_projects for insert to authenticated with check(owner_id=auth.uid() and version=1);
create policy members_read on public.books_project_members for select to authenticated using(public.books_project_access(project_id));
create policy versions_read on public.books_project_versions for select to authenticated using(public.books_project_access(project_id));
-- No direct updates/deletes: all writes must pass atomic CAS RPCs.
revoke all on public.books_projects,public.books_project_members,public.books_project_versions from anon,authenticated;
grant select,insert on public.books_projects to authenticated;
grant select on public.books_project_members,public.books_project_versions to authenticated;
create function public.books_snapshot_project() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.books_project_versions(project_id,version,content,created_by) values(new.id,new.version,new.content,auth.uid());
 return new;
end; $$;
revoke all on function public.books_snapshot_project() from public;
create trigger project_snapshot after insert or update on public.books_projects for each row execute function public.books_snapshot_project();
create function public.books_save_project(p_id uuid,p_expected_version bigint,p_content jsonb) returns public.books_projects
language plpgsql security definer set search_path='' as $$
declare result public.books_projects;
begin
 if not public.books_project_access(p_id,true) then raise exception 'access_denied' using errcode='42501'; end if;
 update public.books_projects set content=p_content,version=version+1,updated_at=now() where id=p_id and version=p_expected_version returning * into result;
 if not found then raise exception 'version_conflict' using errcode='40001'; end if;
 return result;
end; $$;
create function public.books_delete_project(p_id uuid,p_expected_version bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.books_projects where id=p_id and owner_id=auth.uid()) then raise exception 'access_denied' using errcode='42501'; end if;
 delete from public.books_projects where id=p_id and version=p_expected_version;
 if not found then raise exception 'version_conflict' using errcode='40001'; end if;
end; $$;
create function public.books_share_project(p_id uuid,p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.books_projects where id=p_id and owner_id=auth.uid()) then raise exception 'access_denied' using errcode='42501'; end if;
 if p_role not in ('reader','editor') then raise exception 'invalid_role'; end if;
 insert into public.books_project_members(project_id,user_id,role) values(p_id,p_user_id,p_role)
 on conflict(project_id,user_id) do update set role=excluded.role;
end; $$;
revoke all on function public.books_save_project(uuid,bigint,jsonb),public.books_delete_project(uuid,bigint),public.books_share_project(uuid,uuid,text) from public;
grant execute on function public.books_save_project(uuid,bigint,jsonb),public.books_delete_project(uuid,bigint),public.books_share_project(uuid,uuid,text) to authenticated;

create table public.books_bug_reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 description text not null check(length(description) between 1 and 10000),
 created_at timestamptz not null default now()
);
alter table public.books_bug_reports enable row level security;
revoke all on public.books_bug_reports from anon, authenticated;
grant select,insert on public.books_bug_reports to authenticated;
create policy books_bug_insert on public.books_bug_reports for insert to authenticated with check(owner_id=auth.uid());
create policy books_bug_read on public.books_bug_reports for select to authenticated using(owner_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('bibliarch-books','bibliarch-books',false,52428800,array['application/json']) on conflict(id) do nothing;
create policy books_blob_insert on storage.objects for insert to authenticated with check(
 bucket_id='bibliarch-books' and (storage.foldername(name))[1]=auth.uid()::text);
create policy books_blob_read on storage.objects for select to authenticated using(
 bucket_id='bibliarch-books' and (storage.foldername(name))[1]=auth.uid()::text);
create policy books_blob_delete on storage.objects for delete to authenticated using(
 bucket_id='bibliarch-books' and (storage.foldername(name))[1]=auth.uid()::text);
-- Immutable paths: no UPDATE permission. Old blobs retain recovery/history.
-- Collaboration is not exposed in the Books UI: blobs are owner-only.
commit;
