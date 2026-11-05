# Putting the new Bibliarch (Home + Notes + Books) on the website

The site is two Next.js apps that share one address:

- `bibliarch-books/` serves **Home** (`/`), **Books** (`/books`) and the PDF/cover export.
- `bibliarch-notes/` serves **Notes** under `/notes`. Books forwards every `/notes/...` request to it.

Both use the same Supabase project (and the same accounts and stories) as the old `storycanvas/` app, so nobody loses anything when the site switches over.

## One-time setup on Vercel

1. **Notes project.** Vercel → Add New → Project → import `HappyFluffyPegasus/Bibliarch`.
   - Root Directory: `bibliarch-notes`
   - Environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (copy them from the existing storycanvas project's settings).
   - Deploy, then note its address, e.g. `https://bibliarch-notes.vercel.app` (its pages are at `/notes/...`).
2. **Books project (the main site).** Add New → Project → the same repo again.
   - Root Directory: `bibliarch-books`
   - Environment variables: the same two Supabase values, plus `NOTES_ORIGIN` = the Notes address from step 1 (no trailing slash).
   - Deploy and open it: Home, `/books` and `/notes/login` should all work from this one address.
3. **Move the domain.** In the old storycanvas project → Settings → Domains, remove the Bibliarch domain; add it to the Books project. The old app keeps running at its own `*.vercel.app` address as a fallback.
4. **Supabase.** Authentication → URL Configuration: add the domain (and the Books project's `*.vercel.app` address) to the allowed redirect URLs.

Old storycanvas links such as `/dashboard`, `/story/<id>` and `/join/<token>` are redirected to the same pages under `/notes`.

## Afterwards

Every push to `main` redeploys both projects. If `NOTES_ORIGIN` changes, redeploy Books (the value is read at build time).

Book PDFs and cover PDFs are made on the server with headless Chromium. On Vercel this uses `@sparticuz/chromium` automatically (see `src/server-browser.ts`); try **File → Download as PDF** and **Cover & spine → Download cover PDF** once after the first deploy.
