# How the Bibliarch website is deployed

bibliarch.com is the Vercel project **bibliarch**, linked to the GitHub repo `SomewhatStella/BibliarchNotes`
(branch `main`, Root Directory `storycanvas`). Every push to `main` deploys the site.

`storycanvas/` holds two Next.js apps that ship together as one deployment (Vercel **Services**):

- `storycanvas/books/` (this app): Home `/`, Books `/books`, and the PDF and cover export.
- `storycanvas/notes/`: Notes, under `/notes`.
- `storycanvas/vercel.json`: sends `/notes` and `/notes/...` to Notes and everything else to Books.

Both use the project's existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, so accounts and stories are shared.
Old storycanvas links (`/dashboard`, `/story/<id>`, `/join/<token>`, `/login`, `/settings`, `/reset-password`) redirect to the same pages under `/notes`.

The old storycanvas app is kept at the git tag `storycanvas-final`. To go back: Vercel → Deployments → pick the last old deployment → Instant Rollback.

Local work happens in `stella/bibliarch-books` and `stella/bibliarch-notes`; copy their tracked files into
`storycanvas/books` and `storycanvas/notes` of the repo to publish.

Book and cover PDFs are made on the server with headless Chromium; on Vercel this uses `@sparticuz/chromium`
(see `src/server-browser.ts`).
