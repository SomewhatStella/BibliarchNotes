"use client";
import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $getSelection, $isRangeSelection, $isParagraphNode, $isTextNode, $isElementNode, HISTORY_MERGE_TAG, SKIP_DOM_SELECTION_TAG, SKIP_SCROLL_INTO_VIEW_TAG, KEY_DOWN_COMMAND, KEY_ENTER_COMMAND, KEY_BACKSPACE_COMMAND, KEY_DELETE_COMMAND, COMMAND_PRIORITY_HIGH, type ElementNode, type EditorState, type LexicalEditor, type LexicalNode } from 'lexical';
import { PageNode, FlowParagraphNode, type PageMetrics } from './nodes';
import { safeSplitOffset } from './serialization';
const TAG='automatic-pagination';
function copyParagraph(from:ElementNode, to:FlowParagraphNode) {
  to.setFormat(from.getFormatType()); to.setIndent(from.getIndent()); to.setDirection(from.getDirection());
  if($isParagraphNode(from)) { to.setTextFormat(from.getTextFormat()); to.setTextStyle(from.getTextStyle()); }
  return to;
}
function remapElement(from:ElementNode,to:ElementNode,offset:number) {
  const s=$getSelection(); if(!$isRangeSelection(s)) return;
  for(const point of [s.anchor,s.focus]) if(point.key===from.getKey()) point.set(to.getKey(),point.offset+offset,'element');
}
function consolidate(metrics:PageMetrics) {
  const root=$getRoot(); const old=root.getChildren();
  const blocks=old.flatMap(n=>n instanceof PageNode?n.getChildren():[n]);
  let page=old[0] instanceof PageNode?old[0]:new PageNode(metrics);
  if(!page.isAttached()) root.append(page);
  page.getWritable().__metrics=metrics;
  let previous:FlowParagraphNode|undefined;
  for(let block of blocks) {
    if($isParagraphNode(block) && !(block instanceof FlowParagraphNode)) {
      const replacement=copyParagraph(block,new FlowParagraphNode());
      remapElement(block,replacement,0); replacement.append(...block.getChildren()); block.replace(replacement); block=replacement;
    }
    if(block instanceof FlowParagraphNode && previous?.__group===block.__group) {
      remapElement(block,previous,previous.getChildrenSize()); previous.append(...block.getChildren()); block.remove();
    } else { page.append(block); previous=block instanceof FlowParagraphNode?block:undefined; }
  }
  for(const n of old) if(n instanceof PageNode && n!==page) n.remove();
  if(metrics.view?.image?.mode==='spread')page.insertAfter(new PageNode(metrics,1));
}
/** Rejoin pages k..end into page k (a partial consolidate), so text can flow back after a delete. */
function consolidateFrom(k:number) {
  const pages=$getRoot().getChildren().filter(n=>n instanceof PageNode) as PageNode[];
  const target=pages[k]; if(!target) return;
  const last=target.getLastChild();
  let previous:FlowParagraphNode|undefined=last instanceof FlowParagraphNode?last:undefined;
  for(const page of pages.slice(k+1)) {
    for(const block of page.getChildren()) {
      if(block instanceof FlowParagraphNode && previous?.__group===block.__group) {
        remapElement(block,previous,previous.getChildrenSize()); previous.append(...block.getChildren()); block.remove();
      } else { target.append(block); previous=block instanceof FlowParagraphNode?block:undefined; }
    }
    page.remove();
  }
}
/** Page/block layout only (not text): equal shapes mean an edit stayed inside existing paragraphs. */
function shape(state:EditorState):string {
  return state.read(()=>$getRoot().getChildren().map(n=>n instanceof PageNode?n.getChildren().map(c=>c.getKey()).join(','):'!'+n.getKey()).join('|'));
}
// Measure actual laid-out glyphs, not estimated line counts. Coordinates automatically
// account for ancestor zoom/transforms because both the body and ranges use client rects.
function fittingOffset(dom:HTMLElement,bottom:number) {
  const walker=document.createTreeWalker(dom,NodeFilter.SHOW_TEXT); const texts:Text[]=[];
  while(walker.nextNode()) texts.push(walker.currentNode as Text);
  const total=texts.reduce((n,t)=>n+t.length,0);
  const fits=(offset:number)=> {
    let remaining=offset;
    for(const t of texts) {
      if(remaining<=t.length) {
        if(!remaining) return true;
        const range=document.createRange(); range.setStart(t,Math.max(0,remaining-1)); range.setEnd(t,remaining);
        const rect=range.getBoundingClientRect(); return rect.bottom<=bottom+0.5;
      }
      remaining-=t.length;
    }
    return false;
  };
  let lo=0,hi=total;
  while(lo<hi) { const mid=Math.ceil((lo+hi)/2); if(fits(mid))lo=mid;else hi=mid-1; }
  const snapped=safeSplitOffset(texts.map(t=>t.data).join(''),lo);
  if(snapped===lo||snapped<=0)return snapped;
  // A word straddling the page end moved to the next page. Move the rest of that line too,
  // so the page ends on a full line instead of a short one stretched by justification.
  const top=charTop(dom,snapped);if(top===null)return snapped;
  let start=snapped;
  while(start>0){const t=charTop(dom,start-1);if(t===null||Math.abs(t-top)>1)break;start--;}
  return start>0?start:snapped;
}
/*
 * Book rule: no widows or orphans. Don't leave a paragraph's lone first line at the
 * bottom of a page (move the paragraph on), and don't start a page with a paragraph's
 * lone last line (carry one more line over with it).
 */
