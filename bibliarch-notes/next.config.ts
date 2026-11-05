import type { NextConfig } from "next";

// Separate Next zone; the existing Supabase auth and data backend are unchanged.
const nextConfig: NextConfig = {
  basePath: "/notes",
  // Verification builds can avoid overwriting a running server's .next files.
  distDir: process.env.NOTES_BUILD_DIR || ".next",
  reactStrictMode: true,
};
export default nextConfig;
