# Bibliarch Books — design rubric

The fixed bar for design reviews. Each round, a reviewer scores every area **only against
these checks**: a level is earned when all of its checks *and every check below it* pass.
New ideas from a review go into "Backlog" at the bottom, not into the score.

Areas: **A. Library & import** · **B. Editor & writing surface** · **C. Panels & dialogs**.
Screens are judged at 1440×900 (desktop) and 820×1100 (tablet). The grey "Cloud commit
receipt missing" banner seen in test screenshots is a fake-login artifact and is ignored.

## Global (applies to every area)
- G1. Text: nothing visible under 11px; secondary labels and helper text are 12px or more; helper text is #6b6358 or darker on cream.
- G2. Type scale in chrome: 20 (dialog/panel titles) / 15 (section heads) / 13 (labels) / 12 (helper). Page-level headings on full screens may be 28 (h1) / 24 (h2) serif. No other sizes outside the book page itself.
- G3. Spacing uses an 8px scale (4 allowed for tight insides).
- G4. Selection is shown one way only: 2px accent-blue border plus a light tint, and a check badge where it's a card choice. No purple.
- G5. One dialog/panel header: serif 20px title, 36px borderless close button with a 16px ×.
- G6. Plain language: no file extensions, raw units mixed with names, internal labels or jargon in visible copy.
- G7. No emoji in UI chrome.

## A. Library & import
**8/10**
- A8.1 Templates and "Your books" share one column grid; card left edges line up exactly between sections.
- A8.2 Every page preview has the same height and is centred in an identical mat, drawn in the book's true page shape (so different trim sizes visibly differ in width). Previews are the book's real first page; untitled books read "Untitled book".
- A8.3 At 1440×900 at least one whole book card (including its title) is visible without scrolling once the user has books.
- A8.4 Import "Choose a look" uses the same names as the library ("Blank book", not "Simple"), has no empty grid cell, and the cards are equal height.
- A8.5 The import chapter list doesn't repeat numbers ("1. CHAPTER 1"), has equal left/right padding, and shows word counts, not paragraph counts.
- A8.6 No ".docx/.txt/.md" or orphaned "in" in copy; sizes never wrap mid-value.
**9/10**
- A9.1 Header, divider and content share one container edge at every width.
- A9.2 All template/book mats are one deliberate colour (no grey "dirty" mats).
- A9.3 Book cards show title, last edited ("Edited 2 days ago") and word count.
- A9.4 "Your books" heading, count and search sit on one aligned row.
- A9.5 Import dialog shows which step you're on, and the upload icon colour matches the library tile.
**10/10**
- A10.1 Dropping a file anywhere on the library starts an import.
- A10.2 Real empty and no-search-results states.
- A10.3 Cards lift consistently on hover (2px, soft shadow).
- A10.4 Checked at 390px wide with no overflow.

