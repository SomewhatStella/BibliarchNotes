import type {ArtworkOverlay,OverlayRun} from './artwork';
import {mergeOverlayRuns,overlayRuns,type OverlayMark} from './overlay-runs';
export const OVERLAY_FORMAT='bibliarch-overlay-format';
export function overlaySelection(root:HTMLElement){
 const s=window.getSelection();if(!s?.rangeCount)return null;const r=s.getRangeAt(0);if(!root.contains(r.startContainer)||!root.contains(r.endContainer))return null;
 const before=r.cloneRange();before.selectNodeContents(root);before.setEnd(r.startContainer,r.startOffset);return {start:before.toString().length,end:before.toString().length+r.toString().length};
}
export function restoreOverlaySelection(root:HTMLElement,start:number,end:number){
 root.focus();const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),r=document.createRange();let n:Node|null,p=0,begun=false;
 while(n=w.nextNode()){const len=n.textContent?.length??0;if(!begun&&start<=p+len){r.setStart(n,start-p);begun=true;}if(end<=p+len){r.setEnd(n,end-p);break;}p+=len;}
 if(!begun){r.selectNodeContents(root);r.collapse(false);}const s=getSelection();s?.removeAllRanges();s?.addRange(r);
}
export function syncOverlayCaret(root:HTMLElement){
 root.querySelectorAll('[data-overlay-caret]').forEach(el=>el.remove());
 if(root.textContent?.endsWith('\n')){const br=document.createElement('br');br.dataset.overlayCaret='true';root.append(br);}
}
export function renderOverlayDom(root:HTMLElement,o:ArtworkOverlay){
 root.replaceChildren(...overlayRuns(o).map(r=>{const span=document.createElement('span');span.style.fontWeight=r.bold?'700':'400';span.style.fontStyle=r.italic?'italic':'normal';span.textContent=r.text;return span;}));syncOverlayCaret(root);
}
export function readOverlayDom(root:HTMLElement):{text:string;runs:OverlayRun[]}{
 const runs:OverlayRun[]=[];let remaining=2000;
 const walk=(node:Node)=>{if(!remaining)return;if(node.nodeType===Node.TEXT_NODE){const style=getComputedStyle(node.parentElement!),text=(node.textContent??'').slice(0,remaining);remaining-=text.length;runs.push({text,bold:Number(style.fontWeight)>=600||style.fontWeight==='bold',italic:style.fontStyle==='italic'});return;}
 if(node instanceof HTMLElement&&node.tagName==='BR'){if(node.dataset.overlayCaret)return;runs.push({text:'\n'});remaining--;return;}node.childNodes.forEach(walk);};walk(root);
 return {text:runs.map(r=>r.text).join(''),runs:mergeOverlayRuns(runs)};
}
export function selectedOverlayRoot(){const s=getSelection(),node=s?.anchorNode;const root=(node?.nodeType===Node.ELEMENT_NODE?node as Element:node?.parentElement)?.closest<HTMLElement>('[data-overlay-editor]');return root&&overlaySelection(root)?root:null;}
export function formatSelectedOverlay(mark:OverlayMark){const root=selectedOverlayRoot(),range=root&&overlaySelection(root);if(!root||!range||range.start===range.end)return false;root.dispatchEvent(new CustomEvent(OVERLAY_FORMAT,{detail:mark}));return true;}
