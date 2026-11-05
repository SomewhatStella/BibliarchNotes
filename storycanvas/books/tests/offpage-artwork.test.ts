import {describe,it,expect} from 'vitest';
import {assertDesign} from '../src/design';
import {assertOverlay,overlayAppearance} from '../src/artwork';
const decal={id:'stars',src:'builtin:stars',alt:'Stars',x:-25,y:110,width:80,rotation:0,opacity:1};
const text={text:'Off the page',x:-15,y:110,size:32,color:'#222222'};
describe('off-page artwork storage and layout',()=>{
 it('accepts off-page decals after JSON roundtrip',()=>expect(()=>assertDesign({decals:JSON.parse(JSON.stringify([decal]))})).not.toThrow());
 it('accepts off-page text after JSON roundtrip',()=>expect(()=>assertOverlay(JSON.parse(JSON.stringify(text)))).not.toThrow());
 it('keeps text width independent of horizontal movement',()=>expect(overlayAppearance({...text,x:15,y:20}).maxWidth).toBe(overlayAppearance({...text,x:65,y:20}).maxWidth));
 it('still rejects non-finite or unreasonable coordinates',()=>{for(const x of [NaN,Infinity,-10001,10001]){expect(()=>assertDesign({decals:[{...decal,x}]})).toThrow();expect(()=>assertOverlay({...text,x})).toThrow();}});
});
