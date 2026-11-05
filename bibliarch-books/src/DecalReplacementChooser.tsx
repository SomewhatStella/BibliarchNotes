'use client';
import {useEffect,useRef,useState} from 'react';
import {MODERN_ORNAMENTS,MODERN_CATEGORIES,decalSource,rasterSource,type Decal} from './design';
import type {Scene} from './model';

export default function DecalReplacementChooser({scenes,decal,onReplace,onClose}:{scenes:Scene[];decal:Decal;onReplace:(src:string,alt:string)=>void;onClose:()=>void}){
 const [category,setCategory]=useState('Fine-line');
 const done=useRef<HTMLButtonElement>(null);
 useEffect(()=>{done.current?.focus();},[]);
 // Snapshot uploads for this chooser session so replacing their last use does not remove a candidate.
 const [uploads]=useState(()=>Array.from(new Map(scenes.flatMap(s=>s.decals||[]).filter(d=>rasterSource(d.src)).map(d=>[d.src,{src:d.src,name:d.alt||'Uploaded ornament'}])).values()));
 const candidates=category==='Uploaded'?uploads:MODERN_ORNAMENTS.filter(d=>category==='Fine-line'||d.category===category).map(d=>({src:'builtin:'+d.id,name:d.name}));
 return <section role="dialog" aria-label="Replace ornament" aria-describedby="decal-replacement-help" className="decal-selection decal-replacement-chooser" onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
 <header><strong>Replace ornament</strong><button ref={done} type="button" onClick={onClose}>Done</button></header>
 <p id="decal-replacement-help">Try any design in the same spot. Size, color and placement stay unchanged.</p>
 <label>Replacement collection<select value={category} onChange={e=>setCategory(e.target.value)}>{[...MODERN_CATEGORIES,'Uploaded'].map(c=><option key={c}>{c}</option>)}</select></label>
 <div className="decal-replacement-grid">{candidates.map(d=><button type="button" key={d.src} aria-label={`Use ${d.name}`} aria-pressed={decal.src===d.src} onClick={()=>onReplace(d.src,d.name)}><img draggable={false} src={decalSource(d.src,decal.color)} alt=""/><span>{d.name}</span></button>)}</div>
 {category==='Uploaded'&&!uploads.length&&<p>Upload PNG, JPEG or WebP ornaments in Page design to reuse them here.</p>}
 <small>Click again to keep experimenting · Escape or Done to finish</small>
 <style>{`.decal-replacement-chooser{position:fixed;right:20px;top:110px;z-index:100;width:min(340px,calc(100vw - 32px));max-height:calc(100vh - 140px);overflow:auto;box-sizing:border-box;background:#fff;color:#292332;border:1px solid #b8afc5;border-radius:12px;box-shadow:0 8px 32px #20102b30;padding:14px;font:13px/1.4 Arial,sans-serif;pointer-events:auto}.decal-replacement-chooser header{display:flex;align-items:center;justify-content:space-between;gap:12px}.decal-replacement-chooser p{margin:10px 0}.decal-replacement-chooser label{display:grid;gap:4px}.decal-replacement-chooser select{width:100%;padding:6px}.decal-replacement-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.decal-replacement-grid button{display:grid;gap:5px;justify-items:center;padding:8px;background:#faf8fc;border:1px solid #ded7e6;border-radius:6px;color:inherit;font:12px/1.3 Arial,sans-serif;cursor:pointer}.decal-replacement-grid button[aria-pressed=true]{border-color:#8565bd;box-shadow:inset 0 0 0 1px #8565bd;background:#f0e9fa}.decal-replacement-grid img{width:100%;height:44px;object-fit:contain}.decal-replacement-chooser button:focus-visible{outline:2px solid #715394;outline-offset:2px}@media print{.decal-replacement-chooser{display:none!important}}`}</style>
 </section>;
}
