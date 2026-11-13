# Bibliarch Books

Local writing and book-design studio using Next.js, React, TypeScript, Lexical, Chromium PDF rendering and EPUB3 packaging.

## Run

```
npm install
npx playwright install chromium
npm run dev
```

Open http://localhost:3210. Production: `npm run build` then `npm start -- --hostname 127.0.0.1`.

## Writing and layout

- Docs-style title/menu/formatting chrome, a single document scroller, optional independently scrolling outline/settings, zoom and spread view.
- New books start with Book name / Author name on a title page, then Chapter 1 / Chapter name with lorem ipsum. Existing libraries and v1 JSON backups are preserved, not replaced with sample text.
- Real Lexical rich-text formatting, undo/redo, indentation, alignment, font/size/color selection, spellcheck and word counts.
- Books, chapters and authoring pages (structured scenes), rename/reorder/add/delete with recovery snapshots.
- Select a page via its top-right page label or click within it, then Page styles: book front, chapter title, prose, color art, black-and-white art, character introductions, afterword or back cover. Applying a preset never deletes content.
- A4/A5/B6/Letter/custom dimensions, margins, independent body/heading typography, running header/footer fields, mirrored print margins, saved personal templates.
- Authoring pages expand when text grows; actual print pagination is in Print preview and PDF, not editable live page boundaries. Spread view arranges authoring pages, not a cropped two-page illustration.

## Art and publishing

- Comic / manga pages (page type “Comic page”): panel layouts (action with slanted gutters, six-grid, big panel + 2, 4-koma strip, four-grid, three tiers, full splash), left-to-right or right-to-left (manga) reading order, gutter/margin/border choices in Book design → This page, per-panel art from the book’s picture library with fill/fit, zoom and drag-to-reposition, and speech/thought/caption boxes. Art is the writer’s own; there is no drawing tool.
- PNG/JPEG/WebP images attached to their authoring page. Width, rotation, opacity, crop/focal point, alt text and caption controls. Black-and-white preset is a reversible display filter.
- Local image limit 1.5 MB each; total JSON library limit 4 MB. Low-resolution warnings.
- Real paginated PDF download and PDF preview through local Chromium. Text reflows across print pages; separate print sections start on new pages.
- Real reflowable EPUB3 with navigation, metadata, XHTML spine and embedded images. Fixed-page art treatments do not carry over identically to EPUB.
- JSON library backup download/import. Import offers a backup download before replacement.

## Review and data safety

- Local comments with resolve/reopen, page-linked character/location references.
- Tracked page changes preserve original rich text. Review shows before/current text; Accept page changes keeps the draft, Reject page changes restores its original document. This is page-level review, not individual inline suggestion markup. Exports include the visible draft.
- Manual snapshots and bounded periodic automatic changed-manuscript snapshots. Restore first saves a recovery snapshot.
- Browser localStorage autosave with visible write failures and protection against overwriting unreadable storage or another tab's changes.
- No account/cloud synchronization. Browser data deletion removes local drafts. Download JSON backups regularly; personal template settings are stored separately in this browser.

## Verification

```
npm test
npm run test:e2e -- --workers=1
npm run build
npm audit
```

Browser tests use isolated storage and require port 3210 free. Tests cover persistence, formatting, page styles, artwork, review, imports, fixed scrolling, real EPUB/PDF downloads and paginated preview.

## Remaining scope / not claimed complete

This release adds functionality across the five roadmap areas, but is not complete feature parity with the original brief or Google Docs. Still missing: live editable automatic pagination; paragraph-wrapped/freely floating illustrations and decal collections; true two-page illustration spreads; arbitrary custom page-layout builders; custom font uploads/bundling; complete paragraph/typographic controls, folders/bookmarks and drag reordering; inline per-edit suggestions; Supabase authentication, remote assets and live collaboration. No backend credentials were configured.

PDF uses native Chromium CSS pagination rather than Paged.js. It is not a certified commercial-press pipeline: no PDF/X/CMYK, crop/bleed boxes, licensed custom font embedding or EPUBCheck certification. See PUBLISHING.md for details. The bleed field is advisory, not a produced bleed box.
