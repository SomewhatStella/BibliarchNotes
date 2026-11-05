from pathlib import Path
p=Path('supabase/001_cloud.sql').read_text().split('-- Optional private asset bucket.')[0]
import re
for name in ['project_members','project_versions','projects','project_access','snapshot_project','save_project','delete_project','share_project']:
 p=re.sub(r'\b'+name+r'\b','books_'+name,p)
p=p.replace('-- Run in Supabase SQL Editor as project administrator. No client service key.','-- Additive Books-only migration. Run ONCE in Supabase SQL Editor.\n-- Does not modify Notes tables. Supersedes 001 for this app; do NOT run 001.')
p+='''
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
'''
Path('supabase/002_books_isolated.sql').write_text(p)
