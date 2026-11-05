# Design integration contract

Import `DesignTools, { PageDesign } from '../src/DesignTools'`.

`<DesignTools scene={scene} book={book} onSceneChange={patchScene} onBookChange={patchBook} />` emits shallow patches. Parent must merge patches into existing records using the existing quota-aware save flow. Never replace the whole scene/book with a patch.

`<PageDesign scene={scene} book={book}>{titleAndEditor}</PageDesign>` renders the scene image itself, before children (needed for float wrapping). Remove the old standalone image renderer inside this wrapper to avoid duplication. Children remain intact. The wrapper installs scoped design styles and custom @font-face CSS. A title inside children gets the layout heading spacing/alignment. The body and heading selectors read `book.format.bodyFont` and `headingFont`.

Optional scene fields:
- image.mode: inline | half | full | float-left | float-right | spread (six modes).
- decals: [{id,src,alt,x,y,width,rotation,opacity}]; 24 maximum; percentages 0–100, width 1–100, rotation -360–360, opacity 0–1. src is embedded PNG/JPEG/WebP or builtin:stars / builtin:diamond / builtin:leaves. Arbitrary SVG and remote sources rejected.
- layout: {chapterSpacing:0–100 mm,titleAlign:left|center|right,border:none|solid|double,divider:none|stars|diamond|leaves}.

Optional book fields:
- customFonts: [{id,family,data,mime,name?,license?}]. readFont uses a stable SHA-256-derived `font-...` id, family `Bibliarch-${id}`, and data URI. Eight fonts maximum; each 256 KiB. Accepted WOFF, WOFF2, TTF, OTF signatures; actual browser FontFace load validates usable font data. User must confirm embedding license. Backups must retain these arrays verbatim and include them in the existing total 4 MiB quota calculation.
- designLayout: saved layout
- decalCollections: up to eight {id,name,decals} collections

The core model importer MUST validate and retain those optional fields. Use assertDesign(scene), fontCss(book.customFonts), normalizeLayout; validate saved collections too. This worker deliberately does not own model.ts or app/page.tsx.

Publishing: pass book.customFonts and each section's image.mode, decals, layout into PublishBook. Existing fields remain valid. PDF blocks network and script execution, awaits every font and image, embeds custom fonts. EPUB includes original font bytes, @font-face declarations, and font-licenses.txt in its manifest. Fixed decals are deliberately omitted from reflowable EPUB. Scene-divider characters are retained. Spreads become one complete image in reflow EPUB.

Limitations: coordinate sliders (not pointer dragging); decals are section-relative, not repeated on automatically generated sheets; print spreads are two consecutive clipped halves and need facing-page alignment review; fixed page proportions can stretch artwork if its aspect ratio differs. EPUB reading systems may override publisher typography. No PDF/X claim. Custom font full UI/browser persistence testing remains an integration responsibility.

Verification: tests/design.test.ts covers validation and decals, tests/design-export.test.ts checks actual EPUB bytes and actual PDF /FontFile embedding with Abel. Fixture Abel-Regular.ttf is from google/fonts/ofl/abel and its SIL OFL license is retained as Abel-OFL.txt. No restricted system fonts redistributed, no dependency installation required.
