import type {Decal} from './design';
import type {Scene} from './model';

/*
 * Ornaments ("decals") belong to a section (one authoring page), but a long section
 * flows over several printed pages. Each ornament remembers which of those pages it
 * sits on (`page`, 0 = the section's first page; missing on older books = 0) and its
 * position as a percentage of that page. This is the same model placed pictures use.
 */
export const MAX_DECALS = 24;
export const MAX_DECAL_PAGE = 499;

export const decalPage = (d: Pick<Decal, 'page'>): number => d.page ?? 0;

/** The ornaments drawn on one page of a section. */
export function decalsOnPage(decals: Decal[] | undefined, pageIndex: number): Decal[] {
  return (decals || []).filter(d => decalPage(d) === pageIndex);
}

/** Position of a page element among its section's pages (0 when not found). */
export function pageIndexOf<T>(pages: ArrayLike<T>, page: T): number {
  const i = Array.prototype.indexOf.call(pages, page) as number;
  return i < 0 ? 0 : i;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export type DecalDrop = {pageIndex: number; x: number; y: number; src: string; alt: string; id: string};

/**
 * Adds a dropped ornament to the page of the section it was released over.
 * Any page of the section is a valid target (e.g. a scene break on page 3).
 */
export function placeDecal(scene: Scene, drop: DecalDrop): {scene: Scene; error?: string} {
  const decals = scene.decals || [];
  if (decals.length >= MAX_DECALS) return {scene, error: 'This page already has 24 ornaments, the most it can hold. Remove one to add another.'};
  const page = Math.round(clamp(Number.isFinite(drop.pageIndex) ? drop.pageIndex : 0, 0, MAX_DECAL_PAGE));
  const decal: Decal = {id: drop.id, src: drop.src, alt: drop.alt, x: clamp(drop.x, 0, 80), y: clamp(drop.y, 0, 98), width: 20, rotation: 0, opacity: 1};
  if (page > 0) decal.page = page;
  return {scene: {...scene, decals: [...decals, decal]}};
}

/**
 * Moving an ornament: when it is released over another page of the same section,
 * it moves to that page, keeping where it was on screen.
 */
export function moveDecalToPage(d: Decal, pageIndex: number, topPx: number, leftPx: number, pageRect: {left: number; top: number; width: number; height: number}): Decal {
  const page = Math.round(clamp(pageIndex, 0, MAX_DECAL_PAGE));
  const {page: _old, ...rest} = d;
  const moved: Decal = {...rest, x: clamp((leftPx - pageRect.left) / pageRect.width * 100, -200, 200), y: clamp((topPx - pageRect.top) / pageRect.height * 100, -200, 200)};
  if (page > 0) moved.page = page;
  return moved;
}
