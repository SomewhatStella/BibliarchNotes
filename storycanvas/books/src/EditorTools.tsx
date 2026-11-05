"use client";
import {useEffect,useRef,useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection,$isRangeSelection,$setSelection,$createParagraphNode,KEY_DOWN_COMMAND,COMMAND_PRIORITY_HIGH,type LexicalNode, CAN_UNDO_COMMAND,CAN_REDO_COMMAND,COMMAND_PRIORITY_LOW,FORMAT_TEXT_COMMAND,FORMAT_ELEMENT_COMMAND,INDENT_CONTENT_COMMAND,OUTDENT_CONTENT_COMMAND,UNDO_COMMAND,REDO_COMMAND,type RangeSelection,type TextFormatType,type ElementFormatType} from 'lexical';
import {$patchStyleText,$setBlocksType} from '@lexical/selection';
import {$createHeadingNode,$isHeadingNode,type HeadingTagType} from '@lexical/rich-text';
import {PageNode} from './pagination/nodes';
import {PARAGRAPH_STYLES,styleForTag,tagForStyle,type ParagraphStyle} from './paragraph-styles';
import {fontLabel} from './design';
import {fonts} from './model';
import type {HistoryState} from '@lexical/react/LexicalHistoryPlugin';
import {$findMatches,$replaceMatch,$selectMatch,$selectionAppearance,type TextMatch} from './editorHelpers';