function balanceLines(dom:HTMLElement,offset:number,canMoveWhole:boolean):number {
  const text=dom.textContent??'',total=text.length;
  if(offset<=0||offset>=total)return offset;
  const box=dom.getBoundingClientRect(),scale=box.height/(dom.offsetHeight||box.height||1);
  const cs=getComputedStyle(dom),lh=(parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.5)*scale;
  // The cut sits at a word start; that word may be hyphenated across two lines, so count the
  // tail from where the word ends (that's where the tail's first line will really be).
  const word=/^\S*/.exec(text.slice(offset))?.[0].length||1;
  const first=charTop(dom,0),headLast=charTop(dom,offset-1),tailTop=charTop(dom,Math.min(total-1,offset+word-1)),last=charTop(dom,total-1);
  if(first===null||headLast===null||tailTop===null||last===null||!(lh>0))return offset;
  const head=Math.round((headLast-first)/lh)+1,tail=Math.round((last-tailTop)/lh)+1;
  if(head<=1&&canMoveWhole)return 0;
  if(tail<=1){
    // Carry one more line over; if that would strand a single first line, move the whole paragraph.
    if(head>=3){const earlier=fittingOffset(dom,headLast);if(earlier>0&&earlier<offset)return earlier;}
    else if(canMoveWhole)return 0;
  }
  return offset;
}
function split(block:FlowParagraphNode,offset:number) {
  const continuation=copyParagraph(block,new FlowParagraphNode(block.__group));
  let remaining=offset;
  for(const child of block.getChildren()) {
    const size=child.getTextContentSize();
    if(remaining>=size) { remaining-=size; continue; }
    if(remaining>0 && $isTextNode(child)) {
      const parts=child.splitText(remaining); continuation.append(parts[1]); remaining=0;
    } else { continuation.append(child); remaining=0; }
  }
  return continuation;
}
/*
 * Fast path after the pages are rejoined: everything sits in one tall column on the
 * first page. Measure that column once, work out every page break, then move all the
 * blocks in a single update. The step-by-step flow() below then only fixes the odd
 * line that moved (e.g. a continued paragraph losing its first-line indent).
 * Skipped when pictures wrap text, since floats lay out differently per page.
 */
