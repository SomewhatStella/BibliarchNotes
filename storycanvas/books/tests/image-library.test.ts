import {test,expect} from 'vitest';
import {seed,parseLibrary} from '../src/model';
test('contours and gap survive reload and reject malformed data',()=>{const l=seed(),b=l.books[0],s=b.chapters[0].scenes[0];b.images=[{id:'a',src:'data:image/png;base64,AAAA',name:'pic',naturalWidth:20,naturalHeight:20}];s.images=[{id:'p',assetId:'a',page:0,x:0,y:0,width:30,mode:'wrap',contour:[[20,0],[80,50],[20,100]],wrapGap:9,contourMode:'alpha'}];expect(parseLibrary(JSON.stringify(l))).toEqual(l);s.images[0].wrapGap=-5;expect(()=>parseLibrary(JSON.stringify(l))).toThrow();s.images[0].wrapGap=9;s.images[0].contour=[[200,0]];expect(()=>parseLibrary(JSON.stringify(l))).toThrow();});
test('image assets and reusable placements roundtrip and reject unsafe references',()=>{
 const l=seed(),b=l.books[0],s=b.chapters[0].scenes[0];
 b.images=[{id:'asset',src:'data:image/png;base64,AAAA',name:'picture',naturalWidth:20,naturalHeight:20}];
 s.images=[{id:'placement',assetId:'asset',page:0,x:10,y:20,width:30,mode:'wrap'}];
 expect(parseLibrary(JSON.stringify(l))).toEqual(l);
 s.images[0].assetId='missing';expect(()=>parseLibrary(JSON.stringify(l))).toThrow();s.images[0].assetId='asset';
 s.images[0].width=-1;expect(()=>parseLibrary(JSON.stringify(l))).toThrow();s.images=[];
 expect(parseLibrary(JSON.stringify(l)).books[0].images).toHaveLength(1);
 b.images[0].src='javascript:alert(1)';expect(()=>parseLibrary(JSON.stringify(l))).toThrow();
});
