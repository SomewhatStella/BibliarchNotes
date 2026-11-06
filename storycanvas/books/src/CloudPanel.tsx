'use client';
import {useEffect,useRef,useState} from 'react';
import {BooksCloudClient,type CloudProject} from './cloud';
import {sharedSession} from './shared-auth';
import {parseLibrary} from './model';
import {cloudOpenDecision,type CloudBaseline} from './cloud-sync';
import {askConfirm} from './AskDialog';

/** Plain-language reason a save to the account failed; the work on this device is always kept. */
export function saveTrouble(e:unknown){
 const m=e instanceof Error?e.message:String(e);
 const offline=(typeof navigator!=='undefined'&&navigator.onLine===false)||/failed to fetch|network|timeout|aborted/i.test(m);
 const signedOut=/jwt|401|403|session|sign/i.test(m);
 const why=offline?'You seem to be offline.':signedOut?'You may have been signed out.':'Something went wrong on our side.';
 return `Couldn’t save to your account. ${why} Your work is safe on this device. Try again in a moment.`;
}
/** No separate account UI: session and owner come from the shared gate. */
export default function CloudPanel({library,userId,deviceFresh,onLoad,onStatus}:{library:any;userId:string;deviceFresh:boolean;onLoad:(library:any)=>void;onStatus:(status:string)=>void}){
 const [client]=useState(()=>new BooksCloudClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{ownerId:userId,sessionProvider:sharedSession}));
 const [current,setCurrent]=useState<CloudProject|null>(null),[baseline,setBaseline]=useState(''),[status,setStatus]=useState('Opening your library…');
 const [paused,setPaused]=useState(false),[busy,setBusy]=useState(false),[choices,setChoices]=useState<CloudProject[]>([]);
 const live=useRef(library),loader=useRef(onLoad),alive=useRef(false),lock=useRef(false);live.current=library;loader.current=onLoad;
 const markerKey=`bibliarch-books-sync:${userId}`;
 // Comparing the whole library as text is expensive on big books, so it happens once
 // per pause in typing (inside the save timer), never on every keystroke.
 const checked=useRef<any>(null);const [pending,setPending]=useState(false);
 const changed=!!current&&(library!==checked.current||pending);
 const label=paused?status:changed?(busy?'Saving…':'Unsaved changes'):status;
 // The masthead gets a short word; the full explanation appears once, in the notice below.
 const short=paused?(choices.length?'Needs your choice':'Not saved to your account'):label;
 useEffect(()=>onStatus(short),[short,onStatus]);
 function remember(p:CloudProject,snapshot:string){try{localStorage.setItem(markerKey,JSON.stringify({id:p.id,version:p.version,snapshot}));}catch{/* Missing baseline pauses reconciliation next time, never overwrites. */}}
 function accept(p:CloudProject,snapshot:string){checked.current=live.current;setPending(false);setCurrent(p);setBaseline(snapshot);remember(p,snapshot);setPaused(false);setChoices([]);setStatus('All changes saved');}
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);try{await fn();}catch(e){if(alive.current){setPaused(true);setStatus(saveTrouble(e));}}finally{lock.current=false;if(alive.current)setBusy(false);}}
 async function open(id:string,explicit=false){
  const before=JSON.stringify(live.current),p=await client.loadProject(id);if(!alive.current)return;
  const validated=parseLibrary(JSON.stringify(p.content)),remote=JSON.stringify(validated),local=JSON.stringify(live.current);
  let marker:(CloudBaseline&{id:string})|null=null;try{marker=JSON.parse(localStorage.getItem(markerKey)||'null');}catch{}
  const decision=explicit&&before===local?'load':cloudOpenDecision(deviceFresh,before===local,local,remote,marker?.id===id?marker:null,p.version);
  if(decision==='conflict') {setChoices([p]);setPaused(true);setStatus('The copy on this device is different from the one saved in your account. Nothing has been replaced. Download a backup first, then choose which to keep.');return;}
  if(decision==='load'){
   // If retaining recovery fails, do not replace even an explicitly selected draft.
   if(local!==remote)localStorage.setItem(`bibliarch-books-recovery:${userId}:${Date.now()}`,local);
   loader.current(validated);
  }
  accept(p,remote);
 }
 async function connect(){
  const rows=await client.listProjects();if(!alive.current)return;
  if(rows.length===0){const snapshot=structuredClone(live.current);const p=await client.createProject('My Bibliarch library',snapshot);if(alive.current)accept(p,JSON.stringify(snapshot));}
  else if(rows.length===1)await open(rows[0].id);
  else {let id:string|undefined;try{id=JSON.parse(localStorage.getItem(markerKey)||'null')?.id;}catch{}if(rows.some(p=>p.id===id))await open(id!);else{setChoices(rows);setPaused(true);setStatus('You have more than one saved library. Choose which one to open. Your work on this device is kept.');}}
 }
 useEffect(()=>{alive.current=true;void run(connect);return()=>{alive.current=false;};},[client]);
 useEffect(()=>{if(!current||paused||busy||!changed)return;const timer=setTimeout(()=>{
  checked.current=live.current;
  if(JSON.stringify(live.current)===baseline){setPending(false);return;}
  setPending(true);
  void run(async()=>{const snapshot=structuredClone(live.current),p=await client.saveProject(current.id,current.version,snapshot);if(alive.current)accept(p,JSON.stringify(snapshot));});
 },1000);return()=>clearTimeout(timer);},[library,current,paused,busy,changed,baseline]);
 // No leave-page warning for the account copy: the work is always saved on this device first, and the
 // account copy catches up on the next visit. (The device save has its own warning for real failures.)
 if(!paused)return null;
 return <div className="cloud-notice"><span role="status">{label}</span>{paused&&<button disabled={busy} onClick={()=>void run(connect)}>Try again</button>}{choices.map(p=><button disabled={busy} key={p.id} onClick={async()=>{if(await askConfirm({title:`Open ${p.name}?`,message:'This replaces the draft you’re looking at. A recovery copy is kept first.',confirmLabel:'Open'}))void run(()=>open(p.id,true));}}>Open {p.name}</button>)}</div>;
}
