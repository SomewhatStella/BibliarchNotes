import {it,expect} from 'vitest';
import {assertOverlay,type ArtworkOverlay} from '../src/artwork';
import {toggleOverlayRange,overlayRuns,overlayTextHtml,replaceOverlayText} from '../src/overlay-runs';
import {seed,parseLibrary} from '../src/model';
import {buildPrintHtml} from '../src/publishing';
const o:ArtworkOverlay={text:'The Apple!!',x:15,y:20,size:32,color:'#222222'};
it('toggles only Apple, combines styles and merges adjacent equivalent runs',()=>{
 const b=toggleOverlayRange(o,4,9,'bold');
 expect(b.text).toBe(o.text);expect(overlayRuns(b)).toEqual([{text:'The ',bold:false,italic:false},{text:'Apple',bold:true,italic:false},{text:'!!',bold:false,italic:false}]);
 const bi=toggleOverlayRange(b,4,9,'italic');expect(overlayRuns(bi)[1]).toEqual({text:'Apple',bold:true,italic:true});
 expect(overlayRuns(toggleOverlayRange(toggleOverlayRange(bi,4,9,'bold'),4,9,'italic'))).toEqual([{text:o.text,bold:false,italic:false}]);
 expect(toggleOverlayRange(o,4,4,'bold')).toEqual(o);
});
it('honors legacy whole-text styles and supports unbold within them',()=>{expect(overlayRuns(toggleOverlayRange({...o,bold:true},4,9,'bold')).map(r=>r.bold)).toEqual([true,false,true]);});
it('preserves style around plain-text edits and escapes output',()=>{const b=toggleOverlayRange(o,4,9,'bold');const edit=replaceOverlayText(b,'The Apples!!');expect(edit.text).toBe('The Apples!!');expect(overlayRuns(edit)[1].text).toBe('Apples');expect(overlayTextHtml({...o,text:'<script>&'})).toContain('&lt;script&gt;&amp;');});
it('validates safe runs, rejects mismatched text and unknown fields; round trips library backups',()=>{
 const b=toggleOverlayRange(o,4,9,'bold');const l=seed();l.books[0].chapters[0].scenes[0].overlay=b;
 expect(parseLibrary(JSON.stringify(l)).books[0].chapters[0].scenes[0].overlay).toEqual(b);
 for(const runs of [null,{},[{text:'wrong'}],[{text:o.text,bold:'yes'}],[{text:o.text,html:'<img>'}],[{text:o.text,italic:1}]])expect(()=>assertOverlay({...o,runs})).toThrow();
 expect(()=>assertOverlay(o)).not.toThrow();
});
it('print/PDF HTML renders the same inline formatting, not raw text markup',()=>{const overlay=toggleOverlayRange(toggleOverlayRange(o,4,9,'bold'),4,9,'italic');const html=buildPrintHtml({title:'Art',format:{widthMm:137,heightMm:219,marginMm:10},sections:[{id:'art',title:'Art',kind:'color-art',content:{root:{children:[]}},overlay}]});expect(html).toContain(overlayTextHtml(overlay));expect(html).toContain('font-weight:700;font-style:italic');});
