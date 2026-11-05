-- Fix for 002: creating a library failed with "new row violates row-level security".
-- INSERT ... RETURNING must also pass the SELECT policy, and books_project_access()
-- (a STABLE function) cannot see the row being inserted in the same statement.
-- Owners can always read their own rows; collaborators still go through the helper.
-- Only touches the Books table created by 002.
drop policy if exists projects_read on public.books_projects;
create policy projects_read on public.books_projects for select to authenticated
 using (owner_id = auth.uid() or public.books_project_access(id));
