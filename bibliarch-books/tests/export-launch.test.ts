import {describe,it,expect} from 'vitest';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {buildPrintHtml,buildEpub, type PublishBook} from '../src/publishing';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const book=():PublishBook=>({title:'Export review',format:{widthMm:148,heightMm:210,marginMm:15,bodyFont:'Arial',bodySizePt:13,lineHeight:1.45,paragraphIndent:1,paragraphSpacing:0,paragraphAlign:'justify'},sections:[{id:'p',title:'Prose',kind:'prose',content:{root:{children:[{type:'paragraph',children:[{type:'text',text:'A paragraph.'}]}]}}}]});
describe('launch export regressions',()=>{
 it('applies paragraph spacing without requiring an indent setting in both formats',async()=>{
  const b=book();delete b.format.paragraphIndent;
  expect(buildPrintHtml(b)).toContain('margin:0 0 0px;');
  const zip=await JSZip.loadAsync(await buildEpub(b));expect(await zip.file('OEBPS/style.css')!.async('string')).toContain('margin:0 0 0px;');
 });
 it('keeps full-page illustration height after shared design CSS and preserves light novel typography',async()=>{
  const b=book();b.sections.push({id:'art',title:'Art',kind:'color-art',content:null,image:{src:png,alt:'Picture'}});
  const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:400,height:900}});await page.setContent(buildPrintHtml(b));
   const result=await page.evaluate(()=>{const p=getComputedStyle(document.querySelector('p')!);const image=getComputedStyle(document.querySelector('.art img')!);return {height:parseFloat(image.height),font:p.fontFamily,size:p.fontSize,line:p.lineHeight,indent:p.textIndent,bottom:p.marginBottom,align:p.textAlign};});
   expect(result.height).toBeCloseTo(210*96/25.4,0);expect(result.font).toContain('Arial');expect(parseFloat(result.size)).toBeCloseTo(13*96/72,1);expect(parseFloat(result.line)).toBeCloseTo(13*96/72*1.45,1);expect(result.indent).toBe(result.size);expect(result.bottom).toBe('0px');expect(result.align).toBe('justify');
  }finally{await browser.close();}
 });
 it('rejects oversized decoded WebP canvases before rendering or packaging',async()=>{
  const bytes=Buffer.alloc(30);bytes.write('RIFF');bytes.writeUInt32LE(22,4);bytes.write('WEBP',8);bytes.write('VP8X',12);bytes.writeUInt32LE(10,16);bytes.writeUIntLE(19999,24,3);bytes.writeUIntLE(19999,27,3);
  const b=book();b.sections[0].image={src:'data:image/webp;base64,'+bytes.toString('base64'),alt:'Huge'};
  expect(()=>buildPrintHtml(b)).toThrow(/dimensions/);await expect(buildEpub(b)).rejects.toThrow(/dimensions/);
 });
 it('preserves original raster bytes and embeds offline font resources',async()=>{
  const b=book();b.sections[0].image={src:png,alt:'Picture'};
  const font=Buffer.alloc(12);font.write('wOFF');b.customFonts=[{id:'font-test',family:'Bibliarch-font-test',mime:'font/woff',data:'data:font/woff;base64,'+font.toString('base64'),license:'Test fixture only'}];
  const html=buildPrintHtml(b);expect(html).toContain(b.customFonts[0].data);expect(html).not.toContain('fonts.googleapis.com');
  const zip=await JSZip.loadAsync(await buildEpub(b));expect(await zip.file('OEBPS/images/image-1.png')!.async('nodebuffer')).toEqual(Buffer.from(png.split(',')[1],'base64'));expect(await zip.file('OEBPS/fonts/font-test.woff')!.async('nodebuffer')).toEqual(font);expect(await zip.file('OEBPS/style.css')!.async('string')).toContain('fonts/font-test.woff');
 });
});
