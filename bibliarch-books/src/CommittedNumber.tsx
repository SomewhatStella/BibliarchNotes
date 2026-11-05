"use client";
import {useEffect,useState} from 'react';
/** Keep incomplete edits local; only valid, bounded numbers reach the manuscript. */
export default function CommittedNumber({value,min,max,step=1,onCommit,...props}:{value:number;min:number;max:number;step?:number;onCommit:(value:number)=>void;'aria-label'?:string}){
 const [draft,setDraft]=useState(String(value));
 useEffect(()=>setDraft(String(value)),[value]);
 function commit(){const parsed=draft.trim()===''?value:Number(draft);const next=Number.isFinite(parsed)?Math.max(min,Math.min(max,parsed)):value;setDraft(String(next));if(next!==value)onCommit(next);}
 return <input {...props} type="number" min={min} max={max} step={step} value={draft} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){e.stopPropagation();setDraft(String(value));}}}/>;
}