export function EditorFindBridge({active}:{active:boolean}) {
 const [editor]=useLexicalComposerContext();
 useEffect(()=>{
  if(!active)return;
  let frame=0;
  const find=(event:Event)=>{const query=(event as CustomEvent<{query:string}>).detail?.query;if(!query)return;
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>editor.update(()=>{const match=$findMatches(query)[0];if(match){$selectMatch(match);frame=requestAnimationFrame(()=>{
    // PageNode moves paragraph DOM into its page body during reconciliation.
    // Resolve native text endpoints only after that relocation has committed.
    const start=editor.getElementByKey(match.startKey),end=editor.getElementByKey(match.endKey);
    if(!start||!end)return;
    const endpoint=(element:HTMLElement,offset:number):[Node,number]|null=>{const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode())){const length=node.textContent?.length??0;if(offset<=length)return [node,offset];offset-=length;}return null;};
    const a=endpoint(start,match.startOffset),b=endpoint(end,match.endOffset);
    if(a&&b){editor.getRootElement()?.focus({preventScroll:true});const range=document.createRange();range.setStart(...a);range.setEnd(...b);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);start.scrollIntoView({block:'center'});}
   });}}));
  };
  window.addEventListener('bibliarch-find',find);return ()=>{cancelAnimationFrame(frame);window.removeEventListener('bibliarch-find',find);};
 },[editor,active]);return null;
}
export default function EditorTools({customFonts=[],historyState}:{customFonts?:string[];historyState:HistoryState}) {
 const [editor]=useLexicalComposerContext();
 const saved=useRef<RangeSelection|null>(null);
 const [formats,setFormats]=useState<string[]>([]);
 const [block,setBlock]=useState<ParagraphStyle|''>('normal');
 const [appearance,setAppearance]=useState({font:'inherit',size:'inherit',color:'inherit',alignment:'left'});
 const [canUndo,setCanUndo]=useState(historyState.undoStack.length>0),[canRedo,setCanRedo]=useState(historyState.redoStack.length>0);
 const [find,setFind]=useState(''),[replace,setReplace]=useState(''),[caseSensitive,setCaseSensitive]=useState(false);
 const [matches,setMatches]=useState<TextMatch[]>([]),[current,setCurrent]=useState(-1),[notice,setNotice]=useState('');
 useEffect(()=>{const undo=editor.registerCommand(CAN_UNDO_COMMAND,value=>{setCanUndo(value);return false;},COMMAND_PRIORITY_LOW);const redo=editor.registerCommand(CAN_REDO_COMMAND,value=>{setCanRedo(value);return false;},COMMAND_PRIORITY_LOW);return ()=>{undo();redo();};},[editor]);
 useEffect(()=>{
  const sync=()=>{const s=$getSelection();if($isRangeSelection(s)){saved.current=s.clone();setBlock($selectionBlockStyle());setFormats(['bold','italic','underline','strikethrough','superscript'].filter(f=>s.hasFormat(f as TextFormatType)));const a=$selectionAppearance();if(a)setAppearance(a);}setMatches($findMatches(find,caseSensitive));};
  editor.getEditorState().read(sync);
  return editor.registerUpdateListener(({editorState})=>editorState.read(sync));
 },[editor,find,caseSensitive]);
 function restore(){if(saved.current)$setSelection(saved.current.clone());}
 function applyBlock(id:ParagraphStyle){editor.update(()=>{restore();const s=$getSelection();if(!$isRangeSelection(s))return;const tag=tagForStyle(id);$setBlocksType(s,()=>tag?$createHeadingNode(tag as HeadingTagType):$createParagraphNode());});editor.focus();}
 // Docs shortcuts: Ctrl+Alt+0 normal text, Ctrl+Alt+1..3 headings.
 useEffect(()=>editor.registerCommand(KEY_DOWN_COMMAND,(e:KeyboardEvent)=>{if(!(e.ctrlKey||e.metaKey)||!e.altKey)return false;const id=({Digit0:'normal',Digit1:'h1',Digit2:'h2',Digit3:'h3',Numpad0:'normal',Numpad1:'h1',Numpad2:'h2',Numpad3:'h3'} as Record<string,ParagraphStyle>)[e.code];if(!id)return false;e.preventDefault();editor.update(()=>{const s=$getSelection();if(!$isRangeSelection(s))return;const tag=tagForStyle(id);$setBlocksType(s,()=>tag?$createHeadingNode(tag as HeadingTagType):$createParagraphNode());});return true;},COMMAND_PRIORITY_HIGH),[editor]);
 function style(key:string,value:string){editor.update(()=>{restore();const s=$getSelection();if($isRangeSelection(s))$patchStyleText(s,{[key]:value==='inherit'?null:value});});editor.focus();}
 function select(index:number){if(!matches.length)return;const i=(index+matches.length)%matches.length;setCurrent(i);editor.update(()=>$selectMatch(matches[i]));requestAnimationFrame(()=>editor.getElementByKey(matches[i].startKey)?.scrollIntoView({block:'nearest'}));}
 function replaceMatches(all:boolean){editor.update(()=>{const found=$findMatches(find,caseSensitive);const i=current<0?0:Math.min(current,found.length-1);const targets=all?found:found.slice(i,i+1);[...targets].reverse().forEach(m=>$replaceMatch(m,replace));setNotice(`${targets.length} replacements`);setCurrent(-1);});}
 const prevent=(e:React.MouseEvent)=>e.preventDefault();
 // The toolbar scrolls sideways on small screens, which would clip an absolutely
 // positioned dropdown; pin popovers to the viewport under their button instead.
 const placePopover=(e:React.SyntheticEvent<HTMLDetailsElement>)=>{const d=e.currentTarget;if(!d.open)return;const r=d.querySelector('summary')!.getBoundingClientRect();const pop=d.querySelector<HTMLElement>('.popover');if(!pop)return;const w=Math.min(360,window.innerWidth-16);pop.style.top=`${r.bottom+6}px`;pop.style.left=`${Math.max(8,Math.min(r.left,window.innerWidth-w-8))}px`;pop.style.width=`${w}px`;};
 const fontOptions=Array.from(new Set([...fonts,...customFonts,...(appearance.font&&appearance.font!=='inherit'?[appearance.font]:[])]));
 const sizes=Array.from(new Set(['12px','14px','16px','18px','20px','24px','28px','32px',...(appearance.size&&appearance.size!=='inherit'?[appearance.size]:[])]));
 return <>
 <div className="toolbar" aria-label="Text formatting">
  <button title="Undo" aria-label="Undo" disabled={!canUndo} onMouseDown={prevent} onClick={()=>editor.dispatchCommand(UNDO_COMMAND,undefined)}>↶</button>
  <button title="Redo" aria-label="Redo" disabled={!canRedo} onMouseDown={prevent} onClick={()=>editor.dispatchCommand(REDO_COMMAND,undefined)}>↷</button>
  <span className="separator"/>
  {(['bold','italic'] as TextFormatType[]).map(f=><button key={f} aria-label={f==='bold'?'Bold':'Italic'} aria-pressed={formats.includes(f)} onMouseDown={prevent} onClick={()=>{editor.update(restore);editor.dispatchCommand(FORMAT_TEXT_COMMAND,f);}}>{f==='bold'?<b className="glyph-bold">B</b>:<i className="glyph-italic">I</i>}</button>)}
  <span className="separator"/>
  <select aria-label="Paragraph style" title="Paragraph style (like Normal text or Heading 1)" className="paragraph-style" value={block} onChange={e=>applyBlock(e.target.value as ParagraphStyle)}>{block===''&&<option value="" disabled>Mixed styles</option>}{PARAGRAPH_STYLES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
  <span className="wide-tools">
  <select aria-label="Selection size" value={appearance.size} onChange={e=>style('font-size',e.target.value)}><option value="" disabled>Mixed sizes</option><option value="inherit">Default size</option>{sizes.map(n=><option key={n} value={n}>{n.replace('px','')}</option>)}</select>
  <select aria-label="Selection font" value={appearance.font} onChange={e=>style('font-family',e.target.value)}><option value="" disabled>Mixed fonts</option><option value="inherit">Default font</option>{fontOptions.map(f=><option key={f} value={f}>{fontLabel(f)}</option>)}</select>
  <span className="separator"/>
  {(['left','center','right','justify'] as const).map(a=><button key={a} aria-label={`Align ${a}`} title={`Align ${a}`} onMouseDown={prevent} onClick={()=>{const title=document.activeElement;if(title?.getAttribute('aria-label')==='Page title'){title.dispatchEvent(new CustomEvent('title-align',{detail:a}));return;}editor.update(()=>{restore();editor.dispatchCommand(FORMAT_ELEMENT_COMMAND,a);});editor.focus();}}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{[3,7,11,15].map((y,i)=>{const short=i%2===1&&a!=='justify',x=short?(a==='right'?7:a==='center'?4:1):1;return <line key={y} x1={x} y1={y} x2={short?x+10:17} y2={y} stroke="currentColor" strokeWidth="1.5"/>;})}</svg></button>)}
  </span>
  <details className="format-more" onToggle={placePopover}><summary title="More text styles">More</summary><div className="advanced-formatting popover">
   <div className="narrow-tools">  <select aria-label="Text size" value={appearance.size} onChange={e=>style('font-size',e.target.value)}><option value="" disabled>Mixed sizes</option><option value="inherit">Default size</option>{sizes.map(n=><option key={n} value={n}>{n.replace('px','')}</option>)}</select>
  <select aria-label="Text font" value={appearance.font} onChange={e=>style('font-family',e.target.value)}><option value="" disabled>Mixed fonts</option><option value="inherit">Default font</option>{fontOptions.map(f=><option key={f} value={f}>{fontLabel(f)}</option>)}</select>
   <div className="narrow-align">  {(['left','center','right','justify'] as const).map(a=><button key={a} aria-label={`Align text ${a}`} title={`Align ${a}`} onMouseDown={prevent} onClick={()=>{const title=document.activeElement;if(title?.getAttribute('aria-label')==='Page title'){title.dispatchEvent(new CustomEvent('title-align',{detail:a}));return;}editor.update(()=>{restore();editor.dispatchCommand(FORMAT_ELEMENT_COMMAND,a);});editor.focus();}}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{[3,7,11,15].map((y,i)=>{const short=i%2===1&&a!=='justify',x=short?(a==='right'?7:a==='center'?4:1):1;return <line key={y} x1={x} y1={y} x2={short?x+10:17} y2={y} stroke="currentColor" strokeWidth="1.5"/>;})}</svg></button>)}
</div>
   </div>
   {([['underline','Underline',<u key="u">U</u>],['strikethrough','Strikethrough',<s key="s">S</s>],['superscript','Superscript',<span key="x">x²</span>]] as [TextFormatType,string,React.ReactNode][]).map(([f,label,icon])=><button key={f} aria-label={f} title={label} aria-pressed={formats.includes(f)} onMouseDown={prevent} onClick={()=>{editor.update(restore);editor.dispatchCommand(FORMAT_TEXT_COMMAND,f);}}>{icon}</button>)}
   <label className="color-pick" title="Text color">Color <input type="color" aria-label="Text color" value={/^#[0-9a-f]{6}$/i.test(appearance.color)?appearance.color:'#263c50'} onChange={e=>style('color',e.target.value)}/></label>
   {appearance.color&&appearance.color!=='inherit'&&<button onMouseDown={prevent} onClick={()=>style('color','inherit')}>Default color</button>}
   <button aria-label="Outdent" title="Move paragraph left" onMouseDown={prevent} onClick={()=>editor.dispatchCommand(OUTDENT_CONTENT_COMMAND,undefined)}>⇤ Less indent</button>
   <button aria-label="Indent" title="Move paragraph right" onMouseDown={prevent} onClick={()=>editor.dispatchCommand(INDENT_CONTENT_COMMAND,undefined)}>More indent ⇥</button>
  </div></details>
 </div>
 <details className="find" onToggle={placePopover}><summary title="Find &amp; replace" aria-label="Find &amp; replace"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span className="find-label">Find</span></summary><div className="find-panel popover">
  <div className="find-row"><input aria-label="Find text" placeholder="Find on this page" value={find} onChange={e=>{setFind(e.target.value);setCurrent(-1);setNotice('');}}/>
  <button disabled={!matches.length} aria-label="Previous match" title="Previous" onClick={()=>select(current<0?matches.length-1:current-1)}>↑</button>
  <button disabled={!matches.length} aria-label="Next match" title="Next" onClick={()=>select(current+1)}>↓</button></div>
  <small role="status">{find?(matches.length?`${current>=0&&current<matches.length?`${current+1} of `:''}${matches.length} found`:'Not found on this page'):'Type a word to find it on this page.'}{notice?` · ${notice}`:''}</small>
  <div className="find-row"><input aria-label="Replace with" placeholder="Replace with…" value={replace} onChange={e=>setReplace(e.target.value)}/></div>
  <div className="find-row"><button disabled={!matches.length} onClick={()=>replaceMatches(false)}>Replace</button>
  <button disabled={!matches.length} onClick={()=>replaceMatches(true)}>Replace all</button>
  <label><input type="checkbox" checked={caseSensitive} onChange={e=>{setCaseSensitive(e.target.checked);setCurrent(-1);}}/>Match capitals</label></div>
 </div></details>
 </>;
}

/** Paragraph style of every block the selection touches ('' when they differ). */
function $selectionBlockStyle():ParagraphStyle|''{
 const s=$getSelection();if(!$isRangeSelection(s))return 'normal';
 const blockOf=(n:LexicalNode|null):LexicalNode|null=>{while(n&&n.getParent()&&!(n.getParent() instanceof PageNode)&&n.getParent()?.getType()!=='root')n=n.getParent();return n;};
 const styles=new Set(s.getNodes().concat(s.anchor.getNode()).map(n=>{const b=blockOf(n);return $isHeadingNode(b)?styleForTag(b.getTag()):'normal';}));
 return styles.size===1?[...styles][0] as ParagraphStyle:'';
}
