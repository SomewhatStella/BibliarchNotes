-- Let people leave a project they've been invited to.
--
-- Run this once in the Supabase SQL Editor.
--
-- The only DELETE policy on story_collaborators was "Story owners can remove
-- collaborators". Nothing allowed someone to remove THEMSELVES, so clicking
-- "Leave project" was silently refused: zero rows deleted, no error returned,
-- and the app happily reported success while the project stayed put.
--
-- This is additive. Policies are OR'd together, so owners keep their ability
-- to remove collaborators and users gain the ability to remove themselves.

DROP POLICY IF EXISTS "Users can leave collaborations they are part of" ON public.story_collaborators;
CREATE POLICY "Users can leave collaborations they are part of"
  ON public.story_collaborators FOR DELETE
  USING (user_id = auth.uid());

-- Check it worked: both DELETE policies should be listed.
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'story_collaborators'
  AND cmd = 'DELETE'
ORDER BY policyname;
