# Launch safety review: storage, backup/import, PDF API

Scope: src/model.ts, src/library-storage.ts, src/cloud.ts, and the actual PDF API at app/api/pdf/route.ts. No central editor UI or publishing.ts changes by this reviewer. No deployment, commits, real user browser profile, or real user storage access.

## Confirmed defects fixed (regression tests written and observed failing first)

1. A rejected LibraryStore.load promise was cached forever. Failed initialization now permits retry after storage access recovers; successful initialization remains cached.
2. An existing empty legacy storage value was treated as a fresh library. It now fails validation and remains protected; startup cannot silently enable a seed overwrite.
3. Recovery download failed immediately when IndexedDB reads failed, even if original legacy bytes remained available. storedRaw now falls back to those bytes, and still reports the failure when no legacy value exists. Legacy bytes may be older than the inaccessible IndexedDB copy; they are recovery material, not proof of the latest save.
4. The legacy saveLibrary API could persist an invalid library. It now applies the same parser validation before writing. Existing limits and stored data are unchanged.
5. PDF POST accepted explicit foreign browser origins. It now rejects a different Origin or cross-site Fetch Metadata before body parsing/Chromium launch. This is browser cross-origin request protection, NOT authentication or abuse prevention.
6. PDF input errors exposed arbitrary exception messages. Responses now use a fixed validation message.
7. Browser cleanup rejection could replace a successful PDF response with an exception and permanently retain the process-local render lock. Cleanup failures are logged without losing the response, and the lock resets in a finally block. Timeout-triggered close rejection is also handled.

## Verification actually run

- Before changes: both new test files failed, all seven new regression tests red, demonstrating the reported defects.
- After changes: `npx vitest run tests/launch-storage.test.ts tests/launch-pdf-api.test.ts tests/library-storage.test.ts tests/model.test.ts tests/cloud.test.ts` — 5 files, 31 tests passed.
- `npx tsc --noEmit` — passed with the project configuration.
- Full `npm test` during parallel-agent edits — 129 passed, 2 failed, 34 files. Both failures were in the other reviewer's newly added tests/export-launch.test.ts (paragraph spacing and full-page illustration height); none were in this scope. A final integrated suite rerun remains necessary after that reviewer finishes.
- Existing storage tests exercised migration preservation, corrupt storage protection, explicit replacement, oversized legacy-cap backups, failed-save recovery, queued snapshots, and stale-tab compare-and-swap using fake backends.
- Existing cloud tests passed using a local HTTP fixture: restricted Supabase origins, service-role-key rejection, authorization, expired sessions, version conflicts, project operations, collaborator roles, and signout. No cloud.ts rewrite was justified by this audit.
- The full suite also successfully ran existing real ephemeral Chromium PDF tests. New API regression tests deliberately mock Chromium to reliably induce cleanup failure; they do not prove production browser installation or sandbox configuration.
- The file-edit tool's standalone TypeScript checks reported configuration-related dependency errors; the authoritative project-configured TypeScript check above passed.

## Remaining launch gates and limitations

- PUBLIC HOSTING GATE: the expensive PDF endpoint remains unauthenticated, with only a process-local single-render guard. Non-browser clients can omit/spoof Origin; multiple server instances each render independently. Apply deployment-level authentication/access controls or suitable rate limits, concurrency limits, upload/read timeouts, and resource isolation before exposing this unrestricted to the public. No deployment configuration was available or changed here.
- Request bodies are streamed with an existing 12 MiB cap, but request intake has no explicit application-level read deadline, and the render lock is acquired after parsing. The 45-second render timeout is not a total upload/cleanup deadline. A hanging browser.close is not solved by catching rejection.
- Proxy deployments must preserve the public request URL origin consistently, or legitimate browser POSTs may be rejected. Verify a same-origin export on the actual deployment.
- Existing PDF defenses inspected: JavaScript disabled, service workers blocked, all context network routes aborted, response no-store and nosniff, bounded launch/render timeout. This is not an OS sandbox or exhaustive SSRF/decoder audit; deployment must have Chromium installed and appropriately isolated.
- Real IndexedDB transaction abort/quota/blocked-upgrade behavior, browser eviction, private browsing, and actual UI recovery flows were not tested in a real profile. Current compare-and-swap and transaction-completion safeguards were preserved.
- Backup parsing intentionally has no total 4 MB import cap; large valid backups remain recoverable. Very large input can consume client memory. This audit did not introduce a destructive format limit or strip unknown fields.
- Cloud database RLS/RPC authorization and concurrent writes were not verified against live Supabase. The client cannot establish server policy correctness. Do not claim cloud production readiness from local fixture tests alone.

Files changed: src/library-storage.ts, src/model.ts, app/api/pdf/route.ts. Files added: tests/launch-storage.test.ts, tests/launch-pdf-api.test.ts, docs/launch-safety-review.md.
