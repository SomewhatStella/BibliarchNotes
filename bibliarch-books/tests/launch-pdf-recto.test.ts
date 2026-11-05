import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import type {PublishBook} from '../src/publishing';

const mocks = vi.hoisted(() => ({launch: vi.fn()}));
vi.mock('playwright', () => ({chromium: {launch: mocks.launch}}));
beforeEach(() => { vi.resetModules(); vi.resetAllMocks(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const book = (format: Partial<PublishBook['format']> = {}, toc = false): PublishBook => ({
  title: 'Launch book', format: {widthMm: 148, heightMm: 210, marginMm: 15, ...format},
  sections: [ ...(toc ? [{id:'toc', title:'Contents', kind:'toc', content:{root:{children:[]}}}] : []),
    {id:'chapter', title:'Chapter One', kind:'chapter-title', content:{root:{children:[]}}}],
});
const request = (value: PublishBook) => new Request('https://books.example/api/pdf', {method:'POST', body:JSON.stringify(value)});
async function browser(close = vi.fn(async () => {})) {
  const pdf = await PDFDocument.create(); pdf.addPage([420, 595]);
  const bytes = await pdf.save();
  const page = {setDefaultTimeout:vi.fn(), setContent:vi.fn(), emulateMedia:vi.fn(), evaluate:vi.fn(), pdf:vi.fn(async () => bytes)};
  mocks.launch.mockResolvedValue({newContext:async () => ({route:vi.fn(), newPage:async () => page}), close});
  return page;
}
it.each([
  ['table of contents', {recto:true}, true],
  ['table of contents and mirrored margins', {recto:true, mirror:true}, true],
] as const)('rejects recto with %s before launching a browser', async (_name, format, toc) => {
  await browser();
  const {POST} = await import('../app/api/pdf/route');
  const response = await POST(request(book(format, toc)));
  expect(response.status).toBe(400);
  expect((await response.json()).error).toMatch(/disable.*recto/i);
  expect(mocks.launch).not.toHaveBeenCalled();
});
it('keeps TOC and mirrored margins together in the full-document non-recto render', async () => {
  const page = await browser();
  const {POST} = await import('../app/api/pdf/route');
  expect((await POST(request(book({mirror:true}, true)))).status).toBe(200);
  expect(page.setContent).toHaveBeenCalledTimes(1);
  const html = page.setContent.mock.calls[0][0];
  expect(html).toContain('href="#section-2"');
  expect(html).toContain('id="section-2"');
  expect(html).toContain('@page :left');
});
it('swaps mirrored margins for a section starting on an even physical page', async () => {
  const page = await browser();
  const value = book({recto:true, mirror:true, insideMm:22, outsideMm:12});
  value.sections.push({id:'prose', title:'Body', kind:'prose', content:{root:{children:[]}}});
  const {POST} = await import('../app/api/pdf/route');
  expect((await POST(request(value))).status).toBe(200);
  expect(page.setContent.mock.calls[0][0]).toContain('@page :right{margin-left:22mm;margin-right:12mm;}');
  expect(page.setContent.mock.calls[1][0]).toContain('@page :right{margin-left:12mm;margin-right:22mm;}');
});
it('still exports simple recto books', async () => {
  await browser();
  const {POST} = await import('../app/api/pdf/route');
  const response = await POST(request(book({recto:true})));
  expect(response.status).toBe(200);
  expect((await PDFDocument.load(await response.arrayBuffer())).getPageCount()).toBe(1);
});
it('bounds hung cleanup and releases the render lock for the next request', async () => {
  const close = vi.fn(() => new Promise<void>(() => {}));
  await browser(close);
  const {POST} = await import('../app/api/pdf/route');
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  let response: Response | undefined;
  const first = POST(request(book())).then(result => { response = result; });
  await vi.advanceTimersByTimeAsync(0);
  expect(close).toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2500);
  expect(response?.status).toBe(200);
  await first;
  close.mockResolvedValueOnce(undefined);
  expect((await POST(request(book()))).status).toBe(200);
  expect(mocks.launch).toHaveBeenCalledTimes(2);
});
