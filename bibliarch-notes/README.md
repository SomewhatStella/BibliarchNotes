# Bibliarch Notes

A from-scratch rebuild of **storycanvas**'s Notes canvas (`stella/storycanvas`,
package `neighbornotes`) — the live app with real users. Same Supabase
project, same `stories`/`canvas_data` tables, same auth. Not a copy of the
data and not a disconnected prototype: log in with your real account and your
real stories are there.

The thing being replaced is `storycanvas/src/components/canvas/HTMLCanvas.tsx`
— 11,550 lines, one component, with a real bug history to show for it
(a navigation race that lost data, a folder that tried to nest itself inside
its own contents, mouse panning that didn't work, pasted text ignoring the
colour palette — all individually hunted down and patched). One bug is still
open in that file's own progress report: the relationship map's character
picker is marked **"ABANDONED BY USER — NON-FUNCTIONAL"**, because it read
character names from the database and the database was only ever as fresh as
the last 2-second debounced autosave. This rebuild fixes that at the
architecture level — see `src/lib/store.ts`.

## Run

```sh
npm install
npm run dev     # internal-only: http://127.0.0.1:5202/notes
```

For the integrated Storycanvas website, use `node scripts/start-storycanvas.mjs`
from `../bibliarch-books`, then open **http://localhost:3210**. Notes is the
`/notes` workspace and Books is `/books`. See `../bibliarch-books/docs/workspaces.md`
for supervision, routing, storage-origin preservation, and verification.

