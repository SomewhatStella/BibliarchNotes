import OverviewNavigation from "@/components/OverviewNavigation";

export const metadata = { title: { absolute: "Page not found — Bibliarch" } };

/* Missing addresses inside Notes: same page as Home and Books (styles in site-theme.css). */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function NotFound() {
  return (
    <div className="notes-overview-shell flex min-h-screen flex-col">
      <OverviewNavigation />
      <main className="not-found flex-1">
        <section>
          <p className="not-found-mark" aria-hidden="true">404</p>
          <h1>This page isn&rsquo;t here</h1>
          <p>The link may be old, or the address may have a typo. Your books and notes are safe.</p>
          <div className="not-found-actions">
            <a className="primary" href="/">Go to Home</a>
            <a href="/notes/dashboard">Open Notes</a>
            <a href="/books">Open Books</a>
          </div>
        </section>
      </main>
    </div>
  );
}
