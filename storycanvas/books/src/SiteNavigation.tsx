'use client';
import {usePathname} from 'next/navigation';
import {ThemeToggle} from './ThemeToggle';
import BugReport from './BugReport';
export function BookMark(){return <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8C12 5 7 5 3 6v20c5-1 9-1 13 2 4-3 8-3 13-2V6c-4-1-9-1-13 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M16 8v20M8 11l4 1M8 16l4 1M21 12l3-1M21 17l3-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
export default function SiteNavigation(){
 const path=usePathname();
 return <header className="site-navigation"><a href="/" className="site-wordmark" aria-label="Bibliarch home"><BookMark/><span>Bibliarch<span className="site-wordmark-note">a home for your stories</span></span></a><nav aria-label="Workspaces"><a href="/" aria-current={path==='/'?'page':undefined}>Home</a><a href="/notes/dashboard">Notes</a><a href="/books" aria-current={path.startsWith('/books')?'page':undefined}>Books</a></nav><div className="site-nav-end"><div id="site-nav-tools" className="site-nav-tools"/>{/* Books puts its own feedback button in the slot above (it knows who is signed in). */}{!path.startsWith('/books')&&<BugReport/>}<ThemeToggle /></div></header>;
}
