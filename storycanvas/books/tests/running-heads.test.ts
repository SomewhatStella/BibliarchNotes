import {expect, test} from 'vitest';
import {buildPrintHtml, type PublishBook} from '../src/publishing';
const para = (t: string) => ({root: {type: 'root', children: [{type: 'paragraph', children: [{type: 'text', text: t}]}]}});
test('right-hand pages carry the chapter title when the running head is the book title', () => {
  const book: PublishBook = {title: 'Salt Road', format: {widthMm: 152, heightMm: 229, marginMm: 18, header: '{title}'}, sections: [
    {id: 'a', title: 'Title', kind: 'book-front', content: para('Salt Road') as any},
    {id: 'b', title: 'The Bridge', kind: 'chapter-title', chapter: 'The Bridge', content: para('One.') as any},
    {id: 'c', title: 'The Storm', kind: 'chapter-title', chapter: 'The Storm', content: para('Two.') as any},
  ]};
  const html = buildPrintHtml(book);
  expect(html).toContain('@page ch0:right{@top-center{content:"The Bridge"}}');
  expect(html).toContain('@page ch1:right{@top-center{content:"The Storm"}}');
  expect(html).toMatch(/id="section-2"[^>]*style="page:ch0;/);
  const custom = buildPrintHtml({...book, format: {...book.format, header: 'My name'}});
  expect(custom).not.toContain('@page ch0');
});
