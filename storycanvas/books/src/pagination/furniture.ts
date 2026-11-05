import {decalSource, ORNAMENTS, normalizeLayout} from '../design';
import type {PageMetrics} from './nodes';
import {wrapShape} from '../contour';
// All furniture is created with textContent / vetted image URLs, never user HTML.
export function decoratePage(page:HTMLElement,body:HTMLElement,prefix:HTMLElement,m:PageMetrics,index:number){
 const scene=m.view,layout=normalizeLayout(scene?.layout),isFirst=index===0,mode=scene?.image?.mode||'inline';
 const artPage=!!scene?.image&&(mode==='full'||mode==='spread')&&(index===0||(mode==='spread'&&index===1));
 prefix.replaceChildren();prefix.contentEditable='false';prefix.style.cssText='pointer-events:auto;user-select:none;';
 body.classList.toggle('drop-cap',isFirst&&!!layout.dropCap);
 body.style.display='flow-root';body.style.flexDirection='';prefix.style.order='';
 if(isFirst&&scene?.inlineTitle){
  // Titles are ordinary text in the page; only page-level space and the generated contents list live here.
  if(layout.chapterSpacing>0)prefix.append(openingSpace(body,layout.chapterSpacing,scene.onTitleLayout));
  if(scene.toc){
   const list=document.createElement('ol');list.className='toc-list';
   for(const item of scene.toc){const row=document.createElement('li'),name=document.createElement('span'),dots=document.createElement('i'),num=document.createElement('b');name.textContent=item.title;num.textContent=String(item.page??'');row.append(name,dots,num);list.append(row);}
   if(!scene.toc.length){const row=document.createElement('li');row.textContent='Chapters will be listed here automatically.';list.append(row);}
   // Show the generated list after the page's own "Contents" heading.
   body.style.display='flex';body.style.flexDirection='column';
   const tail=document.createElement('div');tail.style.order='2';tail.append(list);prefix.append(tail);prefix.style.order='2';
  }
 } else if(isFirst&&scene&&(scene.template||'prose')!=='prose'){
  if(scene.chapterLabel){const k=document.createElement('div');k.className='chapter-kicker';k.textContent=scene.chapterLabel;prefix.append(k);}
  const h=document.createElement('h1');h.textContent=scene.title;h.style.cssText=`font-family:var(--heading-font);font-size:var(--heading-size);text-align:${layout.titleAlign};margin:0 0 24px;padding-top:${layout.chapterSpacing*3.78}px;`;
  if(scene.template==='book-front'){h.style.fontSize='44px';}
  if(scene.onTitleChange){
   // Only a sizing placeholder lives in Lexical's DOM. The native control is
   // mounted by TitleControl outside the contenteditable and its event ownership.
   h.dataset.titlePlaceholder='true';h.textContent=scene.title||'\u00a0';h.style.visibility='hidden';h.style.whiteSpace='nowrap';h.style.overflow='hidden';
  }
  if(!artPage)prefix.append(h);
  if(scene.toc){const list=document.createElement('ol');for(const item of scene.toc){const row=document.createElement('li');row.textContent=item.title+' · '+item.page;list.append(row);}prefix.append(list);}
 }
 if(scene?.image&&(isFirst||artPage)){
  const im=scene.image,figure=document.createElement('figure'),img=document.createElement('img');figure.className='design-image';figure.style.cssText='margin:0 0 18px;';
  img.src=im.src;img.alt=index===1?'':im.alt;img.style.cssText=`display:block;max-width:100%;width:100%;object-fit:${im.fit||'contain'};object-position:${im.position||'50% 50%'};opacity:${im.opacity??1};transform:rotate(${im.rotation||0}deg);${scene.template==='bnw-art'?'filter:grayscale(1);':''}`;
  if(artPage){figure.style.cssText=`position:absolute;inset:0;margin:0;overflow:hidden;`;img.style.width=mode==='spread'?'200%':'100%';img.style.maxWidth='none';img.style.height='100%';if(mode==='spread'){img.style.objectFit='cover';img.style.transform=`translateX(${index===1?'-50%':'0'}) rotate(${im.rotation||0}deg)`;}prefix.append(figure);}
  else {figure.style.width=(mode==='half'?50:mode.startsWith('float')?42:im.widthPercent||100)+'%';if(mode.startsWith('float')){figure.style.float=mode==='float-left'?'left':'right';figure.style.margin=mode==='float-left'?'0 20px 12px 0':'0 0 12px 20px';}img.style.maxHeight=Math.max(48,(m.heightPx-2*m.marginPx)*.45)+'px';if(im.fit==='cover')img.style.height='240px';prefix.append(figure);}
  figure.append(img);if(im.caption){const c=document.createElement('figcaption');c.textContent=im.caption;figure.append(c);}
 }
 if(artPage){prefix.style.height=Math.max(0,m.heightPx-2*m.marginPx-2)+'px';page.dataset.artPage='true';}else delete page.dataset.artPage;
 page.querySelectorAll('[data-decoration]').forEach(el=>el.remove());
 for(const p of scene?.images||[]){
  if(p.page!==index)continue;
  const asset=scene.assets?.find((a:any)=>a.id===p.assetId);if(!asset)continue;
  const img=document.createElement('img');img.src=asset.src;img.alt=asset.name;img.draggable=false;img.contentEditable='false';img.dataset.placedImage=p.id;
  const width=(p.mode==='wrap'?m.widthPx-2*m.marginPx:m.widthPx)*p.width/100;
  const height=width*asset.naturalHeight/asset.naturalWidth;
  img.style.cssText=`display:block;width:${width}px;height:${height}px;object-fit:contain;pointer-events:auto;touch-action:none;cursor:move;user-select:none;`;
  if(p.mode==='wrap'){
   // Clip detected plain backgrounds too: otherwise the opaque rectangle hides text in the reclaimed area.
   if(p.contourMode==='background'&&p.contour?.length)img.style.clipPath=`polygon(${p.contour.map(([x,y]:[number,number])=>`${x}% ${y}%`).join(',')})`;
   const box=document.createElement('div'),top=Math.min(p.y/100*(m.heightPx-2*m.marginPx),Math.max(0,m.heightPx-2*m.marginPx-height-24));
   const gap=Math.max(0,Math.min(48,p.wrapGap??12));
   box.contentEditable='false';box.style.cssText=`float:${p.x<50?'left':'right'};position:relative;width:${width}px;height:${top+height}px;margin-bottom:${gap}px;shape-outside:${wrapShape(p.contour,width,height,top)};shape-margin:${gap}px;`;img.style.position='absolute';img.style.top=top+'px';box.append(img);prefix.append(box);
  }else{img.dataset.decoration='true';img.style.position='absolute';img.style.left=p.x+'%';img.style.top=p.y+'%';img.style.zIndex='4';page.append(img);}
 }

 if(isFirst)for(const d of scene?.decals||[]){try{
  for(const ghost of [false,true]){
   const layer=document.createElement('div');layer.dataset.decoration='true';layer.contentEditable='false';layer.className=ghost?'artwork-overflow-ghost decal-overflow-ghost':'artwork-clip';layer.style.zIndex='1';if(ghost)layer.setAttribute('aria-hidden','true');
   const img=document.createElement('img');if(ghost)img.dataset.decalProxy=d.id;else img.dataset.decalId=d.id;img.draggable=false;img.contentEditable='false';img.className='decal';img.src=decalSource(d.src,d.color);img.alt=ghost?'':d.alt;img.style.cssText=`position:absolute;left:${d.x}%;top:${d.y}%;width:${d.width}%;height:auto;max-width:none;transform:rotate(${d.rotation}deg);opacity:${d.opacity};pointer-events:auto;`;layer.append(img);page.append(layer);
  }
 }catch{}}
 if(layout.border!=='none')page.style.border=`3px ${layout.border} #555`;
 if(m.guides){page.style.outline='1px dashed #d55';body.style.outline='1px dashed #6b93b7';}
 if(layout.divider!=='none'){const d=document.createElement('div');d.dataset.decoration='true';d.className='scene-divider';d.contentEditable='false';d.textContent=ORNAMENTS[layout.divider];d.style.cssText='position:absolute;bottom:40px;left:0;right:0;text-align:center;pointer-events:none';page.append(d);}
}

