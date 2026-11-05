'use client';
import type {Scene} from './model';
import {reviewHunks,resolveHunk,resolveTracked} from './review';
export default function ChangeReview({scene,onChange}:{scene:Scene;onChange:(scene:Scene)=>void}){
 const hunks=reviewHunks(scene);
 if(!scene.suggestion)return null;
 return <section aria-label="Revision comparison"><h3>Your edits on this page</h3><p>Keep an edit, or undo it to go back to what you had before.</p>
 <button onClick={()=>onChange(resolveTracked(scene,true))}>Keep all edits</button> <button onClick={()=>onChange(resolveTracked(scene,false))}>Undo all edits</button>
 {hunks.map((h,i)=><article key={h.id}><h4>Edit {i+1}{h.kind==='structure'?' · page layout':` · paragraph ${h.block+1}`}</h4><div style={{whiteSpace:'pre-wrap'}}><del aria-label="Original">{h.before||'(empty)'}</del>{' → '}<ins aria-label="Proposed">{h.after||'(empty)'}</ins></div>{h.before===h.after&&<p>Only the formatting changed (bold, italics, size and so on).</p>}<button aria-label={`Accept change ${i+1}`} onClick={()=>onChange(resolveHunk(scene,h.id,true))}>Keep</button> <button aria-label={`Reject change ${i+1}`} onClick={()=>onChange(resolveHunk(scene,h.id,false))}>Undo</button></article>)}
 </section>;
}
