'use client';
import {useLayoutEffect,useRef} from 'react';
import type {ArtworkOverlay} from './artwork';
import {overlayRuns,toggleOverlayRange,type OverlayMark} from './overlay-runs';
import {syncOverlayCaret,OVERLAY_FORMAT,overlaySelection,restoreOverlaySelection,renderOverlayDom,readOverlayDom} from './overlay-editing';
export function OverlayText({overlay}:{overlay:ArtworkOverlay}){return <>{overlayRuns(overlay).map((r,i)=><span key={i} style={{fontWeight:r.bold?700:400,fontStyle:r.italic?'italic':'normal'}}>{r.text}</span>)}</>;}
export default function OverlayTextEditor({overlay:o,selected,onSelect,onChange}:{overlay:ArtworkOverlay;selected:boolean;onSelect:()=>void;onChange:(o:ArtworkOverlay)=>void}){
 const root=useRef<HTMLDivElement>(null),last=useRef('');
 const signature=JSON.stringify(overlayRuns(o));
 useLayoutEffect(()=>{const el=root.current!;if(last.current!==signature){const selection=overlaySelection(el);renderOverlayDom(el,o);last.current=signature;if(selection)restoreOverlaySelection(el,Math.min(selection.start,o.text.length),Math.min(selection.end,o.text.length));}});
 const save=()=>{const el=root.current!,content=readOverlayDom(el);last.current=JSON.stringify(content.runs);onChange({...o,...content});};
 const format=(mark:OverlayMark)=>{const el=root.current!,range=overlaySelection(el);if(!range)return;if(range.start===range.end){document.execCommand(mark);return;}const next=toggleOverlayRange({...o,...readOverlayDom(el)},range.start,range.end,mark);renderOverlayDom(el,next);last.current=JSON.stringify(overlayRuns(next));restoreOverlaySelection(el,range.start,range.end);onChange(next);};
 useLayoutEffect(()=>{const el=root.current!,handler=(event:Event)=>format((event as CustomEvent<OverlayMark>).detail);el.addEventListener(OVERLAY_FORMAT,handler);return()=>el.removeEventListener(OVERLAY_FORMAT,handler);});
 const insert=(text:string)=>{const el=root.current!,s=overlaySelection(el);if(!s)return;const available=2000-(el.textContent?.length??0)+(s.end-s.start);text=text.slice(0,Math.max(0,available));if(!text.includes('\n')){document.execCommand('insertText',false,text);return;}
  // Native insertText creates block DIVs for newlines. Keep literal text nodes so
  // selection offsets, search, print and saved text use the same newline model.
  const range=getSelection()!.getRangeAt(0),node=range.startContainer;const style=getComputedStyle(node.nodeType===Node.ELEMENT_NODE?node as Element:node.parentElement!);const span=document.createElement('span');span.style.fontWeight=style.fontWeight;span.style.fontStyle=style.fontStyle;span.textContent=text;range.deleteContents();range.insertNode(span);syncOverlayCaret(el);restoreOverlaySelection(el,s.start+text.length,s.start+text.length);save();
 };
 return <div ref={root} data-overlay-editor role="textbox" aria-label="Illustration text" aria-multiline="true" style={{pointerEvents:'auto',outline:selected?'1px dashed #777':'none'}} contentEditable suppressContentEditableWarning
 onPointerDown={e=>{e.stopPropagation();onSelect();}} onClick={e=>e.stopPropagation()}
 onInput={save} onPaste={e=>{e.preventDefault();insert(e.clipboardData.getData('text/plain'));}} onDrop={e=>e.preventDefault()}
 onBeforeInput={e=>{const event=e.nativeEvent as InputEvent;if(event.isComposing)return;const s=overlaySelection(e.currentTarget);if(event.data&&s&&(e.currentTarget.textContent?.length??0)-(s.end-s.start)+event.data.length>2000)e.preventDefault();}}
 onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&['b','i'].includes(e.key.toLowerCase())){e.preventDefault();e.stopPropagation();format(e.key.toLowerCase()==='b'?'bold':'italic');}else if(e.key==='Enter'){e.preventDefault();insert('\n');}}}/>;
}
