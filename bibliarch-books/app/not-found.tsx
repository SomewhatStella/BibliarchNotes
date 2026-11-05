export const metadata={title:{absolute:'Page not found — Bibliarch'}};
/* Missing addresses: a calm page with the way back, in the site's own look. */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function NotFound(){
 return <main className="not-found"><section><p className="not-found-mark" aria-hidden="true">404</p><h1>This page isn’t here</h1><p>The link may be old, or the address may have a typo. Your books and notes are safe.</p><div className="not-found-actions"><a className="primary" href="/">Go to Home</a><a href="/notes/dashboard">Open Notes</a><a href="/books">Open Books</a></div></section></main>;
}
