import {assertOverlay,type ArtworkOverlay,type OverlayRun} from './artwork';
export type OverlayMark='bold'|'italic';
export function mergeOverlayRuns(runs:OverlayRun[]):OverlayRun[]{
 const out:OverlayRun[]=[];
 for(const r of runs){if(!r.text)continue;const next={text:r.text,bold:!!r.bold,italic:!!r.italic},last=out[out.length-1];if(last&&last.bold===next.bold&&last.italic===next.italic)last.text+=next.text;else out.push(next);}
 return out;
}
export function overlayRuns(o:ArtworkOverlay):OverlayRun[]{return mergeOverlayRuns(o.runs??[{text:o.text,bold:!!o.bold,italic:!!o.italic}]);}
function sliceRuns(o:ArtworkOverlay,start:number,end:number){let p=0;return overlayRuns(o).flatMap(r=>{const from=Math.max(0,start-p),to=Math.min(r.text.length,end-p);p+=r.text.length;return to>from?[{...r,text:r.text.slice(from,to)}]:[];});}
export function toggleOverlayRange(o:ArtworkOverlay,start:number,end:number,mark:OverlayMark):ArtworkOverlay{
 start=Math.max(0,Math.min(o.text.length,start));end=Math.max(start,Math.min(o.text.length,end));if(start===end)return o;
 const middle=sliceRuns(o,start,end),value=!middle.every(r=>r[mark]);
 return {...o,runs:mergeOverlayRuns([...sliceRuns(o,0,start),...middle.map(r=>({...r,[mark]:value})),...sliceRuns(o,end,o.text.length)])};
}
// Plain-text editing surfaces preserve unchanged prefix/suffix formatting.
export function replaceOverlayText(o:ArtworkOverlay,text:string):ArtworkOverlay{
 text=text.slice(0,2000);if(text===o.text)return o;if(!o.runs)return {...o,text};
 let a=0,b=0;while(a<text.length&&a<o.text.length&&text[a]===o.text[a])a++;while(b<text.length-a&&b<o.text.length-a&&text[text.length-1-b]===o.text[o.text.length-1-b])b++;
 const style=sliceRuns(o,Math.max(0,a-1),Math.max(1,a))[0]??{bold:o.bold,italic:o.italic};
 return {...o,text,runs:mergeOverlayRuns([...sliceRuns(o,0,a),{...style,text:text.slice(a,text.length-b)},...sliceRuns(o,o.text.length-b,o.text.length)])};
}
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function overlayTextHtml(o:ArtworkOverlay){assertOverlay(o);return overlayRuns(o).map(r=>`<span style="font-weight:${r.bold?700:400};font-style:${r.italic?'italic':'normal'}">${esc(r.text)}</span>`).join('');}