/*
 * The empty space above the first line of a chapter or title page. It behaves like
 * blank lines: click it to put the cursor at the start of the text (Backspace then
 * moves the text up a line), or drag it to move the text up or down.
 */
function openingSpace(body:HTMLElement,spacingMm:number,onLayout?:(patch:{chapterSpacing:number})=>void){
 const sp=document.createElement('div');sp.className='first-line-space';sp.style.height=spacingMm*3.78+'px';
 if(!onLayout)return sp;
 sp.classList.add('adjustable');sp.title='Drag to move the text up or down. Or click here and press Backspace.';
 const tag=document.createElement('span');tag.className='first-line-space-tag';tag.textContent='Drag to move text up or down';sp.append(tag);
 sp.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;e.preventDefault();e.stopPropagation();
  const startY=e.clientY,start=spacingMm,page=body.closest<HTMLElement>('.pagination-page'),scale=page?page.getBoundingClientRect().width/page.offsetWidth||1:1;
  let moved=false,value=start;
  sp.setPointerCapture(e.pointerId);sp.classList.add('dragging');
  const move=(ev:PointerEvent)=>{const d=(ev.clientY-startY)/scale;if(Math.abs(d)>3)moved=true;if(!moved)return;value=Math.max(0,Math.min(100,Math.round((start+d/3.78)*2)/2));sp.style.height=value*3.78+'px';tag.textContent=value?`${value} mm of space above the text`:'Text at the top of the page';};
  const up=()=>{sp.removeEventListener('pointermove',move);sp.removeEventListener('pointerup',up);sp.removeEventListener('pointercancel',up);sp.classList.remove('dragging');
   if(moved){onLayout({chapterSpacing:value});return;}
   // A plain click puts the cursor at the very start of the text.
   const first=Array.from(body.children).find(c=>!c.classList.contains('pagination-prefix'));const root=body.closest<HTMLElement>('[contenteditable="true"]');
   if(first&&root){root.focus({preventScroll:true});const walker=document.createTreeWalker(first,NodeFilter.SHOW_TEXT);const text=walker.nextNode();const sel=window.getSelection();sel?.removeAllRanges();const r=document.createRange();if(text)r.setStart(text,0);else r.setStart(first,0);r.collapse(true);sel?.addRange(r);}
  };
  sp.addEventListener('pointermove',move);sp.addEventListener('pointerup',up);sp.addEventListener('pointercancel',up);
 });
 return sp;
}