`.env.local` points at the same Supabase project storycanvas uses (copied
from there, not regenerated) — `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, the public client key, scoped by Row Level
Security to whichever account you log in as. No service-role key anywhere.

## Wave 1 + Wave 2 — both built

Decided explicitly rather than guessed, and built in that order: Wave 1 was
the dashboard, auth, and the canvas itself — every node type, navigation, the
relationship map, saving. Wave 2, approved after a look at Wave 1, adds
everything else storycanvas has:

- **Real-time collaboration** — live presence (who else is on this board),
  field-level locking while a collaborator is editing (with a visible
  "X is editing" badge), broadcast-synced node/connection changes. Ported
  from storycanvas's `useCollaboration.ts` broadcast-channel architecture —
  the single riskiest part of the live app — and verified end-to-end with two
  real browser sessions (see Verification below), not just built.
- **Sharing** — invite by username/email search, shareable join links with a
  role (editor/viewer), a pending-invitations inbox on the dashboard, leave
  a project, remove/re-role a collaborator. Calls the same
  `accept_share_invite` RPC and `story_collaborators`/`share_tokens` tables
  storycanvas already has deployed — no new backend needed.
- **Viewer role** — a read-only board: no Add menu, no drag/resize/edit/
  delete, a "viewing" badge in the breadcrumb. Enforced in the UI; the real
  boundary is the same `canvas_data` RLS policies storycanvas already has
  (role = 'editor' required to write), so a viewer can't persist a change
  even if the client were compromised.
- **Admin** — gated on `profiles.is_admin`, same column the live app uses.
  A user list and a feedback queue with status management.
- **Feedback** — a button anywhere in the app, writes to the same `feedback`
  table the live app's admin panel already reads.
- **Export** — walks the board tree and downloads a readable `.txt`. Simpler
  than storycanvas's own multi-format exporter; a `.docx` export is a
  reasonable fast-follow if asked for.
- **Not built, by deliberate choice**: templates (the Notes overhaul wishlist
  says to remove them — this rebuild never had them), a debug page (pure
  developer tool, no end-user value), freehand line annotations, dragging an
  *existing* card into a list (today you can only add a brand-new one),
  ownership transfer (the backend function exists in `lib/collaboration.ts`;
  no dialog UI yet).

## What's real right now

- **Auth** — email/password, matching storycanvas's own: "Confirm email" is
  off in Supabase, so signup returns a session immediately. See
  `src/lib/auth/actions.ts`.
- **Every node type** from the live `Node` interface: text, character,
  location, folder, list, image, table, event, relationship-canvas,
  compact-text. (`line` — freehand annotation — is writer-only in the
  original and isn't built here yet.)
- **The relationship map, actually working.** Pick two people from anywhere
  in the story, a tie type, strength, label, mutual or one-sided. See "The
  architecture fix" below for why this one used to break.
- **Images** go to the same `story-images` Supabase Storage bucket, as a
  storage *path* on the node — never base64. storycanvas learned this the
  hard way: base64-in-node blew past Realtime's per-message size cap and
  silently corrupted collaborative edits. Keeping paths now costs nothing and
  avoids repeating that when Wave 2 adds collaboration.
- **The "Text Format sidebar"** (the live app's own recent addition) as
  `NodeInspector`: locked, font, text size, picture shape, image fit, folder
  icon, per-card colour — all backed by the real `settings` sub-object.
- Pan/zoom, drag, resize, inline rename/edit, folder and location/character
  sub-boards (stamped empty on first open — no template system to stamp),
  connections (`leads-to` / `conflicts-with` / `relates-to`), a settings
  popup (grid size, snap, per-type palette).
- Autosave, 600ms after the last edit, flushed immediately on tab close/page
  navigation (the live app's own bug history includes a save-vs-navigation
  data-loss bug; this flushes rather than hoping the debounce wins the race).

## The architecture fix

`src/lib/store.ts` is the part of this rebuild that actually mattered most.
storycanvas's relationship map reads the character list from the database;
the database is only ever as fresh as the last autosave; autosave is
debounced 2 seconds; so creating a character and immediately opening the
relationship map (a completely normal thing to do) raced the save and lost —
permanently, per the bug report, since the fix attempts (refresh buttons,
retry delays, real-time subscriptions) all still depended on *something*
round-tripping to the server before the UI could be correct.

The fix here isn't a longer debounce. Every `canvas_data` row for a story
loads once, up front, into a Zustand store, and stays there as the single
source of truth for the session — Supabase is a save target, never
something the UI waits on a round-trip to read back from. `getAllCharacters()`
is exactly the read that used to break; it's a synchronous scan of in-memory
state now, so it can't be stale by a save that hasn't landed.

## Verification

Both waves were driven end-to-end with Playwright against the real Supabase
project — never just built and assumed. Wave 1: signed up a throwaway
account, created a story, exercised every node type, dragged and resized
cards, renamed via double-click, built an actual relationship tie between
two characters, navigated into a folder and back via breadcrumb, **reloaded
the page and confirmed the board survives**. Wave 2: two separate browser
sessions as two separate real accounts — one creates a share link, the other
joins it, and from there: the second session's live edits appear in the
first without a refresh, a visible "is editing" lock badge shows up while
one of them is mid-edit and clears when they're done, a viewer-role join
correctly hides every edit control and blocks editing while the owner's
board keeps working normally, feedback submission writes a real row, and
export downloads a real, correctly-structured file. Zero console errors
throughout. Throwaway stories were deleted afterward; a handful of
empty, clearly-named test accounts (`bn-smoketest-*`, `bn-debug-*`,
`bn-w2-*`, `bn-vt-*@example.com`) are harmless leftovers in the Supabase
project from runs where account cleanup wasn't scripted — ask if you want
those purged from the Supabase dashboard too.

Real bugs caught and fixed by actually driving the app rather than just
building it:
1. The toolbar's dropdown menus were unclickable in their lower half — a
   `transform: scale()` on the canvas layer created a stacking context that
   let it intercept clicks meant for the menu above it.
2. Newly added cards could land almost entirely on top of each other — the
   auto-placement grid assumed a uniform card size, and a 600×400
   relationship map blew past any reasonable uniform column width. Fixed by
   always placing a new card below the lowest point already on the board,
   which is correct for any mix of sizes regardless of how much dragging has
   already happened.
3. True modal dialogs (Share, Settings, Feedback) sat at a lower z-index than
   the toolbar, so the toolbar stayed clickable — and visually on top —
   underneath an open dialog. Modals now render above everything.
4. The lock badge and the connector dot were invisible/cut off: both use a
   negative offset to sit partway outside the card, and the card's own
   `overflow-hidden` (there to clip image corners) was clipping them too.
   Split into an outer unclipped layer for anything that sits at the edge
   and an inner clipped layer for body content.
5. **The serious one.** The realtime channel's "reconnect" handler fired on
   *every* successful connect, including the very first one right after a
   local edit — and did a full reload of the story from the database. A
   node added half a second before that reload landed would be silently
   wiped out, because the reload replaced the in-memory store with
   whatever was already persisted, discarding the add before its own
   debounced save had a chance to land. Fixed two ways: the reload now
   flushes any pending local saves first, and — found driving the app a
   second time, since the flush alone didn't close the window — the resync
   now only fires on a genuine *reconnect* (a real drop and recovery), never
   on a channel's first-ever connect. This is the same bug class Wave 1's
   architecture fix was about, in a different spot; worth knowing about if
   anything here ever gets touched again.

## Code map

```
src/types/supabase.ts          Database type — every table, including Wave 2's
src/lib/types.ts               field-for-field mirror of the live Node/Connection interfaces
src/lib/store.ts               Wave 1's architecture fix — the in-memory source of truth
src/lib/realtime.ts            Wave 2's hard part — broadcast sync, locking, presence (ported close to storycanvas's own)
src/lib/collaboration.ts       sharing CRUD — invites, share tokens, roles, the accept-invite RPC
src/lib/node-factory.ts        default shapes per node type
src/lib/storage.ts             story-images upload/URL resolution
src/lib/export.ts              the text exporter
src/lib/auth/                  actions.ts (signUp/signIn/signOut), errors.ts
src/lib/use-admin-gate.ts      the is_admin check, shared by every /admin page
src/components/StoryBoard.tsx  orchestrator: load, mutate, autosave, navigation, realtime wiring
src/components/CanvasView.tsx  pan/zoom/select/drag/resize/connect, readOnly + lockedNodes aware
src/components/NodeCard.tsx    per-type card rendering + inline editing
src/components/RelationshipEditor.tsx
src/components/NodeInspector.tsx  the Text Format sidebar
src/components/ShareDialog.tsx    invite/link/role/remove/leave
src/components/FeedbackModal.tsx
src/app/admin/                 hub, users, feedback
src/app/join/[token]/          accepts a share link
```