function bulkFlow(editor:LexicalEditor,metrics:PageMetrics):void {
  const pages=$getRoot().getChildren().filter(n=>n instanceof PageNode) as PageNode[];
  if(pages.length!==1||metrics.view?.images?.some((p:any)=>p.mode==="wrap")||metrics.view?.image)return;
  const first=pages[0],dom=editor.getElementByKey(first.getKey()),body=dom?.querySelector<HTMLElement>('.pagination-body');
  if(!body)return;
  const box=body.getBoundingClientRect(),scale=box.height/(body.offsetHeight||box.height||1),H=body.clientHeight*scale;
  if(!(H>40))return;
  const children=first.getChildren();
  let limit=box.top+H;
  const lastEl=children.length?editor.getElementByKey(children[children.length-1].getKey()):null;
  if(!lastEl||lastEl.getBoundingClientRect().bottom<=limit+0.5)return;
  type Cut={index:number;offset:number|null};
  const cuts:Cut[]=[];
  for(let i=0;i<children.length;i++){
    const block=children[i],el=editor.getElementByKey(block.getKey());if(!el)continue;
    let rect=el.getBoundingClientRect();
    let guard=0;
    while(rect.bottom>limit+0.5&&guard++<200){
      let offset=0;
      if(block instanceof FlowParagraphNode){
        offset=balanceLines(el,fittingOffset(el,limit),i>0||cuts.length>0);
        const prior=cuts.filter(c=>c.index===i&&c.offset!==null).map(c=>c.offset as number);
        if(prior.length&&offset<=Math.max(...prior))offset=0;
      }
      if(offset>0&&offset<block.getTextContentSize()){
        const top=charTop(el,offset);if(top===null)break;
        cuts.push({index:i,offset});limit=top+H;
      } else {
        if(i===0&&!cuts.length)break; // an oversized first block stays where it is
        if(cuts.some(c=>c.index===i))break;
        const margin=(parseFloat(getComputedStyle(el).marginTop)||0)*scale;
        cuts.push({index:i,offset:null});limit=rect.top-margin+H;
      }
      rect=el.getBoundingClientRect();
    }
  }
  if(!cuts.length)return;
  // Apply: split paragraphs from the end so earlier offsets stay valid, then deal blocks out.
  const pieces=new Map<number,ElementNode[]>();
  for(const [index,list] of groupBy(cuts.filter(c=>c.offset!==null),c=>c.index)){
    const block=children[index] as FlowParagraphNode,offsets=list.map(c=>c.offset as number).sort((a,b)=>b-a);
    const tails:ElementNode[]=[];
    for(const o of offsets)tails.unshift(split(block,o));
    pieces.set(index,tails);
  }
  const breakBefore=new Set(cuts.filter(c=>c.offset===null).map(c=>c.index));
  let page=first,index=0;
  const newPage=()=>{const next=new PageNode(metrics,++index);page.insertAfter(next);page=next;};
  children.forEach((block,i)=>{
    if(breakBefore.has(i))newPage();
    if(page!==first)page.append(block);
    for(const tail of pieces.get(i)||[]){newPage();page.append(tail);}
  });
}
function groupBy<T,K>(list:T[],key:(t:T)=>K){const m=new Map<K,T[]>();for(const t of list){const k=key(t);m.set(k,[...(m.get(k)||[]),t]);}return m;}
function charTop(dom:HTMLElement,offset:number):number|null{
  const walker=document.createTreeWalker(dom,NodeFilter.SHOW_TEXT);let remaining=offset;
  while(walker.nextNode()){const t=walker.currentNode as Text;if(remaining<t.length){const r=document.createRange();r.setStart(t,remaining);r.setEnd(t,remaining+1);const rect=r.getClientRects()[0]||r.getBoundingClientRect();return rect.top;}remaining-=t.length;}
  return null;
}
/** Moves the first overflow it finds (from page `from` on) to the next page; returns that page's index, or -1 when everything fits. */
function flow(editor:LexicalEditor,metrics:PageMetrics,from=0):number {
  const pages=$getRoot().getChildren().filter(n=>n instanceof PageNode) as PageNode[];
  for(let index=Math.max(0,Math.min(from,pages.length-1));index<pages.length;index++) {
    const page=pages[index]; const dom=editor.getElementByKey(page.getKey());
    const body=dom?.querySelector<HTMLElement>('.pagination-body'); if(!body) continue;
    const bottom=body.getBoundingClientRect().bottom;
    const children=page.getChildren();
    for(let i=0;i<children.length;i++) {
      const block=children[i]; const el=editor.getElementByKey(block.getKey()); if(!el)continue;
      // A split paragraph is still one paragraph: only its first fragment is indented.
      const previous=i?children[i-1]:pages[index-1]?.getLastChild();
      el.toggleAttribute('data-continuation',block instanceof FlowParagraphNode && previous instanceof FlowParagraphNode && block.__group===previous.__group);
      // The part of a paragraph that continues on the next sheet is justified to its last line, like print.
      const following=i<children.length-1?children[i+1]:pages[index+1]?.getFirstChild();
      el.toggleAttribute('data-continues',block instanceof FlowParagraphNode && following instanceof FlowParagraphNode && block.__group===following.__group);
      // Paragraph indents use the book's indent step (Book design → Text), not Lexical's fixed 40px.
      const level=$isElementNode(block)?block.getIndent():0;el.style.paddingInlineStart=level?`calc(${level} * var(--indent-step, 12.7mm))`:'';
      if(el.getBoundingClientRect().bottom<=bottom+0.5)continue;
      let tail:ElementNode|undefined;
      if(block instanceof FlowParagraphNode) {
        const offset=balanceLines(el,fittingOffset(el,bottom),i>0||!!body.querySelector('.pagination-prefix')?.childNodes.length);
        if(offset>0 && offset<block.getTextContentSize()) tail=split(block,offset);
      }
      // An indivisible oversized block stays alone rather than creating endless pages.
      const start=tail?i+1:i;
      const hasPrefix=!!body.querySelector('.pagination-prefix')?.childNodes.length;
      if(!tail && i===0 && !hasPrefix) { if(children.length===1)continue; }
      if(!block.getTextContentSize()&&dom?.dataset.artPage)continue;
      let next=pages[index+1];
      if(!next) { next=new PageNode(metrics,index+1); page.insertAfter(next); }
      const moving=children.slice(!tail && i===0 && !hasPrefix?1:start);
      const existing=next.getChildren();
      if(tail)next.append(tail);
      next.append(...moving,...existing);
      return index;
    }
  }
  return -1;
}
/** Empty space at the bottom of a page's text area (screen pixels), and the line height of what follows. */
function freeSpace(editor:LexicalEditor,page:PageNode):{free:number;line:number}|null {
  const dom=editor.getElementByKey(page.getKey()),body=dom?.querySelector<HTMLElement>('.pagination-body');
  const last=page.getLastChild(),next=page.getNextSibling(),first=next instanceof PageNode?next.getFirstChild():null;
  if(!body||!last||!first)return null;
  const el=editor.getElementByKey(last.getKey()),nextEl=editor.getElementByKey(first.getKey());
  if(!el||!nextEl)return null;
  const box=body.getBoundingClientRect(),scale=box.height/(body.offsetHeight||box.height||1);
  const cs=getComputedStyle(nextEl),line=(parseFloat(cs.lineHeight)||parseFloat(cs.fontSize)*1.5)*scale;
  return {free:box.bottom-el.getBoundingClientRect().bottom,line};
}
export function PaginationPlugin({metrics}:{metrics:PageMetrics}) {
  const [editor]=useLexicalComposerContext();
  const selecting=useRef(false);
  useEffect(()=> {
    // The browser's in-progress drag anchor is not Lexical's RangeSelection.
    // Rebuilding continuation pages mid-gesture invalidates that native anchor,
    // even if Lexical correctly remaps its own selection. Keep DOM stable until
    // release, including releases outside the editor and cancelled gestures.
    const down=(event:PointerEvent)=>{if(event.button===0)selecting.current=true;};
    const end=()=>{selecting.current=false;};
    const removeRoot=editor.registerRootListener((root,previous)=>{
      previous?.removeEventListener('pointerdown',down,true);
      root?.addEventListener('pointerdown',down,true);
    });
    window.addEventListener('pointerup',end,true);
    window.addEventListener('pointercancel',end,true);
    window.addEventListener('blur',end);
    return ()=>{removeRoot();end();window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);window.removeEventListener('blur',end);};
  },[editor]);
  useEffect(()=> {
    let frame=0, reset=true, disposed=false, passes=0, firstLayout=true;
    // Ordinary typing only re-lays the page being edited (spilling forward as needed). A full
    // rejoin-and-split of the whole chapter on every keystroke made long chapters lag.
    let dirtyFrom=Infinity;
    const settledFree=new Map<string,number>();
    let held:Array<[HTMLElement,number,number]>|null=null;
    const schedule=()=> { if(!frame&&!disposed)frame=requestAnimationFrame(tick); };
    const tick=()=> {
      frame=0; if(editor.isComposing() || selecting.current) {schedule();return;}
      // Reconcile and measure synchronously in one animation callback. Yielding a
      // frame between consolidation and each split exposes a collapsed manuscript
      // to browser paint/scroll anchoring on every keystroke.
      let scrolls: Array<[HTMLElement,number,number]>=[];
      if(held){scrolls=held;held=null;}
      else for(let el=editor.getRootElement()?.parentElement;el;el=el.parentElement)scrolls.push([el,el.scrollTop,el.scrollLeft]);
      // The caret is re-placed by every pass while editing (as before): passes are few now.
      const focused=editor.getRootElement()===document.activeElement;
      const tag=focused?[TAG,HISTORY_MERGE_TAG,SKIP_SCROLL_INTO_VIEW_TAG]:[TAG,HISTORY_MERGE_TAG,SKIP_DOM_SELECTION_TAG,SKIP_SCROLL_INTO_VIEW_TAG];
      let moved=false, start=0;
      if(reset) {
        reset=false; passes=0; dirtyFrom=Infinity; settledFree.clear();
        editor.update(()=>consolidate(metrics),{tag,discrete:true}); moved=true;
        // The one-shot layout is only used when a chapter first opens (the slow part of
        // loading a long book). Edits and undo use the step-by-step flow, which also
        // rejoins pieces of a paragraph correctly.
        if(firstLayout){firstLayout=false;editor.update(()=>bulkFlow(editor,metrics),{tag,discrete:true});}
      } else {
        passes=0; start=Number.isFinite(dirtyFrom)?dirtyFrom:0; dirtyFrom=Infinity;
        // A delete that frees a whole line: let the following pages flow back up.
        const state=editor.getEditorState();
        const space=state.read(()=>{const page=($getRoot().getChildren().filter(n=>n instanceof PageNode) as PageNode[])[start];return page?{key:page.getKey(),sp:freeSpace(editor,page)}:null;});
        const before=space?settledFree.get(space.key):undefined;
        if(space?.sp&&before!==undefined&&space.sp.free-before>=space.sp.line*0.6){editor.update(()=>consolidateFrom(start),{tag,discrete:true});moved=true;}
      }
      let at=start;
      while(at>=0 && ++passes<500) {
        const from=at;
        editor.update(()=> {at=flow(editor,metrics,from);},{tag,discrete:true});
        if(at>=0)moved=true;
      }
      // Remember how much room the edited pages have, to notice the next freed line.
      editor.getEditorState().read(()=>{const pages=$getRoot().getChildren().filter(n=>n instanceof PageNode) as PageNode[];for(const p of pages.slice(start,start+2)){const sp=freeSpace(editor,p);if(sp)settledFree.set(p.getKey(),sp.free);}});
      for(const [el,top,left] of scrolls){el.scrollTop=top;el.scrollLeft=left;}
    };
    const unregister=editor.registerUpdateListener(({tags,dirtyElements,dirtyLeaves,editorState,prevEditorState})=> {
      if(!dirtyElements.size&&!dirtyLeaves.size)return;
      // Our own layout passes never change the words; only react if a user edit was batched in.
      // (Whitespace is ignored: splitting a paragraph across pages adds a block break.)
      const text=(st:EditorState)=>st.read(()=>$getRoot().getAllTextNodes().map(t=>t.getTextContent()).join('').replace(/\s+/g,''));
      // (The root's own getTextContent() is a render-time cache and can be stale here.)
      if(tags.has(TAG)&&text(editorState)===text(prevEditorState))return;
      if(!reset&&!tags.has(TAG)&&!tags.has('historic')&&shape(editorState)===shape(prevEditorState)) {
        // Text changed inside existing paragraphs: re-lay from the first edited page.
        const index=editorState.read(()=>$getRoot().getChildren().findIndex(n=>n instanceof PageNode&&dirtyElements.has(n.getKey())));
        if(index>=0){dirtyFrom=Math.min(dirtyFrom,index);schedule();return;}
      }
      reset=true; schedule();
    });
    // Structural keyboard edits operate on logical paragraphs, never on a generated
    // page boundary. Moving existing text nodes retains Lexical's live selection.
    // Backspace at the very start of a page that opens lower down moves the text up
    // one line, as if deleting a blank line above it (like a word processor).
    const removeOpeningBackspace=editor.registerCommand(KEY_BACKSPACE_COMMAND,event=>{
      const view=metrics.view,spacing=view?.layout?.chapterSpacing??0;
      if(!view?.inlineTitle||!(spacing>0)||!view.onTitleLayout)return false;
      const s=$getSelection();if(!$isRangeSelection(s)||!s.isCollapsed()||s.anchor.offset!==0)return false;
      const page=$getRoot().getFirstChild();if(!(page instanceof PageNode))return false;
      const block=page.getFirstChild();if(!block)return false;
      const node=s.anchor.getNode();
      const atStart=node.is(block)||(node.is((block as any).getFirstDescendant?.())&&s.anchor.type==='text');
      if(!atStart)return false;
      const el=editor.getElementByKey(block.getKey());
      const lineMm=(el?parseFloat(getComputedStyle(el).lineHeight)||24:24)/3.78;
      event?.preventDefault();
      view.onTitleLayout({chapterSpacing:Math.max(0,Math.round((spacing-lineMm)*2)/2)});
      return true;
    },COMMAND_PRIORITY_HIGH);
    const removeNavigation=editor.registerCommand(KEY_DOWN_COMMAND,event=>{
      if(!(event.ctrlKey||event.metaKey)||!['Home','End','a','A'].includes(event.key))return false;
      const texts=$getRoot().getAllTextNodes();if(!texts.length)return false;
      event.preventDefault();const first=texts[0],last=texts[texts.length-1];
      if(event.key.toLowerCase()==='a'){first.select(0,0);const s=$getSelection();if($isRangeSelection(s))s.setTextNodeRange(first,0,last,last.getTextContentSize());}
      else {const target=event.key==='Home'?first:last,offset=event.key==='Home'?0:last.getTextContentSize(),s=$getSelection();if(event.shiftKey&&$isRangeSelection(s))s.focus.set(target.getKey(),offset,'text');else target.select(offset,offset);}
      return true;
    },COMMAND_PRIORITY_HIGH);
    // Only edits that cross a paragraph boundary need the split fragments rejoined
    // first. Ordinary character deletes inside a fragment (e.g. the part of a
    // paragraph that continued onto the next sheet) must not rebuild the page:
    // doing so dropped the keystroke and let the view jump.
    const blockOf=(node:LexicalNode|null)=>{let n:LexicalNode|null=node;while(n&&!(n.getParent() instanceof PageNode))n=n.getParent();return n;};
    const crossesBoundary=(command:unknown)=>{
      const s=$getSelection();if(!$isRangeSelection(s))return true;
      if(command===KEY_ENTER_COMMAND)return true;
      const block=blockOf(s.anchor.getNode());if(!block)return true;
      if(!s.isCollapsed())return !block.is(blockOf(s.focus.getNode()));
      const node=s.anchor.getNode();
      if(command===KEY_BACKSPACE_COMMAND){
        if(s.anchor.offset!==0)return false;
        return node.is(block)||node.is($isElementNode(block)?block.getFirstDescendant():null);
      }
      const size=$isTextNode(node)?node.getTextContentSize():$isElementNode(node)?node.getChildrenSize():0;
      if(s.anchor.offset<size)return false;
      return node.is(block)||node.is($isElementNode(block)?block.getLastDescendant():null);
    };
    const removeKeys=[KEY_ENTER_COMMAND,KEY_BACKSPACE_COMMAND,KEY_DELETE_COMMAND].map(command=>
      editor.registerCommand(command,()=>{
        if(!crossesBoundary(command))return false;
        // Remember where the view was before the pages are rejoined, so the
        // reflow puts it back exactly instead of wherever the browser left it.
        held=[];for(let el=editor.getRootElement()?.parentElement;el;el=el.parentElement)held.push([el,el.scrollTop,el.scrollLeft]);
        consolidate(metrics);return false;
      },COMMAND_PRIORITY_HIGH));
    let lastWidth=0;
    const observer=new ResizeObserver(entries=> { const width=entries[0]?.contentRect.width; if(width!==lastWidth){lastWidth=width;reset=true;schedule();} });
    const fonts=()=>{reset=true;schedule();};
    const removeRoot=editor.registerRootListener((root,previous)=> {if(previous){observer.unobserve(previous);previous.removeEventListener('load',fonts,true);}if(root){observer.observe(root);root.addEventListener('load',fonts,true);}});
    document.fonts?.addEventListener('loadingdone',fonts);
    schedule();
    return ()=> {disposed=true;cancelAnimationFrame(frame);unregister();removeNavigation();removeOpeningBackspace();removeKeys.forEach(remove=>remove());removeRoot();observer.disconnect();document.fonts?.removeEventListener('loadingdone',fonts);};
  },[editor,metrics.widthPx,metrics.heightPx,metrics.marginPx,metrics.firstPageReservePx,metrics.header,metrics.footer,metrics.styleKey,metrics.guides,metrics.insidePx,metrics.outsidePx,metrics.startPage,JSON.stringify(metrics.view)]);
  return null;
}
