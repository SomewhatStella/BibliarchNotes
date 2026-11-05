# Storycanvas: one origin, two Next zones

Public URL: http://localhost:3210

- `/`: shared landing page (bibliarch-books)
- `/books`: book editor (bibliarch-books)
- `/notes`: rebuilt Notes entrypoint; redirects to `/notes/dashboard` or `/notes/login`
- `/notes/*`, including `/notes/_next/*`: proxied to bibliarch-notes on loopback port 5202

Always open the public URL, not the internal Notes port. Keeping the exact
`http://localhost:3210` origin preserves existing browser-local books. Using
127.0.0.1, HTTPS, another port, or another browser profile creates a different
localStorage origin. Nothing migrates or clears book storage.

## Run both

Install dependencies in each project, then from `bibliarch-books`:

```
node scripts/start-storycanvas.mjs
```

Both servers bind only to 127.0.0.1. The launcher checks IPv4 and IPv6 ports,
refuses occupied ports rather than reusing/killing someone else's process,
waits for Notes login and public/proxied HTTP readiness, streams labeled logs,
and stops its own companion server if either child exits. Ctrl+C stops only
the process trees it started. Stop existing standalone development servers
in their own terminals before launching. It does not auto-select another
public port, since that would hide existing local books.

`NOTES_PORT` changes the internal port (default 5202). The host config also
supports `NOTES_ORIGIN` for independently managed zones; the supervised
launcher requires it to match its own loopback backend. The public port is
intentionally fixed at 3210. Production: build both projects first, then
`node scripts/start-storycanvas.mjs --production`. Rewrites are captured at
build time: use the same NOTES_PORT/NOTES_ORIGIN for the books build and run.
Do not build into `.next` while that project's development server is running.

## Routing rules

Within Notes, Next Link/router and server `redirect()` receive unprefixed app
routes because Next adds basePath (verified against live redirect responses).
Raw browser URLs explicitly include `/notes`; generated sharing links now
use `/notes/join/<token>`. Login/signup
server actions validate return URLs and can resume a pending invitation.
Cross-zone Home/Books links are plain anchors to `/` and `/books` — never
Next Link, which would prefix or try to use the wrong zone's router.

Notes board workspace links await its existing flushAll operation, check
save statuses, and stay on the board with an error message if saving fails.
Viewer links don't initiate saves. Existing autosave, Supabase clients,
Realtime coordination, schemas and RLS are unchanged. The old beforeunload
flush still exists; closing the tab/browser is not guaranteed to finish an
asynchronous save, and the existing store does not serialize in-flight
writes. This integration does not claim to fix those pre-existing limits.

## Verification without touching user data

From the parent directory:

```
node --test bibliarch-notes/tests/*.test.mjs
node bibliarch-notes/node_modules/typescript/bin/tsc -p bibliarch-notes/tsconfig.json --noEmit
```

Unauthenticated GET checks can verify `/notes` and protected pages redirect
to `/notes/login`, and login HTML serves assets under `/notes/_next/`.
Do not submit auth forms or open authenticated boards as a smoke test:
existing board load migrations may write real data. No credentials or user
data need to be inspected. Authentication and collaborative editing require
an explicitly authorized account/session test and were not exercised here.
