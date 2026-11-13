'use client';
import {isTap,visiblePage} from './touch-place';
import {useEffect,useRef,useState} from 'react';
import {snap,snapEdgeX,clearGuides} from './snap';
import {createPortal} from 'react-dom';
import {MODERN_ORNAMENTS,decalSource,type Decal} from './design';
import {artworkOverflowCss} from './artwork-overflow';
import type {Scene} from './model';
import DecalReplacementChooser from './DecalReplacementChooser';
import {placeDecal,pageIndexOf,moveDecalToPage,MAX_DECALS} from './decal-placement';
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
// Update both representations during a gesture, without saving on every pointer event.
function preview(id:string,patch:Partial<Decal>){
 document.querySelectorAll<HTMLElement>(`[data-decal-id="${id}"],[data-decal-proxy="${id}"]`).forEach(el=>{
  for(const k of ['x','y','width'] as const)if(patch[k]!==undefined)el.style.setProperty(k==='x'?'left':k==='y'?'top':k,patch[k]+'%');
 });
}
export default function DecalTray({scenes,onChange,visible=true}:{scenes:Scene[];onChange:(id:string,fn:(s:Scene)=>Scene)=>void;visible?:boolean}){
 const latest=useRef({scenes,onChange});latest.current={scenes,onChange};
 const [category,setCategory]=useState('Fine-line'),[message,setMessage]=useState(typeof window!=='undefined'&&window.matchMedia('(pointer:coarse)').matches?'Tap an ornament to add it to the page you’re on. Tap it on the page to move, resize, recolor or remove it.':'Drag an ornament onto a page. Click it on the page to move, resize, recolor or remove it.'),[selected,setSelected]=useState<{scene:string;id:string}|null>(null),[box,setBox]=useState<DOMRect|null>(null),[ghost,setGhost]=useState<{src:string;x:number;y:number}|null>(null);
 const [replacing,setReplacing]=useState(false);
 const replacingRef=useRef(replacing);replacingRef.current=replacing;
 const replaceButton=useRef<HTMLButtonElement>(null);
 const closeReplacement=()=>{setReplacing(false);replaceButton.current?.focus();};
 useEffect(()=>{setReplacing(false);},[selected?.id,selected?.scene]);
 const selection=useRef(selected);selection.current=selected;
 const gesture=useRef<{src?:string;alt?:string;scene?:string;id?:string;startX:number;startY:number;rect?:DOMRect;original?:Decal;patch?:Partial<Decal>;resize?:boolean;el?:HTMLElement;page?:HTMLElement;start?:DOMRect}|null>(null);
 useEffect(()=>{
  const down=(e:globalThis.PointerEvent)=>{
   if(e.button!==0)return;
   const hit=(e.target as HTMLElement).closest<HTMLElement>('[data-decal-id],[data-decal-proxy]');
   if(!hit){if(!(e.target as HTMLElement).closest('.decal-selection'))setSelected(null);return;}
   const id=hit.dataset.decalId||hit.dataset.decalProxy!,target=document.querySelector<HTMLElement>(`[data-decal-id="${id}"]`);
   const paper=target?.closest<HTMLElement>('.paper'),page=target?.closest<HTMLElement>('.pagination-page'),scene=paper?.id.replace('page-','');
   const d=latest.current.scenes.find(s=>s.id===scene)?.decals?.find(d=>d.id===id);if(!d||!page||!target)return;
   e.preventDefault();e.stopPropagation();if(selection.current?.id!==id)return;hit.setPointerCapture(e.pointerId);setSelected({scene:scene!,id:d.id});setBox(target.getBoundingClientRect());gesture.current={scene,id:d.id,startX:e.clientX,startY:e.clientY,rect:page.getBoundingClientRect(),original:d,el:target,page,start:target.getBoundingClientRect()};
  };
  const move=(e:globalThis.PointerEvent)=>{const g=gesture.current;if(!g)return;e.preventDefault();if(g.src){setGhost({src:g.src,x:e.clientX,y:e.clientY});return;}if(!g.rect||!g.original)return;
   let px=e.clientX-g.startX,py=e.clientY-g.startY;
   if(!g.resize&&g.start&&g.page){const s=snap({left:g.start.left+px,top:g.start.top+py,width:g.start.width,height:g.start.height},g.page,g.el||null,e.altKey);px+=s.dx;py+=s.dy;}
   else if(g.resize&&g.start&&g.page)px+=snapEdgeX(g.start.right+px,g.start.top,g.start.bottom,g.page,g.el||null,e.altKey);
   const dx=px/g.rect.width*100,dy=py/g.rect.height*100;
   g.patch=g.resize?{width:clamp(g.original.width+dx,1,100)}:{x:clamp(g.original.x+dx,-200,200),y:clamp(g.original.y+dy,-200,200)};
   preview(g.id!,g.patch);if(g.el)setBox(g.el.getBoundingClientRect());
  };
  const up=(e:globalThis.PointerEvent)=>{const g=gesture.current;gesture.current=null;clearGuides();setGhost(null);if(!g)return;if(g.src){const tap=isTap(e,g.startX,g.startY);
   // Any page of a section is a valid target: a long chapter flows over several pages and its later scene breaks are on page 2, 3...
   const page=tap?visiblePage():document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('.pagination-page');const paper=page?.closest<HTMLElement>('.paper');if(!page||!paper){setMessage('Drop the ornament onto a page.');return;}
   const id=paper.id.replace('page-',''),r=page.getBoundingClientRect(),scene=latest.current.scenes.find(s=>s.id===id);if(!scene)return;
   const placed=placeDecal(scene,{pageIndex:pageIndexOf(paper.querySelectorAll('.pagination-page'),page),x:tap?40:(e.clientX-r.left)/r.width*100,y:tap?35:(e.clientY-r.top)/r.height*100,src:g.src!,alt:g.alt!,id:crypto.randomUUID()});
   if(placed.error){setMessage(placed.error);return;}
   setMessage(tap?'Ornament added. Tap it, then drag it where you like.':'Ornament added. Click it, then drag to move it.');if(tap)page.scrollIntoView({block:'center'});
   const added=placed.scene.decals![placed.scene.decals!.length-1];latest.current.onChange(id,s=>(s.decals||[]).length>=MAX_DECALS?s:{...s,decals:[...(s.decals||[]),added]});}
  else if(g.scene&&g.patch){
   // Released over another page of the same section: the ornament moves to that page.
   const over=g.patch.x!==undefined&&g.el&&g.start?document.elementsFromPoint(e.clientX,e.clientY).find(el=>!el.closest('[data-decal-id],[data-decal-proxy]'))?.closest<HTMLElement>('.pagination-page'):null,paper=g.page?.closest<HTMLElement>('.paper');
   if(over&&over!==g.page&&paper&&over.closest('.paper')===paper){const box=g.el!.getBoundingClientRect(),index=pageIndexOf(paper.querySelectorAll('.pagination-page'),over),rect=over.getBoundingClientRect();latest.current.onChange(g.scene,s=>({...s,decals:s.decals?.map(d=>d.id===g.id?moveDecalToPage(d,index,box.top,box.left,rect):d)}));setSelected(null);}
   else latest.current.onChange(g.scene,s=>({...s,decals:s.decals?.map(d=>d.id===g.id?{...d,...g.patch}:d)}));}
 };
  const cancel=()=>{clearGuides();const g=gesture.current;if(g?.id&&g.original)preview(g.id,g.original);gesture.current=null;setGhost(null);if(g?.el)setBox(g.el.getBoundingClientRect());};
  const key=(e:KeyboardEvent)=>{const cur=selection.current;if((e.key==='Delete'||e.key==='Backspace')&&cur&&!replacingRef.current&&!(e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable=true]')){e.preventDefault();setSelected(null);latest.current.onChange(cur.scene,s=>({...s,decals:s.decals?.filter(d=>d.id!==cur.id)}));return;}if(e.key==='Escape'){cancel();if(replacingRef.current){setReplacing(false);replaceButton.current?.focus();}else setSelected(null);}};
  const click=(e:MouseEvent)=>{const hit=(e.target as HTMLElement).closest<HTMLElement>('[data-decal-id],[data-decal-proxy]');if(!hit)return;e.stopPropagation();const id=hit.dataset.decalId||hit.dataset.decalProxy!;const target=document.querySelector<HTMLElement>(`[data-decal-id="${id}"]`),scene=target?.closest('.paper')?.id.replace('page-','');if(target&&scene){setSelected({scene,id});setBox(target.getBoundingClientRect());}};
  document.addEventListener('click',click,true);document.addEventListener('dblclick',click,true);
  document.addEventListener('pointerdown',down,true);document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cancel);document.addEventListener('keydown',key);window.addEventListener('blur',cancel);
  return()=>{document.removeEventListener('click',click,true);document.removeEventListener('dblclick',click,true);document.removeEventListener('pointerdown',down,true);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cancel);document.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);};
 },[]);
 useEffect(()=>{if(!selected)return;const refresh=()=>{const el=document.querySelector<HTMLElement>(`[data-decal-id="${selected.id}"]`);setBox(el?.getBoundingClientRect()||null);};refresh();window.addEventListener('scroll',refresh,true);window.addEventListener('resize',refresh);const timer=setInterval(refresh,250);return()=>{clearInterval(timer);window.removeEventListener('scroll',refresh,true);window.removeEventListener('resize',refresh);};},[selected,scenes]);
 const selectedDecal=scenes.find(s=>s.id===selected?.scene)?.decals?.find(d=>d.id===selected?.id);
 return <><aside hidden={!visible} className="decal-tray" aria-label="Ornament tray"><p role="status">{message}</p><div className="decal-chips" role="group" aria-label="Ornament style">{['Fine-line','Botanical','Celestial','Book ornaments','Corners','Frames','Winter'].map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>{MODERN_ORNAMENTS.filter(d=>category==='Fine-line'||d.category===category).map(d=><button key={d.id} aria-label={`Drag ${d.name} onto page`} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);gesture.current={src:'builtin:'+d.id,alt:d.name,startX:e.clientX,startY:e.clientY};}}><img draggable={false} src={decalSource('builtin:'+d.id)} alt=""/><span>{d.name}</span></button>)}<small>All ornaments are free to use in your book, including books you sell.</small></aside>
 {ghost&&createPortal(<img className="decal-drag-ghost" src={decalSource(ghost.src)} alt="" style={{position:'fixed',left:ghost.x,top:ghost.y,width:100,pointerEvents:'none',zIndex:1000}}/>,document.body)}
 {selected&&box&&createPortal(<div className="decal-selection" style={{position:'fixed',left:box.left,top:box.top,width:box.width,height:box.height,zIndex:90,pointerEvents:'none',outline:'2px solid #8565bd'}}>{selectedDecal&&<div className="ornament-color-toolbar" style={{position:'fixed',left:Math.max(8,Math.min(box.left,window.innerWidth-190)),top:Math.max(8,Math.min(box.top>=56?box.top-48:box.bottom+8,window.innerHeight-48)),pointerEvents:'auto'}}><button ref={replaceButton} type="button" aria-label="Replace ornament" aria-expanded={replacing} aria-haspopup="dialog" onClick={()=>setReplacing(v=>!v)}>Replace</button><button type="button" aria-label="Remove ornament" onClick={()=>{const target=selected;setSelected(null);onChange(target.scene,s=>({...s,decals:s.decals?.filter(d=>d.id!==target.id)}));}}>Remove</button>{selectedDecal.src.startsWith('builtin:')&&<label style={{display:'flex',alignItems:'center',gap:6}}>Color<input aria-label="Selected ornament color" type="color" value={selectedDecal.color??'#555555'} onChange={e=>onChange(selected.scene,s=>({...s,decals:s.decals?.map(d=>d.id===selected.id?{...d,color:e.target.value}:d)}))}/></label>}</div>}<button className="decal-resize-handle" aria-label="Resize selected ornament" style={{position:'absolute',left:'100%',top:'100%',transform:'translate(-50%,-50%)',width:14,height:14,minWidth:14,minHeight:14,margin:0,padding:0,border:'2px solid #8565bd',borderRadius:2,background:'white',pointerEvents:'auto',touchAction:'none',cursor:'nwse-resize'}} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);const el=document.querySelector<HTMLElement>(`[data-decal-id="${selected.id}"]`);const d=scenes.find(s=>s.id===selected.scene)?.decals?.find(d=>d.id===selected.id);const page=el?.closest('.pagination-page');if(el&&d&&page)gesture.current={scene:selected.scene,id:d.id,startX:e.clientX,startY:e.clientY,original:d,rect:page.getBoundingClientRect(),resize:true,el,page:page as HTMLElement,start:el.getBoundingClientRect()};}}/></div>,document.body)}
 {selected&&selectedDecal&&replacing&&createPortal(<DecalReplacementChooser scenes={scenes} decal={selectedDecal} onClose={closeReplacement} onReplace={(src,alt)=>onChange(selected.scene,s=>({...s,decals:s.decals?.map(d=>d.id===selected.id?{...d,src,alt}:d)}))}/>,document.body)}
 <style>{artworkOverflowCss+`.ornament-color-toolbar{display:flex;align-items:center;gap:10px;box-sizing:border-box;width:max-content;max-width:calc(100vw - 16px);height:40px;padding:6px 8px;border-radius:6px;background:white;color:#292332;font:12px/1.2 Arial,sans-serif;white-space:nowrap;box-shadow:0 2px 10px #0003}.ornament-color-toolbar input[type=color]{display:block;flex:0 0 32px;box-sizing:border-box;width:32px!important;height:28px!important;min-width:0!important;min-height:0!important;max-width:32px;padding:2px!important;margin:0!important;border:1px solid #b8afc5;border-radius:4px;background:transparent}.ornament-color-toolbar input[type=color]::-webkit-color-swatch-wrapper{padding:0}.ornament-color-toolbar input[type=color]::-webkit-color-swatch{border:0;border-radius:2px}.ornament-color-toolbar input[type=color]::-moz-color-swatch{border:0;border-radius:2px}.decal-tray{position:relative;width:100%;background:#f6f4f8;padding:4px;box-sizing:border-box}.decal-tray p,.decal-tray small{font-size:11px;line-height:1.4}.decal-tray button{display:grid;width:100%;padding:10px;margin:8px 0;touch-action:none;cursor:grab}.decal-tray img{width:100%;height:48px;object-fit:contain}.decal-tray select{width:100%}[data-decal-id]{pointer-events:auto!important;cursor:move;touch-action:none;user-select:none}[data-decal-id]:hover{outline:1px dashed #8064a2}@media print{.decal-tray,.decal-selection,.decal-resize-handle,.decal-drag-ghost{display:none!important}}`}</style></>;
}
