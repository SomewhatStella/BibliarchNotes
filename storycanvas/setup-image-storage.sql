-- Image storage for Bibliarch canvases.
--
-- Run this ONCE in the Supabase SQL Editor.
--
-- Until this exists, image uploads fall back to keeping the picture as a local
-- base64 copy: the person who uploaded it sees it, nobody else does, and it
-- can vanish when a collaborator's edit overwrites the node. That was the
-- "images don't share in collaborative mode" bug.

-- 1. The bucket. Public read so <img src> works without signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'story-images',
  'story-images',
  true,
  10485760, -- 10 MB per image
  array['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Anyone can read (the bucket is public; this makes it explicit).
drop policy if exists "story images are publicly readable" on storage.objects;
create policy "story images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'story-images');

-- 3. Signed-in users can upload, but only into their own folder.
--    Paths are "<user-id>/<node-id>-<timestamp>.<ext>" - see uploadImage()
--    in src/lib/storage/image-upload.ts.
drop policy if exists "users upload their own story images" on storage.objects;
create policy "users upload their own story images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. And can replace or delete their own.
drop policy if exists "users update their own story images" on storage.objects;
create policy "users update their own story images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own story images" on storage.objects;
create policy "users delete their own story images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'story-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Check it worked.
select id, public, file_size_limit from storage.buckets where id = 'story-images';
