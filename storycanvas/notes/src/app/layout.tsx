import type { Metadata } from "next";
import "./globals.css";
import "./site-theme.css";
import "./board-theme.css";
import "./feedback.css";
import { ThemeBootstrap } from "../components/ThemeToggle";


export const metadata: Metadata = {
  title: { default: "Bibliarch Notes", template: "%s — Bibliarch Notes" },
  description: "Plan your characters, places and plot on one connected board. Part of Bibliarch, a home for your stories.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><ThemeBootstrap /></head>
      {/* suppressHydrationWarning: browser extensions (Grammarly, etc.) inject
          data-gr-* attributes onto <body> before React hydrates — a client-only
          mismatch with no fix on our end, not a real SSR bug. */}
      <body className="font-body antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
