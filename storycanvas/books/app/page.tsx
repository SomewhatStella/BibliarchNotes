import './home.css';

export default function Home() {
  return (
    <main className="site-home welcome-home">
      {/* The original Storycanvas home leads with a centered introduction and
          dashboard action, then explains the tools before the game teaser. */}
      <section className="welcome-hero" aria-labelledby="home-title">
        <div className="welcome-hero-decoration" aria-hidden="true">
          <svg viewBox="0 0 240 240" fill="none"><circle cx="120" cy="120" r="105" /><circle cx="120" cy="120" r="80" /><circle cx="120" cy="120" r="55" /><path d="M120 0v240M0 120h240" /></svg>
        </div>
        <div className="welcome-inner">
          <p className="welcome-kicker">Bibliarch · Notes & Books</p>
          <h1 id="home-title">Visual story planning.<span>For writers who think visually.</span></h1>
          <p className="welcome-lead">Plan your characters, map their relationships, and build your story world. Then write and lay out the book.</p>
          <div className="welcome-actions">
            <a className="welcome-button welcome-button-primary" href="/notes/dashboard">Open Notes <span aria-hidden="true">→</span></a>
            <a className="welcome-button" href="/books">Open Books <span aria-hidden="true">→</span></a>
          </div>
          <a className="welcome-explore" href="#workspaces">Take a look around <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <div className="welcome-inner">
        <section className="welcome-workspaces" id="workspaces" aria-labelledby="workspaces-title">
          <header className="welcome-section-heading">
            <h2 id="workspaces-title">A place for your story.</h2>
            <p>Notes for planning. Books for putting it on the page.</p>
          </header>
          <div className="welcome-tool-grid">
            <article className="welcome-tool">
              <div className="welcome-tool-heading">
                <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" /><rect x="23" y="24" width="14" height="12" rx="2" /><path d="M10 16v14h13M17 10h13v14" /></svg>
                <h3>Notes</h3>
              </div>
              <p>Keep your ideas together on a canvas. Move things around as your story takes shape.</p>
              <ul>
                <li><strong>Characters & relationships</strong><span>Keep track of who they are and how they connect.</span></li>
                <li><strong>Notes & images</strong><span>Arrange your writing and visual references on a board.</span></li>
                <li><strong>Folders & canvases</strong><span>Give different parts of your world their own space.</span></li>
              </ul>
              <a className="welcome-text-link" href="/notes/dashboard">Go to Notes <span aria-hidden="true">→</span></a>
            </article>
            <article className="welcome-tool welcome-tool-books">
              <div className="welcome-tool-heading">
                <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M20 9C14 5 8 5 3 6v27c6-1 11-1 17 3 6-4 11-4 17-3V6c-5-1-11-1-17 3Zm0 0v27M8 13l7 1M8 19l7 1M25 14l7-1M25 20l7-1" /></svg>
                <h3>Books</h3>
              </div>
              <p>Write your book and work on how it looks, from the first page to the finished layout.</p>
              <ul>
                <li><strong>Writing & page layouts</strong><span>Work on the text and its place on the page.</span></li>
                <li><strong>Illustrations & character designs</strong><span>Make room for the visual side of your story.</span></li>
                <li><strong>PDF & EPUB export</strong><span>Download your book when you’re ready.</span></li>
              </ul>
              <a className="welcome-text-link" href="/books">Go to Books <span aria-hidden="true">→</span></a>
            </article>
          </div>
        </section>

        <section className="welcome-game" id="coming-soon" aria-labelledby="coming-title">
          <header className="welcome-section-heading">
            <p className="welcome-status">Coming soon</p>
            <h2 id="coming-title">Bibliarch, the game.</h2>
            <p>A character and world-building game. Still in development, not available to play yet.</p>
          </header>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/bibliarch-game-home.png" width="2028" height="1135" loading="lazy" alt="Early Bibliarch game screenshot: a character reading behind an open book, with the game's main menu on the right." />
            <figcaption>An early look at Bibliarch.</figcaption>
          </figure>
        </section>

        <section className="welcome-start" aria-labelledby="start-title">
          <h2 id="start-title">Start with an idea.</h2>
          <p>Open a canvas in Notes, or start a book.</p>
          <div className="welcome-actions">
            <a className="welcome-button welcome-button-primary" href="/notes/dashboard">Open Notes <span aria-hidden="true">→</span></a>
            <a className="welcome-button" href="/books">Open Books <span aria-hidden="true">→</span></a>
          </div>
        </section>
        <footer className="welcome-footer">
          <a href="/" className="welcome-footer-brand">Bibliarch</a>
          <p>Books are saved in this browser. Download a backup to keep a copy.<br />Notes and Books don’t automatically sync.</p>
          <a href="/notes/login">Sign in to Notes</a>
        </footer>
      </div>
    </main>
  );
}
