# Bibliarch shared Notes + Books site

## Start after a restart

From `C:/Users/stell/src/stella/bibliarch-books`:

```
node scripts/start-storycanvas.mjs --production
```

Open http://localhost:3210 . Development: omit `--production`.
Build both bibliarch-books and bibliarch-notes with `npm run build` before production startup. Stop the corresponding preview before building: Next 15 development and build outputs share `.next`.

The launcher starts both services on loopback, checks ports, waits for readiness and supervises its own children. It refuses occupied ports rather than killing/reusing unrelated processes. Notes backend port defaults to 5202; use NOTES_PORT if necessary. Keep the main browser hostname/port consistent with the existing Books session (localhost:3210); browser storage is origin-specific.

## Routes / ownership

- `/`: new shared responsive homepage, no automatic auth redirect.
- `/books`: full existing Books editor. `app/BooksStudio.tsx` is the former `app/page.tsx`, unchanged by the move.
- `/notes/*`: rebuilt bibliarch-notes, served on the same public origin through Next rewrites. The Notes Next app uses basePath `/notes`, including its own bundles.
- `/api/pdf`: existing book PDF endpoint, unchanged.

Original storycanvas source was inspected for reference and left unchanged. Its existing live deployment is not replaced or published by this work.

Notes retains its existing Supabase backend, account and story tables. Books retains the existing IndexedDB/localStorage migration, library/workspace keys and origin. Shared navigation does NOT automatically copy content between Notes and Books or add book cloud synchronization. Notes links wait for a successful flush before crossing to another workspace. Book navigation performs full-document transitions so the existing unsaved-work browser guard remains active.

## Appearance

Header Appearance button toggles `data-ui-theme` on the root. Saved preference: `bibliarch.ui.theme.v1`. System preference is used until explicitly chosen. The bootstrap prevents a theme flash; subscribe reconciles system changes occurring before hydration. Theme CSS targets editor chrome, not printed manuscript pages, thumbnails, SVG artwork or export content.

Homepage example cards/books are labeled illustrative examples, not user documents or automatically generated saved projects.

## Verification for this integration

- Both production builds passed.
- Books full unit suite: 114 tests passed.
- Notes routing/save-guard/launcher tests: 4 passed.
- Focused production Playwright run: 12 passed (`shared-site`, `ui-theme`, `library-gallery`, `library-storage`, `decal-replacement`, `overlay-selection-chrome`).
- Additional isolated browser journey verified book title + manuscript persist through Books → Notes login → Books; the editor restores directly.
- Actual light/dark homepage, mobile homepage and dark editor screenshots inspected. Homepage tested at widths 1440, 768 and 390.
- Notes signed-out navigation/assets verified through public origin. Existing signed-in Notes collaboration was NOT re-tested with live account writes in this pass.
- Legacy editor test entry paths updated from `/` to `/books`. Full historical E2E suite not claimed green: some tests still refer to old editor controls/storage. The gallery persistence regression was updated to the current IndexedDB backing store without weakening its saved-layout assertions.

No deployment or remote data changes were made.
