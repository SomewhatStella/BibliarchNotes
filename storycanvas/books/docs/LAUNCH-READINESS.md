# Book maker launch-readiness pass

Status: core local workflows verified; public launch approval pending deployment and remaining acceptance gates. No public deployment performed. Current rebuilt app: http://127.0.0.1:3210/books. User libraries were not accessed or migrated by testing; browser tests used isolated contexts.

## Delivered
- Retriable storage loads, non-destructive corrupt/empty legacy handling, legacy recovery when IndexedDB is unavailable, validated legacy writes.
- Clear browser-only storage/backup instructions and helpful empty-library state.
- Narrow navigation fit and compact horizontally scrollable phone toolbar (previous toolbar consumed 180px and clipped actions; now 56px). Desktop composition retained.
- Correct zero paragraph spacing independent of indent in print and EPUB; preserved full-page illustration height; WebP decoded-dimension safety checks.
- PDF foreign-origin rejection and safe validation messages; cleanup rejection/hang no longer permanently retains render lock.
- Correct mirrored-margin parity for independently rendered recto sections. Recto + contents combination now refuses with an actionable diagnostic instead of producing incorrect contents.
- Dedicated bounded current-workflow runner: playwright.release.config.ts. Does not hide or replace historical tests.

## Final verification
- npm test: 139 passed across 36 files. Expected cleanup-error logging occurs in fault-injection API tests.
- npm run build: passed, including TypeScript.
- npx tsc --noEmit: passed after final release config creation.
- npx playwright test --config playwright.release.config.ts --reporter=line: 18 passed on final production build at port3210.
- BOOKS_TEST_URL=http://127.0.0.1:3210 node tests/launch-built-ui.cjs: passed at 320,390,1440px, no page errors, navigation bounds checked. Final mobile editor and desktop library screenshots inspected.
- Browser acceptance covers library creation/search/reopen, templates without prose replacement, title and body text selection, continued-page selection, picture library movement/resize/wrap/reload, 3D preview, background manipulation, settings, narrow toolbar interaction, large backup import, migration, quota failure/draft download/retry/reload.
- Real Chromium PDF and EPUB bytes/font tests are included in the unit/integration suite. Not proof of hosted PDF service availability or commercial printer acceptance.

## Earlier full-browser attempt (not green)
88 historical browser tests discovered. Stopped at six failures: five passed, six failed, 77 unrun. Failures include old localStorage assumptions after IndexedDB migration, old startup assumptions, unavailable former illustration/background controls, old crop selector/gesture, and removed ornament catalog selection. Some are clear outdated test contracts; all six are NOT claimed resolved. Preserve/reconcile these tests against actual supported interactions before calling the whole suite green. Current-workflow acceptance is intentionally narrower.

## Before public launch
1. Choose/confirm deployment target and URL. Deploy only with owner approval. Books are origin/browser-local: changing host or port does not carry local books; Save backup/Open backup is the supported move.
2. Provide hosted Node/Chromium runtime for /api/pdf, outbound isolation, deployment-level rate limiting/resource limits and request deadlines. Origin checks are NOT authentication or abuse protection. A cleanup timeout cannot guarantee a wedged OS browser was terminated.
3. Configure NOTES_ORIGIN to a reachable hosted Notes service if publishing integrated navigation. Local Notes worked during audit; localhost5202 is not a hosted configuration.
4. Verify HTTPS, proxy-origin behavior, actual PDF downloads, EPUB reader opening and backup restore on the deployed site. Verify hosted cloud/RLS behavior if enabling cloud; do not promise automatic sync.
5. Reconcile six historical browser failures and run remaining tests, or explicitly scope a limited beta to the verified features. Safari/Firefox, touch-device drag behavior, long manuscript stress and full accessibility review are not certified by Chromium desktop emulation.

## Known format boundaries
- EPUB is reflowable: free-position ornaments and some print image treatments are not reproduced. This is not a fixed-layout EPUB exporter.
- Recto PDF with a contents section is explicitly unsupported; use continuous chapters for contents.
- System Arial is not bundled; exact photo font fidelity is not guaranteed across hosts.
- PDF/X, CMYK and commercial print-service preflight are not certified.

## Supporting reviews and evidence
- docs/launch-safety-review.md
- docs/launch-export-review.md
- docs/launch-pdf-followup.md
- docs/launch-ui-review.md (source-CSS audit superseded by final built screenshot checks)
- docs/launch-built-library-{320,390,1440}.png
- docs/launch-built-editor-{320,390,1440}.png

Temporary verification listeners3231/3232 were stopped after checking their project command lines. The refreshed normal3210 production listener remains available. No git commit or deployment was performed.
