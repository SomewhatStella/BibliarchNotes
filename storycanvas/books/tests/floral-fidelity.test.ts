import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import sourced from '../src/sourced-ornaments.json';
import {decalSource} from '../src/design';
it('preserves original floral white knockout fills and decoded geometry after recoloring',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();const item=sourced.find(d=>d.id==='sourced-floral-corner')!;
 const original=readFileSync('assets/sourced-ornaments/originals/Simple-corner-ornament.svg','utf8');
 const recolored=atob(decalSource('builtin:'+item.id,'#715394').split(',')[1]);
 const result=await page.evaluate(async({original,svg,recolored})=>{
 const parser=new DOMParser();const src=parser.parseFromString(original,'image/svg+xml').documentElement;const dst=parser.parseFromString(svg,'image/svg+xml').documentElement;
 src.setAttribute('viewBox',dst.getAttribute('viewBox')!);src.setAttribute('width','700');src.setAttribute('height','700');
 const raster=async(s:string)=>{const doc=parser.parseFromString(s,'image/svg+xml');doc.documentElement.setAttribute('width','700');doc.documentElement.setAttribute('height','700');s=new XMLSerializer().serializeToString(doc);const img=new Image();img.width=img.height=700;img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s)));await img.decode();const c=document.createElement('canvas');c.width=c.height=700;const ctx=c.getContext('2d')!;ctx.fillStyle='white';ctx.fillRect(0,0,700,700);ctx.drawImage(img,0,0,700,700);return ctx.getImageData(0,0,700,700).data;};
 const a=await raster(new XMLSerializer().serializeToString(src));const b=await raster(svg);const c=await raster(recolored);let mismatch=0,recolorMismatch=0,ink=0;
 for(let i=0;i<a.length;i+=4){const aa=(255-a[i])/255>.5,bb=(255-b[i])/170>.5,cc=(255-c[i])/142>.5;if(aa)ink++;if(aa!==bb)mismatch++;if(bb!==cc)recolorMismatch++;}
 document.body.innerHTML='<h2>Original / sanitized / recolored — matched viewBox</h2>'+[new XMLSerializer().serializeToString(src),svg,recolored].map(s=>'<img width="400" height="400" src="data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s)))+'">').join('');await Promise.all([...document.images].map(i=>i.decode()));return {mismatch,recolorMismatch,ink};
 },{original,svg:item.svg,recolored});
 await page.screenshot({path:'artifacts/floral-fidelity.png',fullPage:true});console.log(result);expect(result.mismatch/result.ink).toBeLessThan(.04);expect(result.recolorMismatch/result.ink).toBeLessThan(.04);
 }finally{await browser.close();}
},30000);
