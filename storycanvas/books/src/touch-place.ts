/** Phones can't drag from a scrolling tray, so a tap adds the item to the page on screen. */
export const isTap = (e: PointerEvent, startX = 0, startY = 0) => e.pointerType !== 'mouse' && Math.hypot(e.clientX - startX, e.clientY - startY) < 10;

/** The book page with the most area showing in the writing area. */
export function visiblePage(): HTMLElement | null {
  const scroller = document.querySelector('.document-scroller');
  if (!scroller) return null;
  const view = scroller.getBoundingClientRect();
  let best: HTMLElement | null = null, bestArea = 0;
  document.querySelectorAll<HTMLElement>('.pagination-page').forEach(page => {
    const r = page.getBoundingClientRect();
    const area = Math.max(0, Math.min(r.right, view.right) - Math.max(r.left, view.left)) * Math.max(0, Math.min(r.bottom, view.bottom) - Math.max(r.top, view.top));
    if (area > bestArea) { bestArea = area; best = page; }
  });
  return best;
}
