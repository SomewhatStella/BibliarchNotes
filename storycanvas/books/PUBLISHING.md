Bibliarch publishing
===================

Integration
-----------
src/publishing.ts exports PublishBook, PublishSection, buildPrintHtml(book),
buildEpub(book): Promise<Uint8Array>, and validatePrint(book): string[].
validatePrint returns validation errors or non-fatal print warnings. Both builders
independently enforce validation and throw on unsafe/invalid input. All functions
leave the supplied book unchanged; changing section presets is reversible.

POST /api/pdf accepts the PublishBook directly as JSON and downloads a real PDF.
The handler uses local Playwright Chromium, no cloud service and no browser print
dialog. Install the browser on another machine with: npx playwright install chromium
Runtime dependencies include playwright and jszip.

Print
-----
Native Chromium CSS paged media (not Paged.js) provides custom trim dimensions,
landscape when width exceeds height, section page breaks, flowing paragraphs,
widows/orphans, static running header/footer and page counters. Mirroring adds
5 mm to the inner margin, capped at one third of page width. Artwork presets
use a named zero-margin page, omit running matter and section title, and fill
the page image box (contain by default, cover optionally). Captions reserve
15 mm; additional prose/caption overflow flows rather than being clipped.
Black-and-white is a reversible CSS grayscale filter, not destructive editing.
Print image transforms preserve width, opacity, rotation, fit and position.

Limitations: this is not a press-ready PDF/X engine. Bleed is advisory and
warned about: no crop marks, bleed/trim boxes, CMYK conversion, embedded custom
font assets, automatic chapter-specific running heads, signature imposition or
blank recto-page insertion. Use a print proof before production. Unavailable
local fonts fall back to system fonts. Arbitrary decoration strings are ignored.
Preview HTML is safe/self-contained; ordinary screen view is not a paginated
page-count preview. Chromium print/PDF is the authoritative pagination.

Comic pages
-----------
Comic sections print on a named zero-margin page (no running head or folio) at
the full trim size; the comic's own margin, gutters and panel shapes come from
src/comic.ts (panelBoxes), so print matches the editor. Panels are clip-path
polygons, borders an SVG overlay, bubbles positioned HTML text. Panel art is the
book's library picture, validated like any other raster. Edge-to-edge comic
pages need a print proof: bleed is still advisory. In EPUB each panel becomes a
picture in reading order with its bubble/caption words underneath.

EPUB
----
EPUB3 ZIP starts with the uncompressed mimetype entry, then container.xml,
OPF metadata/manifest/spine, navigation and individual XHTML section documents.
Images are packaged internally. It is reflowable: fixed-page dimensions,
transforms and decorations are stripped. Lexical paragraph/headings/lists,
quotes, line breaks, emphasis/bold/underline/strikethrough/code/sub/sup are
preserved. Unsupported nodes preserve child text but not arbitrary HTML/CSS,
interactive widgets or remote link behavior. Language currently defaults to en.
Tests validate XML syntax and ZIP structure, not a complete external EPUBCheck
certification or every reading-system implementation.

Safety and bounds
-----------------
12 MiB request limit, 500 sections, bounded content tree, numeric format/image
ranges and safe font names. Only base64 PNG/JPEG/WebP with checked signatures
are allowed; SVG, remote/file/script URLs and supplied HTML/CSS are not rendered.
PNG/JPEG header dimensions provide low-resolution warnings below 150 DPI and
reject huge decoded dimensions; WebP resolution currently requires manual review.
The render browser has JavaScript disabled, blocked network routes and restrictive
CSP, waits for fonts and image decoding, has a 45 second overall render timeout
and closes in finally. One render per server process is allowed; concurrent
requests receive 429. Public deployments additionally need authentication and
infrastructure request/rate limits (the in-process guard is not distributed).

Verification
------------
From C:/Users/stell/src/stella/bibliarch-books:
  npx vitest run tests/publishing.test.ts
  npx tsc --noEmit

The isolated suite directly invokes the real route handler, launches Chromium,
prints overflowing prose in landscape, verifies the %PDF- signature, parses it
with pdf-lib and checks multiple pages and landscape dimensions. It also checks
EPUB XML/escaping/assets/first ZIP entry, safety rejection and low-res warnings.
No production server must be stopped for these tests.