## B. Editor & writing surface
**8/10**
- B8.1 No running head on title, copyright, contents or chapter-opening pages; running heads line up with the text block and use the book's serif in small caps; page numbers show.
- B8.2 Justified text uses hyphenation; no visibly wide word gaps.
- B8.3 The goal celebration never covers the page or rail, disappears by itself in 4s, and imported/new-book text doesn't count as "written today".
- B8.4 Page list: no book dropdown; a chapter with one page shows as one row (no "The Bridge › The Bridge"); selection uses the accent, not purple.
- B8.5 Tool-rail labels 11px+; status-bar text 12px+; no duplicate zoom readout; counts are labelled ("Today … · Book … words").
- B8.6 Toolbar buttons have no fill at rest (Add picture isn't permanently yellow); one button style.
- B8.7 At 820px wide the toolbar is one row and the page is fully visible and centred.
**9/10**
- B9.1 Rail icons are one outline family at one size; no action duplicated between rail and toolbar.
- B9.2 Page sits with a top gutter (24px+) and a soft shadow; no more than two background tones around it.
- B9.3 Overlays (toast, focus bar, page counter) never cover page content; focus bar has 4.5:1 contrast.
- B9.4 "Page types" picker: title matches the button, one selection style, 13px captions, buttons say what they do ("Change this page" / "Add as new page").
- B9.5 The "drag to move text" overlay shows only on hover or drag.
**10/10**
- B10.1 Focus mode controls appear only when the mouse moves.
- B10.2 Verso/recto running heads; no widows/orphans.
- B10.3 Dedicated tablet/phone layout (drawer page list).
- B10.4 No clipping or layout shift from 768 to 1920px.

## C. Panels & dialogs
**8/10**
- C8.1 Book design never covers the page or the toolbar: it docks as a column and the page recentres.
- C8.2 Card rows in a panel share one grid; card edges line up down the panel.
- C8.3 Margins, "start the text lower", printer and border choices all have visual previews.
- C8.4 Nothing is ever hidden under a panel footer; the footer is one line.
- C8.5 Tabs are a segmented control with exactly one selected state.
- C8.6 No broken/internal labels (e.g. "AO3 (Verdana fall…").
**9/10**
- C9.1 Book sizes drawn to scale, large enough to tell apart, with a "Most popular" badge on 6 × 9.
- C9.2 Printer choice is the same component and wording in Paper and Export.
- C9.3 Export: issue rows align with the summary; the primary action downloads the print file.
- C9.4 Decorations: chips for style, 2-column grid, art fills its tile, no duplicate title.
**10/10**
- C10.1 Hovering a choice previews it on the page.
- C10.2 Previews render the user's own font/text.
- C10.3 2px alignment audit passes at 1280 / 1440 / 1920.

## Score log
| Round | A | B | C | Notes |
|---|---|---|---|---|
| 1 (free review) | 6 | 6 | 5 | First critique, before this rubric |
| 2 | 7 | 7 | 6 | Against rubric. Clarified G2 (page headings) and A8.2 (true page shape) after this round. |
| 3 | 7 | 7 | 7 | A: only A8.6 (".docx" in copy) blocked 8. B: B8.2 hyphen check failed on short-word test text (test manuscript now realistic prose). C: grid columns, printer selection, thumbnails micro-text. |
| 4 | 9 | 7 | 7 | A: all 8/9 pass, 10 unverified (needed shots). B: wide gaps, focus bar over text. C: unshown previews, ornament tiles. Found+fixed: page breaks splitting hyphenated words; bulk layout leaving split paragraphs after undo. |
| 5 | 8 | 7 | 7 | A: legacy preview text, phone alignment. B: widows (now fixed, audited 0 widows/0 orphans over 251 pages), one-row chapters, stale page counter. C: truncated font card + badge, faint ornaments. Test prose switched to natural sentences. |
| 6 | 9 | 8 | 8 | A: all checks pass (G1/G2 confirmed by measuring computed styles). B: all 8–9 pass; recto/verso heads + More menu for 10. C: ornament tiles. |
| 7 | 9→10* | 8→10* | 9 | B: recto/verso heads, divider on last sheet, More menu fixed; last fails (rail Settings duplicate, 12.5px status bar) fixed after judging. C: everything passes except C10.1 hover-to-preview — deliberately not built (each preview would re-lay out every page; too slow on long books). *pending re-judge. |
| 8 | 7* | 9 | — | *A held back only by globals G1/G2 (10px tagline, 12.5/13.5/14px labels) — fixed; live computed-style audit now finds every chrome text size on the scale. B: purple Text-box selection + 11px buttons — fixed. |
| 9 (final) | 10 | 7 | 9 | A: every check passes. C: all pass except C10.1 (hover preview) — accepted trade-off. B: everything passes except B8.2 (wide word gaps). Measured over a 251-page novel: lines with a gap >2.2× a space went 569 → 428 (6.8%), at page ends 11 → 6, after keeping natural breaks on page-ending pieces and hyphenating sooner. The rest is the browser's line-by-line justification; the real fix is a whole-paragraph (Knuth–Plass) line breaker, or ragged-right text. |

## Backlog (ideas outside the rubric)
- Whole-paragraph (Knuth–Plass) line breaking for justified text — the remaining B8.2 gap.
- Hover-to-preview for design choices (C10.1) without re-laying out the whole book (e.g. preview only the visible page).
- Pick one page indicator: the floating "5 of 15" pill repeats the status bar.
- Thumbnails re-render live after edits; picture previews in Export.
