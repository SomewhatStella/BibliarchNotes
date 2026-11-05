import React from 'react';
import {test,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import * as design from '../src/design';
import chunky from '../src/modern-ornaments.json';
import DesignTools from '../src/DesignTools';
import DecalTray from '../src/DecalTray';
import Chooser from '../src/DecalReplacementChooser';
import {XMLValidator} from 'fast-xml-parser';
const decal={id:'kept',src:'builtin:stars',alt:'Stars',x:10,y:20,width:30,rotation:17,opacity:.6};
test('every picker defaults to Fine-line and restores delicate originals',()=>{
 for(const html of [renderToStaticMarkup(<DesignTools scene={{}} book={{}} onSceneChange={()=>{}} onBookChange={()=>{}}/>),renderToStaticMarkup(<DecalTray scenes={[]} onChange={()=>{}}/>),renderToStaticMarkup(<Chooser scenes={[]} decal={decal} onReplace={()=>{}} onClose={()=>{}}/>)]){
 expect(html).toMatch(/<option selected="">Fine-line<\/option>|aria-pressed="true">Fine-line<\/button>/);expect(html).not.toMatch(/<(option|button)[^>]*>(Modern|Original|Legacy|Simple)<\/(option|button)>/);expect(html).toContain('Willow whisper');expect(html).toContain('Starlit thread');
 }
});
test('93 fine-line choices include the preserved collection and 62 distinct new designs, not chunky icons',()=>{
 expect(design.MODERN_ORNAMENTS.filter(d=>!d.id.startsWith('sourced-'))).toHaveLength(86);
 expect(design.MODERN_ORNAMENTS.filter(d=>d.id.startsWith('sourced-'))).toHaveLength(7);
 expect(design.MODERN_ORNAMENTS).toHaveLength(93);
 expect(new Set(design.MODERN_ORNAMENTS.map(d=>d.id)).size).toBe(93);
 expect(new Set(design.MODERN_ORNAMENTS.map(d=>d.svg)).size).toBe(93);
 for(const d of design.ORIGINAL_ORNAMENTS)expect(design.MODERN_ORNAMENTS.find(a=>a.id===d.id)?.svg).toBe(d.svg);
 for(const d of chunky)expect(design.MODERN_ORNAMENTS.some(a=>a.id===d.id)).toBe(false);
 for(const d of design.MODERN_ORNAMENTS){expect(d.license).toBe('CC0-1.0');const svg=atob(design.decalSource('builtin:'+d.id,'#715394').split(',')[1]);expect(XMLValidator.validate(svg)).toBe(true);if(!d.id.startsWith('sourced-'))expect(svg).toContain('stroke-width="0.8"');expect(svg).toContain('#715394');expect(svg).not.toMatch(/<(script|image|foreignObject|use)\b|\bon\w+=|href=/i);}
});
test('old and new placed assets survive serialized replacement without losing transforms',()=>{
 for(const d of [...chunky,...design.MODERN_ORNAMENTS,...design.DECAL_LIBRARY]){const saved=JSON.parse(JSON.stringify({...decal,src:'builtin:'+d.id}));expect(()=>design.assertDesign({decals:[saved]})).not.toThrow();expect(design.decalSource(saved.src)).toMatch(/^data:image\/svg/);expect(saved.rotation).toBe(17);expect(saved.width).toBe(30);}
});
