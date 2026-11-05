/* Cross-zone navigation deliberately uses full-document links. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { ThemeToggle } from './ThemeToggle';
import HeaderFeedback from './HeaderFeedback';
export default function OverviewNavigation() {
 return <header className="site-navigation">
  <a href="/" className="site-wordmark" aria-label="Bibliarch home">
   <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8C12 5 7 5 3 6v20c5-1 9-1 13 2 4-3 8-3 13-2V6c-4-1-9-1-13 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M16 8v20M8 11l4 1M8 16l4 1M21 12l3-1M21 17l3-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
   <span>Bibliarch<span className="site-wordmark-note">a home for your stories</span></span>
  </a>
  <nav aria-label="Workspaces"><a href="/">Home</a><a href="/notes/dashboard" aria-current="page">Notes</a><a href="/books">Books</a></nav>
  <div className="site-nav-end"><HeaderFeedback /><ThemeToggle /></div>
 </header>;
}
