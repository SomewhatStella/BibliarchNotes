'use client';
import {useEffect, useRef, useState} from 'react';

/** Which sheet is in view while scrolling: "5 of 9" pill (shown while scrolling) plus a live value for the status bar. */
export function useCurrentPage(starts: Record<string, number>, total: number, reset = '') {
  const [current, setCurrent] = useState(1);
  const [scrolling, setScrolling] = useState(false);
  const latest = useRef(starts); latest.current = starts;
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.document-scroller');
    if (!root) return;
    let frame = 0, timer = 0;
    const measure = () => {
      frame = 0;
      const box = root.getBoundingClientRect(), line = box.top + Math.min(box.height * 0.4, 360);
      let best: {n: number; d: number} | null = null;
      root.querySelectorAll<HTMLElement>('.paginated-source').forEach(paper => {
        const start = latest.current[paper.id.slice(5)];
        if (!start) return;
        paper.querySelectorAll<HTMLElement>('.pagination-page').forEach((page, i) => {
          const r = page.getBoundingClientRect();
          const d = line < r.top ? r.top - line : line > r.bottom ? line - r.bottom : 0;
          if (!best || d < best.d) best = {n: start + i, d};
        });
      });
      if (best) setCurrent((best as {n: number}).n);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
      setScrolling(true); clearTimeout(timer); timer = window.setTimeout(() => setScrolling(false), 1100);
    };
    measure();
    // Pages render after a book opens; measure again once they're laid out.
    const late = window.setTimeout(measure, 700), later = window.setTimeout(measure, 2000);
    root.addEventListener('scroll', onScroll, {passive: true});
    return () => { root.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); clearTimeout(timer); clearTimeout(late); clearTimeout(later); };
  }, [total, reset]);
  return {current: Math.min(current, Math.max(total, 1)), scrolling};
}

export default function PageIndicator({current, total, visible}: {current: number; total: number; visible: boolean}) {
  return <div className={`page-indicator${visible ? ' show' : ''}`} aria-hidden="true"><span><b>{current}</b> of {total}</span></div>;
}
