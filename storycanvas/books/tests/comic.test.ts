import {describe, it, expect} from 'vitest';
import {COMIC_LAYOUTS, newComic, comicOf, setLayout, panelBoxes, insetPolygon, artBox, panFocus, assertComic, comicPrintHtml, comicEpubHtml, type ComicPage} from '../src/comic';

describe('comic page layouts', () => {
  it('every layout tiles the page without overlaps and every panel is convex', () => {
    for (const l of COMIC_LAYOUTS) {
      let area = 0;
      for (const poly of l.panels) {
        let a = 0;
        for (let i = 0; i < poly.length; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]; a += x0 * y1 - x1 * y0; }
        area += Math.abs(a) / 2;
        const signs = poly.map((p, i) => { const q = poly[(i + 1) % poly.length], r = poly[(i + 2) % poly.length]; return Math.sign((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0])); });
        expect(new Set(signs.filter(Boolean)).size, l.id).toBe(1);
      }
      expect(area, l.id).toBeLessThanOrEqual(1.000001);
      if (l.id !== 'yonkoma') expect(area, l.id).toBeCloseTo(1, 5);
    }
  });
  it('gutters are an even width in millimetres, and outer edges stay on the margin', () => {
    const c: ComicPage = {...newComic('grid-2x2'), gutterMm: 6, marginMm: 10};
    const [a, b, c3] = panelBoxes(c, 148, 210);
    // Page 148 mm wide, 10 mm margins: 128 mm of art, split in two with a 6 mm gutter.
    expect(a.left).toBeCloseTo(10 / 148 * 100);
    expect(a.width).toBeCloseTo(61 / 148 * 100);
    expect(b.left - (a.left + a.width)).toBeCloseTo(6 / 148 * 100);
    expect(c3.top - (a.top + a.height)).toBeCloseTo(6 / 210 * 100);
    const slanted = insetPolygon([[0, 0], [10, 0], [8, 10], [0, 10]], 2);
    // The slanted right edge moves in by exactly 1 (half the gutter), measured square to the edge.
    const [p, q] = [slanted[1], slanted[2]], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const distance = Math.abs((q[0] - p[0]) * (10 - p[1]) - (q[1] - p[1]) * (8 - p[0])) / len;
    expect(distance).toBeCloseTo(1);
  });
  it('right-to-left puts panel 1 at the top right', () => {
    const ltr = panelBoxes(newComic('grid-2x3'), 148, 210), rtl = panelBoxes({...newComic('grid-2x3'), rtl: true}, 148, 210);
    expect(ltr[0].left).toBeLessThan(ltr[1].left);
    expect(rtl[0].left).toBeGreaterThan(rtl[1].left);
    expect(rtl[0].left + rtl[0].width).toBeCloseTo(100 - ltr[0].left);
  });
  it('changing layout keeps the art in every panel, including ones not shown', () => {
    const c = newComic('grid-2x3');
    c.panels[5] = {...c.panels[5], assetId: 'art-6'};
    const small = setLayout(c, 'splash');
    expect(small.panels).toHaveLength(6);
    expect(setLayout(small, 'grid-2x3').panels[5].assetId).toBe('art-6');
    expect(comicOf({comic: {...newComic('splash'), layout: 'dynamic-5'}}).panels).toHaveLength(5);
    expect(comicOf({}).layout).toBe('dynamic-5');
  });
});

describe('panel art', () => {
  it('fill covers the panel and fit shows the whole picture', () => {
    const wide = artBox(1, 2, {fit: 'cover', zoom: 1, focusX: 50, focusY: 50});
    expect(wide).toMatchObject({width: 200, height: 100, left: -50, top: 0});
    expect(artBox(1, 2, {fit: 'contain', zoom: 1, focusX: 50, focusY: 50})).toMatchObject({width: 100, height: 50, left: 0, top: 25});
    expect(artBox(1, 1, {fit: 'cover', zoom: 2, focusX: 0, focusY: 100})).toMatchObject({width: 200, height: 200, left: 0, top: -100});
  });
  it('dragging moves the picture with the pointer and stops at its edges', () => {
    const p = {fit: 'cover' as const, zoom: 1, focusX: 50, focusY: 50};
    // 200 px panel, picture twice as wide: 200 px of slack. Dragging right by 50 px shows more of the left side.
    expect(panFocus(200, 200, 1, 2, p, 50, 0)).toEqual({focusX: 25, focusY: 50});
    expect(panFocus(200, 200, 1, 2, p, 1000, 0).focusX).toBe(0);
    expect(panFocus(200, 200, 1, 2, p, 0, 40).focusY).toBe(50); // no vertical slack
  });
});

