import { describe,it,expect } from 'vitest';
import JSZip from 'jszip';
import { XMLValidator } from 'fast-xml-parser';
import { PDFDocument } from 'pdf-lib';
import {buildPrintHtml,buildEpub,validatePrint,type PublishBook} from '../src/publishing';
import {POST} from '../app/api/pdf/route';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const content={root:{children:[{type:'paragraph',children:[{type:'text',text:'A <script> & story',format:3}]}]}};
const book:PublishBook={title:'Book < & "',author:'Writer & Co',format:{widthMm:148,heightMm:210,marginMm:15,mirror:true,header:'Header " <',footer:'Footer {page}'},sections:[{id:'one',title:'Chapter <One>',kind:'prose',content},{id:'art',title:'Picture',kind:'bnw-art',content:{root:{children:[]}},image:{src:png,alt:'Art " &',caption:'Caption <'}}]};
describe('publishing',()=>{
 it('accepts editor percentage focal points but rejects injected positions',async()=>{const b=structuredClone(book);b.sections[1].image!.position='50% 50%';expect(buildPrintHtml(b)).toContain('object-position:50% 50%');await expect(buildEpub(b)).resolves.toBeInstanceOf(Uint8Array);b.sections[1].image!.position='101% 50%';expect(()=>buildPrintHtml(b)).toThrow();b.sections[1].image!.position='50%;color:red';expect(()=>buildPrintHtml(b)).toThrow();});
 it('exports valid EPUB3 XML, stored first mimetype, separate sections and embedded image',async()=>{
 const bytes=await buildEpub(book);const b=Buffer.from(bytes);expect(b.readUInt16LE(8)).toBe(0);expect(b.subarray(30,38).toString()).toBe('mimetype');
 const zip=await JSZip.loadAsync(bytes);expect(await zip.file('mimetype')!.async('string')).toBe('application/epub+zip');
 for(const name of Object.keys(zip.files).filter(n=>/\.(xml|opf|xhtml)$/.test(n))) expect(XMLValidator.validate(await zip.file(name)!.async('string')),name).toBe(true);
 const opf=await zip.file('OEBPS/package.opf')!.async('string');expect(opf).toContain('version="3.0"');expect(opf).toContain('properties="nav"');expect(opf).toContain('image/png');
 const chapter=await zip.file('OEBPS/section-1.xhtml')!.async('string');expect(chapter).toContain('&lt;script&gt;');expect(chapter).toContain('<strong><em>');expect(chapter).not.toContain('decoration');
 expect(zip.file('OEBPS/images/image-2.png')).not.toBeNull();
 });
 it('prints safe flowing sections, page counters and mirrored custom dimensions',()=>{const html=buildPrintHtml(book);expect(html).toContain('size:148mm 210mm');expect(html).toContain('@page :left');expect(html).toContain('counter(page)');expect(html).toContain('break-before:page');expect(html).toContain('grayscale(1)');expect(html).toContain('@page artwork');expect(html).toContain('page:artwork');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('overflow:hidden');});
 it('warns about tiny artwork and rejects hostile inputs',async()=>{
 expect(validatePrint(book).join(' ')).toMatch(/resolution/i);
 for(const src of ['https://evil.test/a.png','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)']){const bad=structuredClone(book);bad.sections[1].image!.src=src;expect(()=>buildPrintHtml(bad)).toThrow();await expect(buildEpub(bad)).rejects.toThrow();}
 const bad=structuredClone(book);bad.format.bodyFont='serif; background:url(https://evil)';expect(()=>buildPrintHtml(bad)).toThrow();bad.format.bodyFont='serif';bad.format.widthMm=-1;expect(()=>buildPrintHtml(bad)).toThrow();
 });
 it('rejects invalid and oversized PDF requests',async()=>{expect((await POST(new Request('http://localhost/api/pdf',{method:'POST',body:'{}'}))).status).toBe(400);expect((await POST(new Request('http://localhost/api/pdf',{method:'POST',headers:{'content-length':'99999999'},body:'{}'}))).status).toBe(413);});
 it('renders a real multi-page custom landscape PDF with overflowing prose',async()=>{
 const long=structuredClone(book);long.format.widthMm=210;long.format.heightMm=148;long.sections[0].content={root:{children:Array.from({length:90},()=>content.root.children[0])}};
 const response=await POST(new Request('http://localhost/api/pdf',{method:'POST',body:JSON.stringify(long)}));expect(response.status,await (response.status!==200?response.text():Promise.resolve(''))).toBe(200);
 const bytes=new Uint8Array(await response.arrayBuffer());expect(Buffer.from(bytes).subarray(0,5).toString()).toBe('%PDF-');const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBeGreaterThan(2);expect(pdf.getPage(0).getWidth()).toBeGreaterThan(pdf.getPage(0).getHeight());
 },60000);
});
