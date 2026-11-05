"use client";
import {useLayoutEffect,useRef,type PointerEvent as ReactPointerEvent} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {PageMetrics} from './nodes';
// Native editable title stays outside Lexical; template values are only initial layout.
export function TitleControl({metrics}:{metrics:PageMetrics}) {
 const [editor]=useLexicalComposerContext();const ref=useRef<HTMLInputElement>(null),handle=useRef<HTMLButtonElement>(null),cancelDrag=useRef<()=>void>(()=>{});
 const scene=metrics.view;
 useLayoutEffect(()=>{
  const input=ref.current;if(!input)return;
  const position=()=>{
   const root=editor.getRootElement(),h=root?.querySelector<HTMLElement>('[data-title-placeholder]'),host=input.offsetParent as HTMLElement|null;
   if(!h||!host){input.style.visibility='hidden';if(handle.current)handle.current.style.visibility='hidden';return;}
   const r=h.getBoundingClientRect(),p=host.getBoundingClientRect(),s=getComputedStyle(h),scale=p.width/host.offsetWidth||1;
   const top=(r.top-p.top)/scale+parseFloat(s.paddingTop);
   Object.assign(input.style,{visibility:'visible',left:(r.left-p.left)/scale+'px',top:top+'px',width:r.width/scale+'px',height:(r.height/scale-parseFloat(s.paddingTop))+'px',font:s.font,textAlign:s.textAlign,color:s.color});
   if(handle.current)Object.assign(handle.current.style,{visibility:'visible',left:Math.max(0,(r.left-p.left)/scale-32)+'px',top:top+'px'});
  };
  position();const root=editor.getRootElement();const observer=new MutationObserver(position);if(root)observer.observe(root,{subtree:true,childList:true,attributes:true});
  const resize=new ResizeObserver(position);if(root)resize.observe(root);
  window.addEventListener('resize',position);return()=>{observer.disconnect();resize.disconnect();window.removeEventListener('resize',position);cancelDrag.current();};
 },[editor,metrics]);
 useLayoutEffect(()=>{const input=ref.current;if(!input)return;const align=(e:Event)=>scene?.onTitleLayout?.({titleAlign:(e as CustomEvent).detail});input.addEventListener('title-align',align);return()=>input.removeEventListener('title-align',align);},[scene]);
 function drag(e:ReactPointerEvent<HTMLElement>){
  if(e.button!==0||!ref.current)return;e.preventDefault();cancelDrag.current();
  const target=e.currentTarget,input=ref.current,start=e.clientY,spacing=scene?.layout?.chapterSpacing??0,host=input.offsetParent as HTMLElement,scale=host.getBoundingClientRect().width/host.offsetWidth||1;
  target.setPointerCapture(e.pointerId);
  const move=(ev:PointerEvent)=>{input.style.transform=`translateY(${(ev.clientY-start)/scale}px)`;if(handle.current)handle.current.style.transform=input.style.transform;};
  const cleanup=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);target.removeEventListener('pointercancel',cleanup);target.removeEventListener('lostpointercapture',cleanup);window.removeEventListener('blur',cleanup);input.style.transform='';if(handle.current)handle.current.style.transform='';cancelDrag.current=()=>{};};
  const up=(ev:PointerEvent)=>{cleanup();scene?.onTitleLayout?.({chapterSpacing:Math.max(0,Math.min(100,spacing+(ev.clientY-start)/scale/3.78))});};
  cancelDrag.current=cleanup;target.addEventListener('pointermove',move);target.addEventListener('pointerup',up);target.addEventListener('pointercancel',cleanup);target.addEventListener('lostpointercapture',cleanup);window.addEventListener('blur',cleanup);
 }
 if(!scene?.onTitleChange||!scene.template||scene.template==='prose')return null;
 return <><button ref={handle} type="button" className="heading-move-handle" aria-label="Move heading" title="Drag up or down to move heading. Arrow keys also move it." onPointerDown={drag} onKeyDown={e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();scene.onTitleLayout?.({chapterSpacing:Math.max(0,Math.min(100,(scene.layout?.chapterSpacing??0)+(e.key==='ArrowUp'?-1:1)*(e.shiftKey?5:1)))});}} style={{position:'absolute',zIndex:3,visibility:'hidden',width:28,height:28,minWidth:28,padding:0,border:'1px solid #aab6cc',borderRadius:4,background:'#f4f7fc',color:'#284477',cursor:'ns-resize',touchAction:'none'}}>↕</button><input ref={ref} aria-label="Page title" title="Edit page title" onPointerDown={e=>{if(e.altKey)drag(e);}} maxLength={300} value={scene.title||''} onChange={e=>scene.onTitleChange(e.target.value)} style={{position:'absolute',zIndex:2,visibility:'hidden',minWidth:0,padding:0,border:0,background:'transparent',boxSizing:'border-box'}}/><style>{'@media print{.heading-move-handle{display:none!important}}'}</style></>;
}
