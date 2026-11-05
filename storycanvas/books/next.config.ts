import type { NextConfig } from 'next';

const notesOrigin = process.env.NOTES_ORIGIN || `http://127.0.0.1:${process.env.NOTES_PORT || '5202'}`;
const config: NextConfig = {
  turbopack: { root: process.cwd() },
  devIndicators: false,
  // The PDF and cover routes run headless Chromium; keep these out of the bundler and
  // ship the serverless Chromium binary with those functions (used on Vercel).
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core', 'playwright'],
  outputFileTracingIncludes: { '/api/pdf': ['./node_modules/@sparticuz/chromium/bin/**'], '/api/cover': ['./node_modules/@sparticuz/chromium/bin/**'] },
  // Isolate verification builds from a running studio's .next output.
  distDir: process.env.BIBLIARCH_BUILD_DIR || '.next',
  // Old storycanvas addresses (bookmarks, share links) now live under /notes.
  async redirects() {
    return [
      ...['/login', '/signup', '/dashboard', '/admin', '/admin/:path*', '/story/:id', '/join/:token'].map(source => ({ source, destination: `/notes${source}`, permanent: false })),
      { source: '/home', destination: '/', permanent: false },
      // The password-reset email links to /reset-password (already allowed in Supabase); the query code carries over.
      { source: '/reset-password', destination: '/notes/reset-password', permanent: false },
      { source: '/settings', destination: '/notes/settings', permanent: false },
    ];
  },
  async rewrites() {
    // On Vercel the project's vercel.json sends /notes to the Notes service before Books sees it.
    if (process.env.VERCEL && !process.env.NOTES_ORIGIN) return [];
    return [
      { source: '/notes', destination: `${notesOrigin}/notes` },
      { source: '/notes/:path*', destination: `${notesOrigin}/notes/:path*` },
    ];
  },
};
export default config;
