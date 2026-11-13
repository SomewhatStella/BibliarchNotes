import {describe, it, expect, beforeAll, afterAll} from 'vitest';
import {decoratePage} from '../src/pagination/furniture';
import {placeDecal, decalsOnPage, moveDecalToPage, pageIndexOf} from '../src/decal-placement';
import {assertDesign, type Decal} from '../src/design';
import {buildPrintHtml} from '../src/publishing';
import {seed, parseLibrary, type Scene} from '../src/model';

/*
 * Regression: "Ornaments work below chapters and in earlier places, but when I used one
 * for a later scene break it disappeared when I released the mouse."
 * A long chapter flows over several printed pages. Ornaments could only be dropped on
 * (and were only drawn on) the first page of a section, so a drop on a later scene
 * break — page 2, 3... of the same section — was thrown away.
 */

// A very small stand-in for the browser DOM: just what the page furniture uses.
class FakeEl {
  children: FakeEl[] = []; parent: FakeEl | null = null; dataset: Record<string, string> = {};
  style: Record<string, string> = {}; className = ''; contentEditable = ''; src = ''; alt = ''; draggable = true; textContent = '';
  attrs: Record<string, string> = {};
  constructor(public tag: string) {}
  classList = {toggle: () => {}};
  append(...els: FakeEl[]) { for (const el of els) { el.parent = this; this.children.push(el); } }
  replaceChildren() { this.children = []; }
  setAttribute(k: string, v: string) { this.attrs[k] = v; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  all(): FakeEl[] { return this.children.flatMap(c => [c, ...c.all()]); }
  querySelectorAll(sel: string) { return sel === '[data-decoration]' ? this.all().filter(e => e.dataset.decoration) : []; }
}
const realDocument = (globalThis as any).document;
beforeAll(() => { (globalThis as any).document = {createElement: (t: string) => new FakeEl(t)}; });
afterAll(() => { (globalThis as any).document = realDocument; });

const metrics = (view: any) => ({widthPx: 500, heightPx: 700, marginPx: 50, view});
function drawnDecals(scene: Scene, pageIndex: number): string[] {
  const page = new FakeEl('section'), body = new FakeEl('div'), prefix = new FakeEl('div');
  body.append(prefix); page.append(body);
  decoratePage(page as any, body as any, prefix as any, metrics(scene) as any, pageIndex);
  return page.all().filter(e => e.tag === 'img' && e.dataset.decalId).map(e => e.dataset.decalId);
}
const chapter = (): Scene => ({id: 'ch1', title: 'Chapter 1', template: 'prose', content: {root: {type: 'root', children: []}} as any});

describe('ornaments on later scene breaks', () => {
  it('a drop on the third page of a long chapter keeps the ornament and draws it on that page', () => {
    let scene = chapter();
    // First scene break, on the chapter's first page: this always worked.
    scene = placeDecal(scene, {pageIndex: 0, x: 40, y: 30, src: 'builtin:stars', alt: 'Stars', id: 'first-break'}).scene;
    // A later scene break, on page 3 of the same chapter: this one used to vanish.
    const later = placeDecal(scene, {pageIndex: 2, x: 40, y: 55, src: 'builtin:stars', alt: 'Stars', id: 'later-break'});
    expect(later.error).toBeUndefined();
    scene = later.scene;
    expect(scene.decals?.map(d => d.id)).toEqual(['first-break', 'later-break']);
    expect(drawnDecals(scene, 0)).toEqual(['first-break']);
    expect(drawnDecals(scene, 1)).toEqual([]);
    expect(drawnDecals(scene, 2)).toEqual(['later-break']);
  });

  it('the same ornament can be used for several scene breaks on different pages', () => {
    let scene = chapter();
    for (const [i, page] of [0, 1, 1, 4].entries()) scene = placeDecal(scene, {pageIndex: page, x: 40, y: 20 + i * 10, src: 'builtin:diamond', alt: 'Diamond', id: 'd' + i}).scene;
    expect(decalsOnPage(scene.decals, 1).map(d => d.id)).toEqual(['d1', 'd2']);
    expect(drawnDecals(scene, 4)).toEqual(['d3']);
    expect(() => assertDesign(scene)).not.toThrow();
  });

  it('older books without a page number keep their ornaments on the first page', () => {
    const old: Decal = {id: 'legacy', src: 'builtin:stars', alt: 'Stars', x: 10, y: 20, width: 20, rotation: 0, opacity: 1};
    const scene = {...chapter(), decals: [old]};
    expect(drawnDecals(scene, 0)).toEqual(['legacy']);
    expect(drawnDecals(scene, 1)).toEqual([]);
  });

  it('the page is found among the section pages, and moving to another page re-homes the ornament', () => {
    const pages = ['p0', 'p1', 'p2'];
    expect(pageIndexOf(pages, 'p2')).toBe(2);
    const d: Decal = {id: 'm', src: 'builtin:stars', alt: 'Stars', x: 10, y: 90, width: 20, rotation: 0, opacity: 1};
    const moved = moveDecalToPage(d, 1, 1100, 150, {left: 100, top: 1000, width: 500, height: 700});
    expect(moved.page).toBe(1);
    expect(moved.x).toBeCloseTo(10);
    expect(moved.y).toBeCloseTo(100 / 7);
    expect(moveDecalToPage({...d, page: 3}, 0, 0, 0, {left: 0, top: 0, width: 1, height: 1}).page).toBeUndefined();
  });

  it('survives saving and reloading, rejects bad page numbers, and prints on the right page', () => {
    const lib = seed(), s = lib.books[0].chapters[1].scenes[0];
    s.decals = [{id: 'later', src: 'builtin:stars', alt: 'Stars', x: 40, y: 55, width: 20, rotation: 0, opacity: 1, page: 2}];
    expect(parseLibrary(JSON.stringify(lib)).books[0].chapters[1].scenes[0].decals?.[0].page).toBe(2);
    expect(() => assertDesign({decals: [{...s.decals![0], page: -1}]})).toThrow();
    expect(() => assertDesign({decals: [{...s.decals![0], page: 1.5}]})).toThrow();
    const html = buildPrintHtml({title: 'B', format: {widthMm: 128, heightMm: 182, marginMm: 15}, sections: [{id: 'c', title: 'C', kind: 'prose', content: s.content, decals: s.decals}]} as any);
    expect(html).toContain('top:calc(2 * var(--decal-content-h) + 0.55 * var(--decal-page-h) - var(--decal-margin))');
    expect(html).toContain('--decal-content-h:152mm');
  });
});
