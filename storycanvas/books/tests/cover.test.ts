import {describe, expect, it} from 'vitest';
import {assertCover, assertCoverRender, coverGeometry, coverHtml, coverRender, defaultCover, guessTitlePage, titleSizeMm} from '../src/cover';
import {createPresetBook} from '../src/templates';
import {parseLibrary} from '../src/model';

const sixByNine = () => { const b = createPresetBook('novel'); b.appearance = {...b.appearance, preset: 'Custom', widthMm: 152.4, heightMm: 228.6, printer: 'kdp'}; return b; };

describe('cover', () => {
  it('sizes the wraparound sheet from trim, bleed and spine', () => {
    const book = sixByNine();
    const g = coverGeometry(book, 300, {...defaultCover(book), paper: 'cream'});
    expect(g.spineIn).toBeCloseTo(0.75, 3);
    expect(g.width / 25.4).toBeCloseTo(0.125 * 2 + 12 + 0.75, 2);
    expect(g.height / 25.4).toBeCloseTo(9.25, 2);
    expect(g.spineText).toBe(true);
  });
  it('keeps the spine plain when the printer does not allow words on it', () => {
    const book = sixByNine();
    const g = coverGeometry(book, 60, defaultCover(book));
    expect(g.spineText).toBe(false);
    expect(g.spineNote).toMatch(/80 pages/);
    const html = coverHtml(coverRender(book, 60, {...defaultCover(book), author: 'Ann Writer'}));
    expect(html).not.toContain('class="spine-text"');
    expect(coverHtml(coverRender(book, 200, {...defaultCover(book), author: 'Ann Writer'}))).toContain('class="spine-text"');
  });
  it('sets the PDF page to the full cover size and escapes every word', () => {
    const book = sixByNine();
    book.title = '<script>alert(1)</script>';
    const html = coverHtml(coverRender(book, 200, {...defaultCover(book), author: 'A & B', blurb: 'One.\n\nTwo "quoted".'}));
    expect(html).toMatch(/@page\{size:323\.85mm 234\.95mm;margin:0\}/);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
    expect(html).toContain('<p>Two &quot;quoted&quot;.</p>');
  });
  it('rejects colours and fonts that could break out of the stylesheet', () => {
    const book = sixByNine();
    const ok = defaultCover(book);
    expect(() => assertCover(ok)).not.toThrow();
    expect(() => assertCover({...ok, bg: 'red;}body{display:none'})).toThrow();
    expect(() => assertCover({...ok, font: 'x"}*{color:red'})).toThrow();
    expect(() => assertCover({...ok, style: 'neon'})).toThrow();
    expect(() => assertCoverRender({...coverRender(book, 100, ok), imageSrc: 'https://example.com/a.png'})).toThrow();
    expect(() => assertCoverRender(coverRender(book, 100, ok))).not.toThrow();
  });
  it('starts from the title page, skipping template placeholders', () => {
    const book = createPresetBook('novel');
    expect(guessTitlePage(book).author).toBeUndefined();
    const front = book.chapters.flatMap(c => c.scenes).find(s => s.template === 'book-front')!;
    (front.content.root.children as any[]).push({type: 'paragraph', version: 1, direction: null, format: 'center', indent: 0, children: [{type: 'text', version: 1, text: 'by Mara Quill', format: 0, style: '', mode: 'normal', detail: 0}]});
    expect(guessTitlePage(book).author).toBe('Mara Quill');
  });
  it('fits the longest word of a title inside the cover', () => {
    expect(titleSizeMm('Incomprehensibilities', 152.4, 'bold')).toBeLessThan(titleSizeMm('The Sea', 152.4, 'bold'));
    expect(titleSizeMm('Incomprehensibilities', 152.4, 'bold') * 21 * 0.68).toBeLessThanOrEqual(152.4);
  });
  it('is saved with the book', () => {
    const book = sixByNine();
    book.cover = {...defaultCover(book), blurb: 'Hello'};
    const lib = {version: 1, books: [book], activeBook: book.id, activeScene: book.chapters[0].scenes[0].id};
    expect(parseLibrary(JSON.stringify(lib)).books[0].cover?.blurb).toBe('Hello');
    expect(() => parseLibrary(JSON.stringify({...lib, books: [{...book, cover: {...book.cover, accent: 'nope'}}]}))).toThrow();
  });
});
