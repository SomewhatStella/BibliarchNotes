# Five-stage acceptance checklist

This is an acceptance checklist, not a completion claim. Each feature needs executable code, accessible UI, persistence/backup compatibility where relevant, and a test or explicit manual evidence.

## 1. Writing
- Existing: Lexical formatting, spellcheck, undo/redo, chapter/page organization, find/replace, autosave, snapshots, safe JSON import/export.
- Remaining: body/paragraph spacing, tracking, bookmarks, folders/group organization, drag reordering, per-change review rather than only whole-page snapshots.

## 2. Page layout
- Existing: fixed Docs-style chrome/single scroller, formats, margins, header/footer fields, zoom/spreads, PDF pagination.
- Remaining: actual editable paginated text, physically correct page-size presets, mirrored inside/outside margin controls, recto chapter starts, safe/bleed guides; retain document content independently from generated page boundaries.

## 3. Light novel design
- Existing: eight page presets, one raster artwork per section, crop/opacity/rotation/caption, saved template appearance.
- Remaining: inline/half/full/floating artwork wrapping, true spread images, decals/ornaments, copyright/TOC templates, reusable layout controls, custom font import and licensing reminder, export embedding.

## 4. Export
- Existing: genuine PDF with Chromium CSS pagination, EPUB3 ZIP/nav/spine/assets, image warnings and JSON backup.
- Remaining: custom font embedding and parity with added layouts; validate warnings and inspect generated output. Do not call browser-generated RGB PDF a certified PDF/X commercial-press product.

## 5. Advanced
- Existing: saved preset appearance, spread view, local page comments/references, whole-page tracked draft accept/reject.
- Remaining: inline diff/per-change review, reusable custom layouts, optional cloud account/project sync/collaboration integration with explicit setup instructions and access policies.

## Constraints
Preserve existing localStorage key and existing manuscripts. Test isolated browser storage only. Do not manufacture cloud credentials or claim remote deployment success. No Supabase environment variables were present at initial audit. Optional cloud code can be built/tested locally but external activation requires configuration. No git commit unless requested.
