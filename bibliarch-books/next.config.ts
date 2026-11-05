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
      { source: '/reset-password', destination: '/notes/login', permanent: false },
      { source: '/settings', destination: '/notes/dashboard', permanent: false },
    ];
  },
  async rewrites() {
    return [
      { source: '/notes', destination: `${notesOrigin}/notes` },
      { source: '/notes/:path*', destination: `${notesOrigin}/notes/:path*` },
    ];
  },
};
export default config;
