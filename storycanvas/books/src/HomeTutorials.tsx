'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * Home-page mini tutorials: short silent screen recordings of the real Notes and Books
 * apps, one per feature. Videos live in /public/tutorials (recorded by
 * bibliarch-promo/tutorials.cjs, encoded by tut-encode.cjs). Nothing downloads until
 * the section scrolls near the screen, and only the selected clip ever loads.
 */
type Tutorial = { id: string; title: string; caption: string };
const TUTORIALS: Record<'notes' | 'books', Tutorial[]> = {
  notes: [
    { id: 'n-story', title: 'Start a story', caption: 'Click New story, give it a name, and start from a blank board or the ready-made Story planner.' },
    { id: 'n-cards', title: 'Add cards to your board', caption: 'Use the buttons down the left side to add text, characters, places and stickies. Double-click a card to write in it, and drag it wherever you like.' },
    { id: 'n-characters', title: 'Give each character a profile', caption: 'Click Open on a character card to see their own board: picture, details, backstory and arc. The trail at the top takes you back.' },
    { id: 'n-folders', title: 'Keep things in folders', caption: 'A folder holds a whole board of its own. Click Open to step inside, then use the trail at the top to go back.' },
    { id: 'n-lists', title: 'Lists and tables', caption: 'Drag any card onto a list to add it there. Tables keep track of the details, row by row.' },
    { id: 'n-relmap', title: 'Map who’s who', caption: 'In a relationship map, click Tie, pick two people and say how they’re connected: friends, family, rivals and more.' },
    { id: 'n-share', title: 'Share with a friend', caption: 'Click the Share button at the top right to invite someone by name, or make a link. Editors can change things; viewers can only look.' },
  ],
  books: [
    { id: 'b-start', title: 'Start a book', caption: 'Pick a ready-made book (novel, light novel, journal, poetry) or a blank one. Your pages are listed on the left.' },
    { id: 'b-write', title: 'Write on real pages', caption: 'Click a chapter and type. Use the Normal text menu for headings, and the toolbar for bold, italic and alignment. New pages appear on their own.' },
    { id: 'b-design', title: 'Design the whole book', caption: 'Click Design to choose fonts and the book’s size. Format › Book themes changes the whole look in one click.' },
    { id: 'b-pictures', title: 'Pictures and ornaments', caption: 'Use Ornaments, Text box and Picture on the right. Drag an ornament onto any page.' },
    { id: 'b-cover', title: 'Design your cover', caption: 'Click Cover & spine at the top of the page list. Choose a style and colours for the front, spine and back.' },
    { id: 'b-import', title: 'Bring in a manuscript', caption: 'Click Import a manuscript and choose a Word or text file. Bibliarch finds your chapters for you.' },
    { id: 'b-export', title: 'Preview and download', caption: 'View › 3D book shows it as a real book. Preview & export downloads a print-ready PDF for Amazon KDP or IngramSpark, or an e-book.' },
  ],
};
const SRC = (id: string) => `/tutorials/${id}.mp4`;
const POSTER = (id: string) => `/tutorials/${id}.jpg`;

export default function HomeTutorials() {
  const [tab, setTab] = useState<'notes' | 'books'>('notes');
  const [index, setIndex] = useState(0);
  // Clips play one after another until someone picks one; then that one loops.
  const [picked, setPicked] = useState(false);
  const [near, setNear] = useState(false);
  const [reduced, setReduced] = useState(false);
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const list = TUTORIALS[tab];
  const current = list[index] ?? list[0];

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const el = section.current;
    if (!el || !('IntersectionObserver' in window)) { setNear(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when the player scrolls out of view; resume when it comes back.
  useEffect(() => {
    const v = video.current;
    if (!v || !near || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { if (!reduced) v.play().catch(() => {}); } else v.pause(); }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, [near, reduced, current.id]);

  function choose(i: number) {
    setIndex(i); setPicked(true);
    // On phones the list sits under the player: bring the player back into view so the pick is seen playing.
    const frame = section.current?.querySelector('.tut-frame');
    const r = frame?.getBoundingClientRect();
    if (frame && r && (r.top < 0 || r.bottom > window.innerHeight)) frame.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }
  function switchTab(t: 'notes' | 'books') { if (t !== tab) { setTab(t); setIndex(0); setPicked(false); } }
  function onTabKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const t = tab === 'notes' ? 'books' : 'notes'; switchTab(t); document.getElementById(`tut-tab-${t}`)?.focus(); }
  }

  return (
    <section className="welcome-tutorials" id="how-it-works" aria-labelledby="tutorials-title" ref={section}>
      <header className="welcome-section-heading">
        <h2 id="tutorials-title">See how it works.</h2>
        <p>Short videos of each part of Bibliarch. Pick one to watch it.</p>
      </header>
      <div className="tut-tabs" role="tablist" aria-label="Choose an app" onKeyDown={onTabKey}>
        {(['notes', 'books'] as const).map(t => (
          <button key={t} id={`tut-tab-${t}`} role="tab" type="button" aria-selected={tab === t} aria-controls="tut-panel" tabIndex={tab === t ? 0 : -1} className="tut-tab" onClick={() => switchTab(t)}>
            {t === 'notes'
              ? <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><rect x="3" y="4" width="14" height="12" rx="2" /><rect x="23" y="24" width="14" height="12" rx="2" /><path d="M10 16v14h13M17 10h13v14" /></svg>
              : <svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M20 9C14 5 8 5 3 6v27c6-1 11-1 17 3 6-4 11-4 17-3V6c-5-1-11-1-17 3Zm0 0v27" /></svg>}
            {t === 'notes' ? 'Notes' : 'Books'}
          </button>
        ))}
      </div>
      <div className="tut-body" id="tut-panel" role="tabpanel" aria-labelledby={`tut-tab-${tab}`}>
        <figure className="tut-player">
          <div className="tut-frame">
            <video
              key={current.id}
              ref={video}
              src={near ? SRC(current.id) : undefined}
              poster={POSTER(current.id)}
              muted
              playsInline
              autoPlay={near && !reduced}
              loop={picked}
              controls
              preload="none"
              aria-label={`Video: ${current.title}`}
              onEnded={() => { if (!picked) setIndex(i => (i + 1) % list.length); }}
            />
          </div>
          <figcaption>
            <strong>{current.title}</strong>
            <span>{current.caption}</span>
          </figcaption>
        </figure>
        <ol className="tut-list">
          {list.map((t, i) => (
            <li key={t.id}>
              <button type="button" className="tut-item" aria-current={i === index ? 'true' : undefined} onClick={() => choose(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={POSTER(t.id)} alt="" loading="lazy" width="96" height="54" />
                <span className="tut-item-text">
                  <span className="tut-item-title"><span className="tut-num">{i + 1}</span>{t.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