describe('saving and exporting', () => {
  const comic = (): ComicPage => {
    const c = newComic('big-two');
    c.panels[0] = {...c.panels[0], assetId: 'a1', bubbles: [{id: 'b1', kind: 'speech', text: 'Hello <there>', x: 10, y: 10, width: 30, sizePt: 10, tail: 'bottom-left'}]};
    return c;
  };
  it('validates comic data', () => {
    expect(() => assertComic(comic())).not.toThrow();
    expect(() => assertComic({...comic(), layout: 'nope'})).toThrow();
    expect(() => assertComic({...comic(), gutterMm: 99})).toThrow();
    const c = comic(); c.panels[0].bubbles![0].kind = 'shout' as any;
    expect(() => assertComic(c)).toThrow();
    expect(() => assertComic({...comic(), panels: Array.from({length: 13}, () => comic().panels[1])})).toThrow();
  });
  it('print draws panels, borders and escaped bubbles; e-book lists panels in reading order', () => {
    const png = 'data:image/png;base64,AAAA';
    const html = comicPrintHtml(comic(), 148, 210, i => i === 0 ? {src: png, width: 400, height: 300} : undefined);
    expect(html.match(/class="comic-panel"/g)).toHaveLength(3);
    expect(html).toContain('clip-path:polygon(');
    expect(html).toContain('<polygon');
    expect(html).toContain('Hello &lt;there&gt;');
    expect(html).toContain('comic-tail bottom-left');
    expect(html).not.toContain('<there>');
    const epub = comicEpubHtml(comic(), i => i === 0 ? 'images/p1.png' : undefined);
    expect(epub).toContain('<img src="images/p1.png"');
    expect(epub.match(/<figure/g)).toHaveLength(1);
  });
});

import JSZip from 'jszip';
import {seed, parseLibrary, pageTemplates} from '../src/model';
import {applyTemplate, styledPage, pageLabels} from '../src/templates';
import {buildPrintHtml, buildEpub, validatePrint, type PublishBook} from '../src/publishing';
import {printCheck} from '../src/print-check';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('comic pages in a book', () => {
  it('is a page type, keeps writing when switched, and saves with the book', () => {
    expect(pageTemplates).toContain('comic');
    expect(pageLabels.comic).toBe('Comic page');
    expect(styledPage('comic', 'minimal').comic?.panels).toHaveLength(5);
    const lib = seed(), book = lib.books[0], s = book.chapters[1].scenes[0];
    const switched = applyTemplate(s, 'comic', book);
    expect(switched.content).toBe(s.content);
    book.images = [{id: 'art1', src: PNG, name: 'page1.png', naturalWidth: 1, naturalHeight: 1}];
    book.chapters[1].scenes[0] = {...switched, comic: {...switched.comic!, rtl: true, panels: switched.comic!.panels.map((p, i) => i ? p : {...p, assetId: 'art1', bubbles: [{id: 'b', kind: 'speech', text: 'Hi', x: 5, y: 5, width: 20, sizePt: 9}]})}};
    const back = parseLibrary(JSON.stringify(lib)).books[0].chapters[1].scenes[0];
    expect(back.comic?.rtl).toBe(true);
    expect(back.comic?.panels[0].assetId).toBe('art1');
    const broken = JSON.parse(JSON.stringify(lib)); broken.books[0].chapters[1].scenes[0].comic.layout = 'bad';
    expect(() => parseLibrary(JSON.stringify(broken))).toThrow();
    // Back to a writing page and again to comic: the panels are still there.
    expect(applyTemplate(applyTemplate(back, 'prose', book), 'comic', book).comic?.panels[0].assetId).toBe('art1');
  });

  const publishBook = (): PublishBook => {
    const c = newComic('big-two');
    c.panels[0].bubbles = [{id: 'b1', kind: 'caption', text: 'Long ago…', x: 12, y: 12, width: 40, sizePt: 9}];
    return {title: 'Manga', format: {widthMm: 128, heightMm: 182, marginMm: 15}, sections: [
      {id: 'p', title: 'Prologue', kind: 'prose', content: {root: {type: 'root', children: [{type: 'paragraph', children: [{type: 'text', text: 'Words', format: 0}]}]}}},
      {id: 'c', title: 'Page 1', kind: 'comic', content: null, comic: {...c, art: [{src: PNG, width: 1, height: 1}, null, null]}},
    ]};
  };
  it('prints as its own full page, without running heads', () => {
    const html = buildPrintHtml(publishBook());
    expect(html).toContain('@page comic{margin:0;@top-center{content:none}@bottom-center{content:none}}');
    expect(html).toContain('section[data-kind="comic"]{page:comic;break-before:page;break-after:page;width:128mm;height:182mm');
    expect(html.match(/class="comic-panel"/g)).toHaveLength(3);
    expect(html).toContain(`<img src="${PNG}"`);
    expect(html).toContain('Long ago…');
    expect(validatePrint(publishBook()).some(w => w.includes('panel 1 art is low resolution'))).toBe(true);
    const bad = publishBook(); (bad.sections[1].comic!.art as any)[0] = {src: 'https://example.com/x.png', width: 1, height: 1};
    expect(() => buildPrintHtml(bad)).toThrow();
  });
  it('e-book packages panel art in reading order with the words', async () => {
    const zip = await JSZip.loadAsync(await buildEpub(publishBook()));
    const files = Object.keys(zip.files);
    expect(files).toContain('OEBPS/images/comic-2-1.png');
    const page = await zip.file('OEBPS/section-2.xhtml')!.async('string');
    expect(page).toContain('<img src="images/comic-2-1.png"');
    expect(page).toContain('Long ago…');
    expect(await zip.file('OEBPS/package.opf')!.async('string')).toContain('href="images/comic-2-1.png"');
  });
  it('print check points out empty panels', () => {
    const lib = seed(), book = lib.books[0];
    book.chapters[1].scenes[0] = applyTemplate(book.chapters[1].scenes[0], 'comic', book);
    const issue = printCheck(book, 10, 'home').find(i => i.title.includes('empty panels'));
    expect(issue?.detail).toContain('1, 2, 3, 4, 5');
  });
});
