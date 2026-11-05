# Launch UI review

## Scope and method

Read-only audit first against the existing build at http://127.0.0.1:3231. Each viewport used a fresh Playwright browser context (no existing user profile). Visited Home at 1440 and 390px, Books at 1440, 390 and 320px, and Notes dashboard. No book creation/import, user-data modification, build, restart, commit, or deployment. Changes are limited to UI component/CSS, isolated tests, and this report/evidence.

## Concrete findings and fixes

1. **Clipped appearance control at 320px — fixed.** The theme button extended from x=312.52 to x=356.52 in a 320px viewport. Document scrollWidth stayed 320px, so a document-overflow assertion alone missed this clipped control. Below 361px, the existing navigation now wraps into two rows, retaining the brand, theme button and every workspace link. No desktop redesign or functionality removal. Browser bounding-box regression failed before the change and passed with the updated source CSS injected into the old build. Visual confirmation shows every header control visible.
2. **Local-storage safety instructions too remote — fixed.** The library previously mentioned JSON backups only in its footer and described storage as device-local rather than browser-local. A compact note immediately below the backup controls now explains browser-only storage, deletion risk when clearing browser data, the exact Save backup / Open backup actions, and lack of automatic device/Notes sync. The existing controls and storage implementation are unchanged.
3. **Empty-library copy read like a failed search — fixed.** An actually empty library now welcomes the user and points to Blank book, templates and backup restore. A populated library with no search matches retains the existing No books found guidance. Note that the fresh runtime currently supplies an initial Book name book; the zero-book condition was verified by component rendering, not claimed as the default runtime state.
4. **Notes unavailable report — not reproduced in this environment.** /notes/dashboard returned HTTP 200 and the working Notes login screen (Welcome back, email/password, create account). next.config.ts proxies /notes to NOTES_ORIGIN or local port 5202. Kept all integrated Notes links intact and made no speculative changes to working routing. A standalone deployment without the upstream service remains a deployment concern: validate NOTES_ORIGIN/upstream availability before release. No unavailable-state implementation is claimed.
5. At 390px and desktop the audited Home/Books layouts had no document-level horizontal overflow. Backup controls already wrap and remain visible on narrow screens.

## Verification

Tests were written and executed before production edits:
- `npx vitest run tests/launch-ui.test.tsx`: two expected failures (missing browser safety copy and missing empty-library welcome).
- `node tests/launch-ui-narrow.cjs`: expected failure identifying the theme button outside the 320px viewport.

After edits:
- `npx vitest run tests/launch-ui.test.tsx tests/ui-theme.test.tsx`: **6 tests passed**.
- `node tests/launch-ui-narrow.cjs`: **passed**, all navigation controls within 320px.

The browser regression intentionally injects app/site.css from source into the pre-edit build, because rebuilding/restarting was prohibited. It verifies actual browser layout but is not a post-build verification of the entire new bundle. Component copy is verified via server rendering. Parent should run the full build and final browser check. The full suite was not run concurrently with the parent's serial run.

## Changed source/test paths

- src/LibraryHome.tsx
- app/library.css
- app/site.css
- tests/launch-ui.test.tsx
- tests/launch-ui-narrow.cjs
- docs/launch-ui-review.md

## Screenshot evidence

- docs/launch-before-desktop.png
- docs/launch-before-mobile.png
- docs/launch-books-before-desktop.png
- docs/launch-books-before-mobile.png
- docs/launch-books-before-small.png
- docs/launch-books-narrow-source-css.png (source CSS injected; old build content)

The app uses internally scrolling containers, so these screenshots capture the visible viewport rather than every off-screen library item, even with fullPage enabled.
