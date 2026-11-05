# Optional Supabase cloud setup

Cloud is opt-in. Local libraries work without credentials or a server. No remote deployment, accounts, emails, or Supabase resources were created during implementation. Network tests use an isolated local HTTP server, not a live Supabase instance. The SQL migration still needs deployment and real multi-user policy verification.

## Activate deliberately

1. Create a Supabase project yourself. In its SQL Editor, run `supabase/001_cloud.sql` once. This creates projects, membership, immutable revision snapshots, CAS RPCs, RLS policies, and an optional private asset bucket. This is an initial migration, not an idempotent upgrade script; back up existing databases before applying.
2. Enable Email authentication in Supabase Auth; configure your application URL and confirmation email redirect allowlist. Keep email confirmation enabled for production. Configure SMTP/rate limits as appropriate.
3. Open the application's Optional cloud & collaboration panel. Enter `https://YOUR-PROJECT.supabase.co` and the public anon or publishable key. Never enter a secret/service-role key. The client rejects recognized privileged keys, non-HTTPS hosted origins, credentials in URLs, paths, query strings, and unrelated hosts. Supabase custom domains are intentionally unsupported.
4. Choose Use configuration, then sign in or explicitly create an account. Creating an account can send a confirmation email. Confirm it and sign in. Nothing uploads automatically.
5. Create remote copy of local library. A project contains the entire current library, not just the selected book. Image data embedded in library JSON travels with it. Projects are not encrypted end-to-end: project administrators and authorized members can read content.
6. A collaborator registers separately, signs in, and gives you the displayed user UUID. As project owner, enter that UUID and choose Reader or Editor, then confirm. This is real database membership, not an email invitation. Email-address lookup is deliberately not implemented to avoid exposing the Auth user directory. Reader can read; Editor can read/save; only owner can share/delete. Permission changes are supported by sharing again; membership revocation currently requires the SQL dashboard.

## Concurrency and recovery

Saving sends `p_expected_version` to `save_project`. The database atomically updates only that version, increments it, and snapshots the new content. A stale version produces `version_conflict`; the UI never retries by overwriting someone else's work. Deletion also checks the version. RLS and grants deny direct client updates to projects and all writes to membership/history tables. Definer RPCs use a fixed empty search path and explicitly verify auth.uid().

Optional polling checks every 15 seconds; it only raises a warning. It never loads remote content automatically. Reload asks before replacing the local library. Export a local backup first. To keep both versions, create a separate remote copy or open Manual merge. It displays read-only remote JSON and editable local JSON; combine deliberately and confirm. Validation uses the same parseLibrary boundary as local import. Merge saving also uses CAS against the displayed remote version. This is explicit manual JSON merging, not operational transforms, CRDT editing, live cursors, or automatic conflict resolution.

Revision history is listed by version/time/author. Full immutable content snapshots exist in project_versions for administrator recovery; the current UI does not offer historical-version restore. Deleting a project cascades its history and membership; local data remains. The optional Storage bucket is not deleted with project rows (objects should be cleaned by an administrator if subsequently used).

## Sessions and security

Only the project URL and public key persist in localStorage. Access tokens live in memory only, never localStorage, and passwords are cleared after authentication requests. Refresh tokens are not retained. Expiry requires signing in again. Signout clears the in-memory token even if the network call fails. Use HTTPS for the application and a restrictive CSP; browser XSS can still steal memory-held tokens. Do not share browser profiles on untrusted machines. A configured Supabase project can receive credentials entered in its sign-in form, so verify the project URL belongs to you.

There are no bundled credentials and no required environment variables. Client requests use native fetch with redirects rejected and a 20-second timeout. Localhost HTTP is allowed only by an explicit test-only constructor option, never by the panel.

## Storage: implemented policy groundwork, not fake upload support

The UI currently saves images embedded in project JSON. It does NOT upload files to Supabase Storage or issue signed asset URLs. The migration creates a private `bibliarch-assets` bucket with owner/member read and owner/editor write policies scoped to the first folder segment, the project UUID. A future storage uploader must use `PROJECT_UUID/filename`, validate image size/type, obtain private signed URLs, handle asset cleanup, and replace embedded data references safely. Until then database payload/storage limits apply; resize images and retain exported backups. No fake public image links are generated.

## Verify before production

Run `npm test` and `npx tsc --noEmit` locally. Tests in `tests/cloud.test.ts` use a deterministic HTTP fixture and cover URL/key rejection, authentication headers, expiration, and CAS conflict payloads. They do not prove Supabase deployment or RLS correctness.

With two real test users and a third nonmember, verify: anonymous/nonmember cannot read; reader cannot save/share/delete; editor can CAS-save but cannot share/delete; owner can change permissions/delete; stale simultaneous saves yield one success and one conflict; each success creates an immutable history row; direct REST PATCH/DELETE or history insertion is denied; expired sessions require login; optional asset paths cannot cross project boundaries. Do not call the integration production-verified until these checks pass against your deployed project.

## Component contracts

- `CloudPanel({library, onLoad})`: standalone client component. `onLoad` receives validated library data only after explicit load or successful manual merge. Parent persists/selects it using its normal local import path.
- `ChangeReview({scene, onChange})`: standalone client component. No model field additions: `Scene.suggestion = {before, at}` remains compatible.
- `reviewHunks` and `resolveHunk` implement individually actionable word/style diffs on compatible plain-text blocks, retaining serialized node properties. Cross-paragraph structure, nested nodes, block metadata, and oversized quadratic diffs fall back to an explicitly labeled whole-document structural change; the UI reveals exact before/after rich JSON so such changes are not hidden. Each hunk ID is snapshot-bound to prevent stale actions. Existing `editTracked`, `resolveTracked`, and `documentText` exports remain.
