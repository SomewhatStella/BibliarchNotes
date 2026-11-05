# Save, delete, and bug report implementation

## Delivered
- Library saving already uses queued IndexedDB transactions, compare-and-swap revision protection, legacy migration, explicit failure/retry UI, and JSON recovery. Preserved this implementation, verified actual persisted bytes and reloads.
- Every saved book now has a separate Delete book action with a native confirmation naming the book, cancellation, permanent-delete warning and backup advice. Deletion waits for the existing durable store to succeed before changing the live library. On failed writes the original book remains visible and stored. Controls are disabled during the transaction. Cloud copies are explicitly unaffected.
- Empty libraries are now valid, restore to home, survive reload, and can create another book. No replacement sample book is persisted when deleting the last book.
- Report a bug is accessible from library and editor. Summary, details and reproduction steps are locally drafted on each change and restored on reload. Explicit local save plus JSON download; storage failures are shown. Wording explicitly says "Saved on this device, not sent" and explains that saving replaces the previous local report. Only user-entered fields and timestamp/version/local delivery marker are included, never manuscript/account/automatic diagnostics.

## Wiring / limits
- Existing optional CloudClient uses user-configured Supabase public credentials and explicit project actions. Local saving is not automatic cloud sync. No new remote deletion or reporting behavior was invented.
- No report backend/configuration was found in app code; project-root environment-file variable-name inspection produced no entries. No secret values were printed. Reports are intentionally local-only, not sent to a developer. Delivery needs a real configured destination and server-side integration later.
- No trash/undo architecture added within this bounded task. Deletion is permanent after named confirmation; Save backup remains available before deletion.

## Verification
Test-first: both new browser tests failed against existing production build because Delete and Report a bug controls were absent, before implementation.

Passed:
- `npm test`: 139 tests / 36 files. Existing cleanup-rejection test intentionally logs a PDF cleanup warning.
- `npx tsc --noEmit --incremental false`: passed.
- Isolated production build: `BIBLIARCH_BUILD_DIR=.next-save-delete-built npx next build`, then separate server port 3225 (original .next and port 3210 not rebuilt/restarted).
- `BOOKS_TEST_URL=http://127.0.0.1:3225 npx playwright test -c playwright.save-delete.config.ts`: 3 passed, including existing large-backup/migration/failure/retry persistence browser test and the two new maintained tests.
- New deletion test covers named cancel, injected quota failure, retained original IndexedDB book, successful last deletion, empty reload, and durable new-book creation.
- New report test covers draft reload, explicit local save, real JSON download excluding fixture manuscript title, and editor entry point.

The isolated dev server on 3224 returned HTML but remained at Opening document with failed HMR websocket handshakes in this environment. Switched to isolated production verification; all tests passed there. Both temporary servers were stopped. Restored generated next-env imports to .next and removed only temporary save-delete paths from tsconfig includes. Parent owns final main production build/restart and full release suite.

## Files
- app/BooksStudio.tsx
- src/LibraryHome.tsx
- src/BugReport.tsx (new)
- src/model.ts
- src/workspace.ts
- tests/launch-ui.test.tsx (required callback added to existing fixture)
- e2e/save-delete-report.spec.ts (new)
- playwright.save-delete.config.ts (new; BOOKS_TEST_URL override)
- docs/save-delete-report.md

No deployment, commits, real browser storage access, or real books deleted. Tests use fresh isolated browser contexts and seeded fixtures only.
