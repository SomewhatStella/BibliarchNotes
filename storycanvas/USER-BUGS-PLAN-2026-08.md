# User Bug Triage — August 2026

Every item below is traced to real code. File:line references are against the tree as of 2026-08-01.

> **STATUS 2026-08-01: everything below is implemented except #21 (stat graphs) and #22
> (character aliases), which are parked as agreed.** Password reset now keeps the email
> route — it is the only possible recovery path — but signup has no email step at all.
>
> **One thing still needs Stella, and none of the auth fixes are complete without it:**
> in the Supabase dashboard, Authentication → Providers → Email → turn **Confirm email OFF**,
> then run the `UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL`
> statement from `FIX_EMAIL_CONFIRMATION.sql` to release the accounts that are currently stranded.
> Also worth checking the Supabase usage dashboard for the egress situation (#5).
>
> **Second dashboard action (added with #23):** run `setup-image-storage.sql` in the SQL Editor
> to create the `story-images` bucket. Image sharing stays broken until it exists.

---

## #23 — Images don't share in collaborative mode (added 2026-08-01, fixed)

**Report:** "it will upload on one side then disappear and show on the other then disappear
altogether."

**What was happening:** images were never uploaded anywhere. `FileReader.readAsDataURL` turned
the file into a base64 data URL and stuffed it straight into `node.imageUrl`
(`HTMLCanvas.tsx`, four upload sites). `src/lib/storage/image-upload.ts` — a complete, working
Supabase Storage implementation — existed in the repo and **was imported by nothing**.

That breaks collaboration by construction. Every edit broadcasts the whole nodes array through
a Supabase Realtime channel, and Realtime caps a message at ~256KB. A phone photo is several
megabytes once base64-encoded, so:

1. Uploader sees their image (it's in their local state).
2. The broadcast exceeds the cap and fails. `broadcastChange` logged the result and ignored it.
3. The collaborator never receives the image.
4. The collaborator's next edit broadcasts *their* copy of that node — which has no image — and
   the uploader's version gets overwritten. The image is now gone for everyone.

The same base64 also sat inside the `canvas_data` row, so it was re-downloaded in full on every
single canvas load, feeding the egress problem in #5.

**Fixed:**
- Uploads go to Supabase Storage; nodes carry only the storage path. The data URL still shows
  instantly as a preview, then gets swapped for the path once the upload lands.
- All six `<img src>` sites render through `getImageUrl()`, which passes old base64 and http
  URLs through untouched, so nothing already on a canvas breaks.
- Cropped profile pictures upload too (they're copied into every relationship map, so they were
  the worst offender).
- A background migration lifts existing base64 images into storage a few at a time per canvas
  visit, so old projects heal themselves instead of staying broken forever.
- `broadcastChange` now checks the payload size and reports a non-`ok` send as an error instead
  of swallowing it. A silent broadcast failure is what made this look like a ghost.
- Failed uploads degrade to the old local-only behaviour rather than destroying the image.

### #23a — "works but really glitchy at first"

Four separate causes, all now fixed:

1. **The preview was still base64.** The instant preview used a data URL, so for the second or
   two before the upload finished, several megabytes sat in node state — and got broadcast and
   saved in that window. Previews are now `URL.createObjectURL(file)`: a short `blob:` string
   that displays just as fast and costs nothing to broadcast. Same change for cropped profile
   pictures. Object URLs are revoked once the storage path takes over.
2. **The swap flashed.** Changing `src` from the preview to the remote URL blanked the image
   while the browser fetched it. The storage URL is now preloaded and decoded before the swap,
   so it's invisible.
3. **The migration thrashed.** It ran off the `nodes` dependency — so on every keystroke — and
   did a state update, a save and an undo entry per image, three at a time, in a cascade. It now
   runs once per canvas load, uploads quietly in the background, and applies every result in a
   single state update merged against the latest nodes. It no longer writes to undo history,
   because it isn't something the user did.
4. **The preview was still shared state (this was the flip-flop).** Even as a short `blob:`
   string, the preview lived on the node — so it was broadcast and saved like any other edit.
   The collaborator applied a URL that means nothing in their tab, echoed it back, and the
   uploader's screen flipped between the preview and the real image until both sides converged.
   Previews now live in local-only component state (`imagePreviews`, keyed `nodeId:field`) and
   render through `resolveImageSrc()`, which prefers the saved value and falls back to the
   preview. **A node's `imageUrl` is now written exactly once, when the storage path is ready** —
   there is no intermediate value for anyone to echo. Collaborators see the placeholder for the
   second the upload takes, then the image, with no broken state in between.

5. **Every save reset the canvas from props.** `useSaveCanvas.onSuccess` writes the saved payload
   into the react-query cache, which flows back down as a "new" `initialNodes`, and the effect on
   `[initialNodes, initialConnections]` called `setNodes` and re-initialised the undo history.
   So every save reloaded the canvas from props — and with two saves in flight the canvas would
   visibly flip between their versions. That effect now ignores data identical to what it already
   has (first run always proceeds, since `visibleNodeIds` and history need seeding). This also
   fixes undo history being wiped after every save.

6. **REGRESSION (mine): the two clients started taking turns overwriting each other.**
   The 10s autosave from #8 combined with a pre-existing line in `handleStateChange` that set
   `hasUnsavedChanges = true` *before* the `isApplyingRemoteChange` guard. So applying someone
   else's edit marked you dirty, and ten seconds later you re-uploaded their work as your own.
   If your copy had drifted at all — a dropped broadcast, a transition skip — that push reverted
   them. Saving is last-writer-wins over the whole canvas, so a fixed-beat pusher on both sides
   makes the document ping-pong. Three fixes:
   - `hasUnsavedChanges` is now set *after* the remote-apply guard. Applying someone else's edit
     is not your change to push back.
   - The periodic autosave now runs **only in solo sessions** (`othersPresentRef`, from presence).
     Crash protection where it helps; save-when-something-happens where a timer does damage.
   - `refetchOnWindowFocus: false` on the canvas query. Alt-tabbing back was swapping your live
     canvas for whatever was last written to the row, which can be the other person's older
     snapshot. Live edits come over the realtime channel; focus is not a sync event.
   - The image migration pass is likewise skipped while anyone else is present.

7. **Dropped node snaps back to its old position, then forward again.** Same root as the ping-pong
   above, now fixed at the source rather than damped.

   The echo guard was `isApplyingRemote`, a ref cleared inside `requestAnimationFrame`. React can
   run the "state changed" passive effect *after* that frame, so the guard loses the race and the
   client re-broadcasts state it just received. Two clients doing that keeps stale whole-canvas
   snapshots circulating. Let go of a node and one of those snapshots — still carrying the old
   position — lands right after your drop, so the node jumps back; then your own change comes
   around again and it jumps forward.

   - The echo guard is now a **content check**: `lastRemoteSignature` holds a serialized copy of
     what the collaborator sent, and the state-change effect refuses to re-send state matching it.
     Content can't lose a race the way a timer can. The flag is kept as a fast path.
   - `recentlyMovedRef` records what you moved and when. When a remote snapshot arrives, nodes you
     moved in the last 2.5s keep their local `x`/`y`. An in-flight snapshot can no longer rewind a
     drop you just made.
   - The signature is taken from the **raw** remote payload, not the merged result — so if the
     merge did preserve a local position, our state legitimately differs and gets broadcast, which
     is how the other side learns where the node actually ended up.

   **Still fragile underneath, not fixed here:** sync is last-writer-wins over the entire
   document. The echo loop is closed and local drags are protected, but a dropped broadcast still
   leaves a client silently diverged until the next save. Proper per-update origin ids or a
   node-level merge is the real answer before leaning on collaboration any harder.

7. **`Map` was shadowed by a lucide icon.** `import { ..., Map, ... } from 'lucide-react'` at the
   top of `HTMLCanvas.tsx` shadows the global `Map` constructor for the entire file, so
   `new Map()` builds a React component instead of a map. This broke the `nodeIdMap` in template
   pasting (pre-existing, line ~4292) and would have broken the migration. The import is now
   `Map as MapIcon` and the three icon-lookup sites were updated.

---

## P0 — Auth. This is the majority of the complaints.

### 1. Delete the email-verification flow. We never had one.

**Reports:** "The email is not sending it to me", "Confirmation Email Not Sending", "i cant log in", "Won't let me sign in".

**What's happening:** `src/lib/auth/actions.ts:66-74` checks whether Supabase returned a session after
signup. If it didn't, it returns `{ needsConfirmation: true }`, and
`src/app/(auth)/signup/page.tsx:161-215` renders the "Check Your Email!" modal — the one promising a
link that expires in 24 hours. That modal is telling the truth about what Supabase *would* do. It's
just that "Confirm email" is toggled ON in the Supabase dashboard while no SMTP provider is
configured, so GoTrue's built-in courtesy mailer either silently drops the mail or rate-limits it
after a handful per hour. Users get an unconfirmed account they can never sign into — which is why
"I literally put in the right password" is genuinely true.

`.env.local` also has no `NEXT_PUBLIC_SITE_URL`, so `emailRedirectTo` (actions.ts:35) falls back to
`http://localhost:3000/dashboard`. Even the mails that *did* send pointed at the user's own machine.

**Fix:**
1. Supabase dashboard → Authentication → Providers → Email → turn **Confirm email OFF**. Code alone
   can't do this.
2. Run the `UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL`
   statement from `FIX_EMAIL_CONFIRMATION.sql`. This un-strands every account created since
   confirmation was switched on — it fixes the "right password won't work" reports retroactively.
3. Delete the confirmation modal (signup/page.tsx:161-215), the `showConfirmation`/`signupEmail`
   state, and the `needsConfirmation` branch in actions.ts. If a signup ever comes back without a
   session after this, show a plain error, not a promise of mail.
4. Add `NEXT_PUBLIC_SITE_URL` to the deployed env.

### 2. The `{}` error

**Reports:** "given an error like this ----> {}", "It keeps popping up with {} as the problem".

**What's happening:** `login/page.tsx:33` and `signup/page.tsx:35` render whatever string Supabase
hands back, verbatim. In `@supabase/auth-js/dist/main/lib/fetch.js:18`:

```js
const _getErrorMessage = (err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err)
```

When the auth request fails in a way the client can't parse — network failure, gateway error,
project over quota, rate limit with an empty body — that last fallback produces the literal string
`"{}"`, and we paint it straight into the red box.

**Fix:** an `authErrorMessage(err)` translator in `src/lib/auth/`. Map the known cases (invalid
credentials, email not confirmed, already registered, weak password, rate limited) to sentences a
teenager can act on, and catch-all everything else with "We couldn't reach the server — try again in
a minute." Never render a message that starts with `{`. Apply at all four call sites: login:33,
login:54, signup:35, reset-password:50.

### 3. Password reset silently does nothing

Same root cause as #1 — `login/page.tsx:52` calls `resetPasswordForEmail` and cheerfully shows
"Check your inbox!" whether or not anything sent. Reset is the one flow that genuinely *needs* mail,
so this one gets a real SMTP provider (Resend, ~free at our volume) wired into Supabase's SMTP
settings rather than being deleted. Until that's done, the success message should not claim an email
was sent.

### 4. Signup makes two auth calls per attempt

`actions.ts:18-27` tries `signInWithPassword` *before* signing up, "in case user exists". That
doubles our auth traffic on the exact endpoint that rate-limits, and it's the likeliest trigger for
the `{}` in #2. The `error.status === 422` check at line 47 already handles the duplicate-email case.
Delete the pre-flight sign-in.

---

## P0 — "Very slow", "won't load", "have to reload my tab"

### 5. We are (or were) over Supabase egress

`src/middleware.ts:5-8` — the entire auth middleware is commented out with
"TEMPORARY: Middleware disabled due to Supabase egress limits". A project at or over its free-tier
quota gets throttled, which plausibly explains the slowness *and* the unparseable auth errors in #2.
**First action: check the Supabase usage dashboard.** Everything else here is downstream of that
answer.

Structural cause: `useSupabaseQuery.ts:186-200` selects the entire `nodes` + `connections` JSON blob
for a canvas, and line 216 sets `refetchOnMount: 'always'`. Every single navigation between canvases
re-downloads the whole blob, uncompressed. A user with 100 characters is pulling megabytes per click.

**Fix:** cache canvas payloads in IndexedDB keyed by `(story_id, canvas_type, updated_at)`; fetch
only `updated_at` on mount and re-download the body only when it changed. Drop
`refetchOnMount: 'always'` in favour of that check. Consider splitting `nodes` out of the row so
listing a story doesn't drag its contents along.

### 6. Returning to a canvas hangs forever

**Report:** "If I leave a character canvas and try to return to it, it won't load and I have to
reload my tab."

`story/[id]/page.tsx:451-880` is a hand-rolled load state machine with `isCanvasTransition`, a 3s
timeout fallback, and several `return` paths (lines 455, 471, 479) that set `isLoadingCanvas = true`
and bail. **Nothing in the effect handles the query erroring.** `useCanvas` never surfaces `isError`
to this component, so when the fetch fails — which, per #5, it does — the page sits on the spinner
until the tab is reloaded.

**Fix:** consume `isError`/`error` from `useCanvas`, guarantee `setIsLoadingCanvas(false)` on every
exit path, and render a "Couldn't load this canvas — Retry" button instead of an indefinite spinner.

---

## P1 — Data loss. "It keeps removing what I write."

### 7. The save throttle discards writes instead of deferring them

`story/[id]/page.tsx:900-905`:

```js
if (!bypassDebounce && now - lastSaveTime.current < COLLAB_TIMING.SAVE_DEBOUNCE_MS) {
  console.log('📡 Debouncing save - too soon after last save')
  return
}
```

That is not a debounce. It's a throttle with no trailing edge — the save is dropped on the floor and
never rescheduled. `SAVE_DEBOUNCE_MS` is 300 (line 31). Canvas edits save on blur, and blurring two
fields within 300ms of each other is completely ordinary (tab between fields, click from title to
body). The second edit is gone.

**Fix:** real trailing-edge debounce — stash the pending payload, `setTimeout` the write, coalesce.
This is the single highest-value fix in the document.

### 8. No periodic autosave

Saves happen on blur, on navigation, and on `beforeunload` (page.tsx:1074). A user who types for ten
minutes and then closes the laptop lid, loses connection, or hits a crash loses everything since the
last blur. Add a 10-second interval autosave gated on `hasUnsavedChanges.current`.

### 9. The anti-data-loss guard blocks legitimate saves

`page.tsx:917-926`: if the main canvas previously had >5 nodes and we're saving ≤2, the save is
aborted. Someone who deliberately clears their board down to a couple of nodes can never save that
state — and gets no feedback that the save was refused. Replace with an undo-able confirm, or scope
it to the load/navigation race it was actually written for.

---

## P1 — Canvas interaction

### 10. Mouse wheel doesn't scroll the canvas

**Report:** "when I try to use my mouse roller to scroll down I can't! I have to manually scroll."

`HTMLCanvas.tsx:1058-1070` detects a real mouse and then scrolls `canvas.parentElement`. But the
canvas's parent is the fixed-size sizing wrapper at line 4736-4741, which has `overflow: hidden` —
the scrollable element is its *grandparent*, `scrollContainerRef` (line 4730). So we set `scrollTop`
on an element that can't scroll, and because we already called `preventDefault()`, native scrolling
is killed too. Net effect: mouse wheels do nothing.

**Fix:** scroll `scrollContainerRef.current`, exactly as the pan handler at line 1891 already
correctly does.

### 11. Dragging is offset from the cursor when zoomed out

**Reports:** "it moves away from your cursor", "appears more towards the left-ish and bottom".

There are twelve `setDragOffset` call sites. Ten divide by `zoom`. Two don't:

- `HTMLCanvas.tsx:8298-8304` — list nodes
- `HTMLCanvas.tsx:8581-8587` — dragging a list by one of its children

`handleCanvasMouseMove:1968` computes the new position in canvas space (`/ zoom`), so an offset
captured in screen space makes the node jump by `mouse × (1 − 1/zoom)` the instant the drag starts.
Add the two missing `/ zoom`s, then factor all twelve into one `getCanvasPoint(clientX, clientY)`
helper so this can't drift back.

### 12. Relationship map: characters can't be moved

**Reports:** "I can't move characters around in the relationship map, which means I really cannot use
the map", "This seems to be the only text box that is locked?"

`HTMLCanvas.tsx:7580-7660` — the character drag binds `onMouseDown` and then attaches
`mousemove`/`mouseup` to `document`. There are no touch or pointer handlers anywhere in that block,
so on a tablet or phone nothing happens at all. That matches the reporter's "maybe this is just a
non-desktop issue" exactly. The same handler also uses raw `clientX` deltas (line 7602) with no zoom
division, so on desktop the characters drift away from the cursor when zoomed.

**Fix:** convert to pointer events (`onPointerDown` + `setPointerCapture`), divide deltas by `zoom`.
Do the same sweep for the main node drag — it has `onTouchStart` in some branches but not all.

### 13. The relationship node feels locked

Editing the map requires a double-click that lands on *empty space* inside the inner panel —
`7529-7534` gates on `e.target === e.currentTarget`. Double-clicking a character, the header, or the
title does nothing, so it reads as "locked". Add a visible Edit button on the node, and let the whole
node accept the double-click.

### 14. Things get grabbed that shouldn't

**Reports:** "it involuntarily selects another item when I try to move things", "'add this into —'
even though there's nothing there".

`HTMLCanvas.tsx:2216-2290` decides list adoption by full AABB overlap: if the dragged node's
rectangle touches a list's rectangle *at all*, it gets adopted. Brushing past a list's edge swallows
the node. Switch to center-point containment plus a minimum overlap threshold, and only render the
drop highlight when the drop would actually fire.

---

## P2 — Smaller bugs

### 15. Table text is clipped and the caret lands at the bottom

**Report:** "when I come back and try to edit my sentences in a table, my characters are immediately
put to the bottom."

`HTMLCanvas.tsx:6557-6583` — the cell `<textarea>` auto-sizes in `onInput` only. On mount, and when
loading saved content, its height is never set, so multi-line cells render one line tall with
`overflow-hidden` and the content scrolled to the end. Click in, and the caret is at the bottom of
invisible text. Size on mount and on value change (ref callback, or `field-sizing: content`).

### 16. Typing in a table is O(whole canvas) per keystroke

Line 6566 calls `saveToHistory` on every `onChange`. `saveToHistory` (1220-1233) does two full
`JSON.stringify` comparisons plus a deep clone of every node on the canvas — per character typed.
This is a top suspect for the general "very slow" reports on large boards. Debounce history to a
~500ms idle, or push a single history entry per focus session.

---

## P2 — Feature requests

### 17. Lock text boxes in place

**Report:** "May I suggest having the option to lock text boxes etc in place? I keep accidentally
moving them."

`settings.locked` already exists on the Node type (`HTMLCanvas.tsx:68`) and is **referenced nowhere
else in the codebase**. The slot is there; nothing reads it. Wire it: a context-menu toggle, a small
lock badge on the node, and early returns in the drag/resize entry points. Small job, and it pairs
with #13 — same reporter, opposite problem.

### 18. More fonts, and title text that doesn't say "New Text Node"

**Report:** "i'd [like] text boxes that don't say 'new text node' so i can use them for titles! Also
you should add more fonts."

There is no font system — `layout.tsx` loads Geist sans and mono and that's the entire typography
story. Add a `settings.font_family` with maybe six curated faces (serif, rounded, handwritten,
display, mono, default) via `next/font`, exposed in the node context menu. Separately, add a "Title"
node preset — large, no body field, and an empty placeholder rather than the literal
`'New Text Node'` default at line 2475.

### 19. Reorder list items

`childIds` is append-order with no reordering UI. Add drag-to-reorder within a list, or at minimum
move-up/move-down in the child context menu.

### 20. Change box colors — probably already possible

Per-node color already works: `handleColorChange(selectedId, color)` via the palette selector.
The Draker likely never found it. Put the swatches directly in the node right-click menu instead of
only behind the palette panel. Discoverability fix, not a feature.

### 21. Stat graphs (radar / pentagon charts)

Genuinely new node type with its own editor. Real work — park it until the P0/P1 list is clear.

### 22. Reference one character from multiple folders

`linkedCanvasId` exists but only for navigation. A true alias node (renders live from a source node,
edits write back) is a data-model change. Park with #21.

---

## Suggested order

1. #1 + #2 + #4 — auth. Ship together, same afternoon. This is most of the inbox.
2. #5 — check the egress dashboard before designing anything else around it.
3. #7 — the save throttle. One function, stops active data loss.
4. #10 + #11 — wheel scroll and drag offset. Both small, both hit every user every session.
5. #12 + #13 — the relationship map, which is currently unusable for the person who reported it.
6. #6, #8, #9 — loading and save resilience.
7. #14, #15, #16 — interaction and perf polish.
8. #17 → #22 — features, in that order.
