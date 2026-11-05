# Supabase connection: implemented; live schema setup blocked

## Read-only verification
Existing Notes public URL identifies xmgfxmilnfeuqfflxzxz.supabase.co. The key JWT role is anon (not service_role). `/auth/v1/settings` returned 200, email auth enabled. Copied ONLY NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY into Books .env.local. No Notes files changed and no keys printed.

`projects`, `books_projects`, `books_libraries`, and `books_bug_reports` queries returned PGRST205 missing-table responses. Anonymous bucket listing returned an empty list (not proof no private buckets exist); requesting bibliarch-books returned Bucket not found. REST schema discovery requires a service key and was denied. No administrator environment credentials were found; sibling env contains only the two public variables.

## Required administrator action
Run supabase/002_books_isolated.sql ONCE in this project's SQL editor. Do NOT run the legacy 001_cloud.sql for this integration. 002 is additive: new books_* tables/functions/policies and the private bibliarch-books bucket, without modifying Notes tables. No migration was executed by this agent. Never put an administrator/service key in frontend env.

## Implemented
- Persistent authenticated session and refresh-token renewal; account-specific active library selection.
- Signed-in startup loads the selected/most recent remote library. Before replacement a device recovery snapshot is saved under bibliarch-books-recovery:<user>:<timestamp>. Local storage errors stop replacement.
- Explicit Import device library to cloud is required to upload an existing device library. Sign-in alone never uploads it.
- Once a cloud library is selected, serialized one-second debounced autosave runs even with cloud controls closed and on the library home screen. Device drafts remain separate recovery copies.
- Immutable JSON blobs (including embedded images/fonts) in private Supabase Storage; metadata and atomic version-check RPCs in namespaced Postgres tables. Bucket maximum 50 MiB per blob. Autosave conflict/network failure pauses with a visible message, never silently overwrites.
- Book deletions sync as library revisions. Whole-library deletion uses CAS, cascades revision metadata, then deletes recorded Storage blobs; partial cleanup failure is explicitly reported.
- Bug submission inserts account-owned reports and acknowledges only a returned backend ID. Existing local draft/download controls remain recovery options.

## Verification and limits
143 unit tests passed after initial implementation (139 existing plus four new); deletion test subsequently added and verified separately. TypeScript checked without emitting/building. Parent should run production build and the 18 release/browser tests; no .next build or server restart performed here.

Live sign-in, RLS isolation, uploads, CAS and bug writes are NOT verified: schema/bucket absent and no authenticated test account/admin credentials provided. Mock transport tests are not live evidence. After migration, test two separate accounts, refresh/reload, explicit import, autosave, stale-version conflict, blob cleanup, and actual bug receipt.

Session tokens live in browser localStorage (sign out on shared devices). Revision blobs consume storage until library deletion; interrupted uploads may leave owner-private orphan blobs requiring administrator cleanup. Storage and Postgres are not a distributed transaction. Collaboration UI is not exposed because blobs are owner-private. Recovery snapshots are device-only and can be exported via browser storage tooling; no recovery snapshot picker yet.

## 2026-11-04: live and verified
002 and the follow-up `003_books_owner_read.sql` were run on the Bibliarch project (SQL Editor). 003 fixes library creation: INSERT … RETURNING failed RLS because `books_project_access()` cannot see the row being inserted, so owners now read their own rows directly.
Verified live with throwaway accounts (since deleted, along with their books and storage blobs): sign-up → automatic upload → autosave (versions 1→4) → fresh browser restores the book and chapter text → a second account cannot list, read history, overwrite or delete the first account's library (403 access_denied).
