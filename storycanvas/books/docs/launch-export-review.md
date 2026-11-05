# Launch export review

Scope: publishing/export only; no UI, model, storage or API modifications. No build, server restart, deployment, commit, or user-book changes.

## Fixed test-first

- Paragraph spacing no longer depends on an explicit paragraph-indent setting. Print and EPUB now reset paragraph top margins and honor zero/custom bottom spacing independently; browser default margins previously defeated zero spacing.
- Full-page print artwork retains its page-height image box after shared design CSS. The shared `height:auto` rule previously overrode the print rule, shortening images (confirmed with real Chromium computed styles). Full-page figure margins are also reset. Explicit placement styles retain precedence.
- WebP VP8X, VP8L and VP8 dimensions are read for the existing decoded-image dimension/area limits and print-resolution warnings. Previously WebP bypassed those dimension checks. A deliberately oversized VP8X canvas now fails before PDF HTML generation and EPUB packaging.

## Verified

Command: `npx vitest run tests/export-launch.test.ts tests/publishing.test.ts tests/design-export.test.ts tests/offpage-export.test.ts tests/prose-format.test.ts tests/light-novel.test.ts tests/print-profile.test.tsx --reporter=dot`

Result: 7 files, 25 tests passed. `npx tsc --noEmit --incremental false` also passed. Three newly added regressions were observed failing before fixes.

- Real Chromium computed styles preserve Arial 13pt, line-height 1.45, first-line indent 1em, zero paragraph spacing and justified text.
- Real multi-page custom landscape PDF export works with overflowing prose; existing print-profile/off-page tests pass.
- EPUB stores `mimetype` first without compression; package/container/navigation/chapter XML parses; sections, navigation and embedded images are present.
- Original PNG bytes survive EPUB packaging unchanged. Existing font integration tests verify original licensed Abel TTF bytes and license text in EPUB, and an embedded font stream in a genuine Chromium PDF without remote access.
- Print HTML uses data-URL fonts and images; EPUB uses packaged local resources. No Google Fonts dependency is introduced.
- Hostile remote/SVG/javascript image inputs and font-family CSS injection are rejected by existing tests. PDF request size validation is covered. Source inspection confirms disabled page JavaScript, blocked service workers/network routes, image decode/font readiness checks and a rendering deadline in the API.

## Remaining limitations / launch cautions

- EPUB is reflowable, not print-identical: freely placed decals are omitted; illustration transforms, placement, opacity and grayscale are not reproduced as a composed raster. Images retain original bytes, but visual print treatments are not baked in. Reader CSS/font overrides vary.
- WebP is packaged without a PNG/JPEG fallback. Prefer PNG/JPEG for widest EPUB reader compatibility. No EPUBCheck or external e-reader/device matrix was run.
- Image validation is header/dimension validation, not a complete file decoder. Corrupt images can still pass packaging validation; PDF additionally calls browser image decoding. Raster decal dimension safety is not uniformly enforced by publish validation. WebP animation frame/resource complexity is not bounded by canvas dimensions alone.
- Arial and other system fonts are not automatically bundled: unavailable fonts fall back differently by OS/reader. For portable offline typography upload an appropriately licensed custom font. Custom-font limits remain eight fonts, 256 KiB each; only a normal 400 face is declared, so bold/italic can be synthesized.
- PDF API recto mode renders each section separately: code inspection indicates document-wide TOC context/anchors and mirrored page parity need dedicated follow-up. This worker did not edit the API (owned by a parallel worker). Verify recto books before release; default non-recto route is covered.
- Print preflight is not press certification. Confirm actual printer bleed, trim, safe areas, facing-page spreads, color profiles and resolution. No PDF/X or CMYK conversion claim is made.
- XML language metadata is currently fixed to English. Rich-text serialization supports the implemented basic text/paragraph/list/heading forms, not arbitrary editor extensions.

Tool note: automatic standalone-file lint checks emitted configuration-related TypeScript errors; project-configured `tsc` passed. Requested Hermes skill folder was not present at the provided user-home location; no applicable project skill was discovered.
