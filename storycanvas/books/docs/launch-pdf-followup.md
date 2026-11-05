# PDF launch follow-up

## Confirmed causes

The recto API renders each section as a separate HTML document and merges the resulting PDF pages. Passing `sections: [section]` removes the global section list used to build the TOC, producing empty contents and losing cross-document link context. Each separate Chromium print also starts on a right-hand page; resetting the printed page counter does not repair physical left/right margin parity.

## Launch-safe behavior

- Recto plus any TOC section now returns HTTP 400 before Chromium launch, with an actionable instruction: disable recto chapter starts (preserves the full-document TOC and links), or remove the TOC. No silent export of an empty TOC.
- Recto without TOC retains the existing physical blank-page insertion. Mirrored inside/outside margins are reversed for sections beginning on an even assembled page. Defaults match the print HTML generator. This preserves the original margin alternation within each section and aligns it with assembled physical parity.
- Non-recto export remains a single full-document print, including TOC targets and mirrored margins.
- Browser cleanup now has a two-second timeout, clears its timer, catches rejection, and releases the render lock even if close never settles. Existing foreign-Origin protection and sanitized input errors remain intact.

## Verification

Tests were written and observed failing before production changes. New coverage in `tests/launch-pdf-recto.test.ts` checks TOC refusal with and without mirror, full-document TOC/link markup without recto, even-start mirrored margin reversal, simple recto export, and hung cleanup followed by a successful next request. Browser interactions are mocked in this new suite; publishing validation/HTML and PDF assembly are real.

`npx vitest run`: 36 files, 139 tests passed, including existing API tests and the real-Chromium recto/trim/bleed test. The existing cleanup-rejection test intentionally logs errors.

`npx tsc --noEmit --incremental false`: passed. Per-file tool lint emitted incorrect compiler-default/module-resolution diagnostics; the project-configured typecheck above is clean.

## Remaining work / limits

A full-document recto pagination strategy with verified physical blank pages and retained PDF destinations is still needed before enabling recto plus TOC. Do not simply replace assembly with CSS `break-before:right` without real Chromium pagination checks. Add physical PDF coordinate assertions for multi-page even-start sections and default/explicit margins with bleed as deeper regression coverage; the new parity test verifies the generated CSS, not extracted glyph positions.

A cleanup timeout guarantees request/lock recovery, not termination of a wedged browser process. Process-level supervision/resource caps are a separate operational follow-up. No build, server restart, deployment, UI/publishing edits, or user-data changes were performed.
