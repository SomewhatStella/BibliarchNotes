import {describe, expect, it} from 'vitest';
import JSZip from 'jszip';
import {parseDocx, parseText, bookFromManuscript} from '../src/manuscript-import';
import {parseLibrary} from '../src/model';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const p = (inner: string, style = '', extra = '') => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ''}${extra}</w:pPr>${inner}</w:p>`;
const r = (t: string, rPr = '') => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;
async function docx(body: string, opts: {styles?: string; core?: string} = {}) {
  const zip = new JSZip();
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr/></w:body></w:document>`);
  if (opts.styles) zip.file('word/styles.xml', `<w:styles ${W}>${opts.styles}</w:styles>`);
  if (opts.core) zip.file('docProps/core.xml', `<cp:coreProperties xmlns:cp="x" xmlns:dc="http://purl.org/dc/elements/1.1/">${opts.core}</cp:coreProperties>`);
  return zip.generateAsync({type: 'uint8array'});
}
const validates = (book: any) => parseLibrary(JSON.stringify({version: 1, books: [book], activeBook: book.id, activeScene: book.chapters[0].scenes[0].id}));

describe('manuscript import', () => {
  it('reads a Word file: title, author, chapters by heading, formatting, tabs, scene breaks', async () => {
    const styles = '<w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:styleId="Title"><w:name w:val="Title"/></w:style>';
    const body = [
      p(r('The Salt Road'), 'Title'),
      p(r('by Mara Venn')),
      p(r('Chapter 1: Low Tide'), 'Heading1'),
      p(r('She ran ') + r('very', '<w:i/>') + r(' fast &amp; ') + r('far', '<w:b/>') + r('.')),
      p('<w:r><w:t>Name</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>Value</w:t></w:r>', '', '<w:ind w:left="720"/>'),
      p(r('* * *')),
      p(r('Centered line'), '', '<w:jc w:val="center"/>'),
      p(r('Chapter 2'), 'Heading1'),
      p(r('Deleted? ') + '<w:del><w:r><w:delText>gone</w:delText></w:r></w:del>' + r('kept')),
    ].join('');
    const m = await parseDocx(await docx(body, {styles, core: '<dc:creator>Someone Else</dc:creator>'}));
    expect(m.title).toBe('The Salt Road');
    expect(m.author).toBe('Mara Venn');
    expect(m.chapters.map(c => [c.label, c.title])).toEqual([['Chapter 1', 'Low Tide'], [undefined, 'Chapter 2']]);
    const [one, two] = m.chapters;
    expect(one.blocks[0].runs).toEqual([{text: 'She ran ', format: 0}, {text: 'very', format: 2}, {text: ' fast & ', format: 0}, {text: 'far', format: 1}, {text: '.', format: 0}]);
    expect(one.blocks[1].runs).toEqual([{text: 'Name', format: 0}, {tab: true}, {text: 'Value', format: 0}]);
    expect(one.blocks[1].indent).toBe(1);
    expect(one.blocks[2].kind).toBe('scene-break');
    expect(one.blocks[3].align).toBe('center');
    expect(two.blocks[0].runs.map((x: any) => x.text).join('')).toBe('Deleted? kept');

    const book = bookFromManuscript(m, 'novel');
    expect(book.title).toBe('The Salt Road');
    expect(book.chapters.map(c => c.title)).toEqual(['Front matter', 'Low Tide', 'Chapter 2']);
    expect(JSON.stringify(book.chapters[0].scenes[0].content)).toContain('Mara Venn');
    expect(JSON.stringify(book.chapters[0].scenes[0].content)).toContain('The Salt Road');
    expect(book.chapters[1].scenes[0].content.root.children.slice(0, 2).map((b: any) => b.tag)).toEqual(['h6', 'h2']);
    expect(() => validates(book)).not.toThrow();
  });

  it('finds "Chapter …" lines when the document has no heading styles', async () => {
    const body = [p(r('Prologue')), p(r('It began at sea.')), p(r('CHAPTER ONE')), p(r('Morning.')), p(r('Chapter Two')), p(r('Evening.'))].join('');
    const m = await parseDocx(await docx(body));
    expect(m.chapters.map(c => c.title)).toEqual(['Prologue', 'CHAPTER ONE', 'Chapter Two']);
    expect(() => validates(bookFromManuscript(m, 'light-novel'))).not.toThrow();
  });

  it('splits on page breaks as a last resort and never loses text', async () => {
    const body = [p(r('First part text.')), p('<w:r><w:br w:type="page"/></w:r>'), p(r('Second part text.')), p('<w:r><w:br w:type="page"/></w:r>'), p(r('Third.'))].join('');
    const m = await parseDocx(await docx(body));
    const all = JSON.stringify(m);
    for (const t of ['First part text.', 'Second part text.', 'Third.']) expect(all).toContain(t);
    expect(m.chapters.length).toBeGreaterThanOrEqual(2);
  });

  it('reads plain text with hard-wrapped paragraphs and Markdown chapters', () => {
    const txt = parseText('My Book\n\nChapter 1\n\nA line that was\nhard wrapped.\n\nNext para.\n\nChapter 2\n\nEnd.', false, 'file name');
    expect(txt.chapters.map(c => c.title)).toEqual(['Chapter 1', 'Chapter 2']);
    expect(txt.chapters[0].blocks[0].runs).toEqual([{text: 'A line that was hard wrapped.', format: 0}]);
    const md = parseText('# One\n\nSome *soft* and **loud** words.\n\n# Two\n\nMore.', true, 'Draft');
    expect(md.title).toBe('Draft');
    expect(md.chapters.map(c => c.title)).toEqual(['One', 'Two']);
    expect(md.chapters[0].blocks[0].runs).toEqual([{text: 'Some ', format: 0}, {text: 'soft', format: 2}, {text: ' and ', format: 0}, {text: 'loud', format: 1}, {text: ' words.', format: 0}]);
    expect(() => validates(bookFromManuscript(md, 'blank'))).not.toThrow();
  });

  it('keeps a long untitled manuscript as one chapter', () => {
    const m = parseText(Array.from({length: 30}, (_, i) => `Paragraph ${i} has several words in it.`).join('\n\n'));
    expect(m.chapters).toHaveLength(1);
    expect(m.words).toBeGreaterThan(150);
  });
});
