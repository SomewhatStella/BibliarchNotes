# Notes-like cloud saving — implemented UI, backend blocked

## Live read-only evidence
- Auth settings HTTP 200: email enabled, mailer_autoconfirm true.
- books_projects and books_bug_reports: HTTP 404 / PGRST205 (missing schema-cache tables).
- bibliarch-books bucket lookup: NoSuchBucket. Anonymous lookup is not an administrative bucket inventory.
- Supabase CLI not found in PATH; administrator environment credentials absent. Browser dashboard resolves to Sign in, not an authorized administrator session.
- No remote writes, schema changes, deployments, commits, builds, or server restarts performed.
- Required administrator action: review/apply existing supabase/002_books_isolated.sql, not legacy 001. Public frontend keys cannot provision it.

## Implemented
- CloudPanel is now actually mounted continuously in both Books home and editor, with primary header status sourced from Supabase rather than IndexedDB.
- Account & saving entry exposes email/password sign-in and signup. Signup accepts the immediate session, matching live Notes auth settings. Persistent sessions refresh through existing REST implementation.
- Removed browser-only notice/footer claim. Backup controls moved into secondary Recovery menu (File menu in editor). Report a bug remains.
- Existing libraries are never automatically uploaded or replaced on sign-in. Explicit Open/Create cloud library consent is required. Once selected, changes autosave with a serialized one-second debounce, including when Account is closed.
- A load captures the current draft and identity before fetching; any intervening edit/account change rejects replacement. Recovery failure also stops replacement.
- Cloud create/save requires a backend metadata/version receipt before reporting Saved. New edits while a request is in flight remain Unsaved until their own acknowledgement. Errors/conflicts pause visibly; unload warning protects outstanding changes.
- Remote-loaded cloud drafts write account-scoped recovery keys, not the shared IndexedDB device library. Sign-out clears displayed cloud content, retaining recovery. Other-tab session changes stop autosaving and require reconnection.
- Ambiguous metadata responses retain the uploaded blob, rather than deleting a potentially committed revision.

## Scope / remaining differences from Notes
Notes source was read only: @supabase/ssr cookie-aware auth, canvas_data acknowledged upserts, separate story-images paths. Books uses its existing isolated REST auth/session implementation, NOT Notes' shared cookie/SSR session. Full cross-app SSO is not implemented. Books stores immutable library JSON including embedded assets in its private bucket; it does not alter Notes tables or asset code.

The first remote load is deliberately explicit (not automatic startup hydration) to avoid overwriting recovered offline drafts. Recovery copies have no picker yet. The original unowned device library is retained independently; it can still be explicitly imported. No existing data migration/deletion performed. Local recovery storage is not encrypted and is not protection against another person with browser developer-tools access.

## Verification
New tests were run RED first (three failures), then GREEN. Cloud/auth tests plus updated home UI test: 18/18 passed. TypeScript project check (`npx tsc --noEmit --incremental false`) passed after final edits. Full suite previously had 162 passing and one obsolete browser-only notice assertion; that assertion was updated to the requested behavior and its file rerun successfully. Existing PDF cleanup negative-test stderr is expected.

Parent still needs final full suite/build/browser checks. Live authenticated save, RLS two-account isolation, Storage uploads, refresh, and bug receipt remain unverified and blocked by missing backend setup/authorized test account. Do not describe cloud saving as operational until those checks pass.
