# Editable layout and contour wrapping

## Final parent verification (supersedes the worker-only gaps below)
- Added a visible Move heading handle, keyboard up/down movement, pointer-cancel/lost-capture/blur cleanup, and print hiding. Alt-drag remains optional.
- Newly inserted minimal chapter pages also start centered; existing saved alignment is not forcibly reset.
- Alignment buttons use compact familiar line icons with labels/tooltips, avoiding toolbar text overlap.
- Plain-background contour mode clips the displayed image to the detected polygon so its original opaque rectangle cannot cover reclaimed text area.
- Reproduced missing handle, missing background clipping and left-aligned inserted chapter defaults before those fixes.
- Final `npx vitest run --maxWorkers=2`: 150 passed. Prior unrestricted parallel run timed out in two Chromium tests; no assertions/timeouts were weakened. Final production build passed after fixing one explicit tuple type.
- Final production browser `editable-contour.spec.js`: 2 passed (heading alignment/movement/reload and silhouette wrap/gap/reload/print). Release suite: 18 passed. Harness corrections: visible drop coordinates and detached-element guard during re-pagination.
- Inspected rendered contour screenshot: lines follow head/body outline. Inspected heading screenshot: right alignment chosen by test persists, visible handle and toolbar readable. Generated actual Chromium print PDF at docs/contour-wrap.pdf.
- Main app rebuilt and restarted on3210; verification3234/3235 listeners stopped. No user-data edits, cloud writes, commits or deployment.
- Remaining: edge-only silhouette wrapping, not semantic segmentation of complex photos or two-sided middle-page text. EPUB remains reflowable fallback. Title is still a separate title control, not fully rich-text Google Docs paragraphs; inline body font/bold controls do not style title text. Keyboard focus transitions for title alignment and original More dropdown remain limitations. Live Supabase setup is separate and still pending.

## Earlier worker report

## Implemented
- New light-novel chapter openers start centered via their saved scene layout; no migration of existing books.
- Visible Left / Center / Right / Justify toolbar buttons. Mouse activation while a native title input is focused routes alignment to that title's scene layout, rather than the stale Lexical paragraph selection.
- Title input tooltip documents Alt-drag vertically to move the heading. Movement saves chapterSpacing (0–100mm). Existing numeric page-design controls remain available. Book-front furniture no longer forcibly overrides alignment/spacing.
- Selecting Text wraps around analyzes embedded image pixels locally in a bounded canvas (maximum side 256px). Transparency is default; optional simple uniform-background detection and explicit Rectangle mode are available.
- Conservative 64-band silhouette polygon, CSS shape-outside and editable 0–48px shape-margin. No arbitrary center-page two-sided wrap or semantic segmentation. Opaque/unreliable results fall back to rectangles. Library UI explains limitations.
- Placement contour, mode and gap survive JSON save/reload and have import validation. No image source replacement or cloud analysis/upload.

## Architecture / parity
The title is a native input overlay outside Lexical above a hidden sizing placeholder. Layout updates go through BooksStudio.editPage, not manuscript text editing. Contours are stored per placement and rendered by pagination furniture. Existing non-EPUB export with placed pictures invokes window.print on these actual laid-out pages; it therefore uses the same polygon and gap. The server publishing API does not receive placed pictures (pre-existing limitation); EPUB retains the existing image-after-section fallback. publishing.ts itself was not modified.

## Verification executed
- `npx vitest run tests/editable-wrap.test.ts`: initial RED (new contour module absent).
- `npx vitest run tests/image-library.test.ts`: RED on invalid wrap-gap accepted; added validation, then GREEN.
- `npx vitest run && npx tsc --noEmit --incremental false`: 148 tests passed, TypeScript passed (before final validation test addition). Existing expected PDF cleanup warning remains in negative test.
- Final `npx vitest run tests/editable-wrap.test.ts tests/image-library.test.ts && npx tsc --noEmit --incremental false`: 6 tests passed; TypeScript passed.
- No build, server restart, browser-data access, commits or deployment. Main .next, ports 3210/3234 and Supabase config untouched.

## Files
src/contour.ts (new), src/templates.ts, src/model.ts, src/design.ts, src/pagination/furniture.ts, src/pagination/TitleControl.tsx, src/EditorTools.tsx, src/ImageLibrary.tsx, app/BooksStudio.tsx, tests/editable-wrap.test.ts (new), tests/image-library.test.ts, this report.

## Remaining verification / limitations
Parent should build in isolated .next-editable-wrap and independently browser-test actual wrapping, title selection alignment, Alt-drag/reload and print under fresh contexts. No new browser test was run in this time box, so UI/print parity is architectural, not newly visually verified. Only unit contour/data behavior has new coverage; complete interaction TDD was not achieved. Title movement is Alt-drag (not a dedicated visible handle), and pointer-cancel cleanup is not yet implemented. Keyboard focus leaving the title before activating an alignment button can still target paragraph selection. Existing More alignment dropdown remains paragraph-only; the new visible buttons are title-aware. Plain-background detection is deliberately simple and can misclassify similarly colored artwork. Existing wrapped placements are not silently migrated/analyzed; toggle wrap or choose the contour mode to analyze. Preset application flows other than creating a new light-novel book were not changed. Basic title font/bold controls still belong to existing page design, not the inline paragraph toolbar.
