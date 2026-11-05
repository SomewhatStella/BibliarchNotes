'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {sharedSession} from './shared-auth';

/*
 * Send feedback, tagged as a bug, a suggestion or general feedback. Works signed in or
 * out (Home is public); goes to the same `feedback` table the Notes admin page reads.
 * The tags map onto the table's existing types: bug, feature (suggestion), general.
 */
export const FEEDBACK_TYPES=[
 {value:'bug',label:'Bug',hint:'Something is broken or not working right',summary:'What went wrong?',example:'e.g. My picture disappeared after I reloaded',more:'What were you doing when it happened?'},
 {value:'feature',label:'Suggestion',hint:'An idea or something you wish it did',summary:'What would you like?',example:'e.g. Let me add footnotes to a page',more:'How would it help you?'},
 {value:'general',label:'General feedback',hint:'Anything else you want to tell us',summary:'What’s on your mind?',example:'e.g. The cover designer is lovely',more:''},
] as const;
type Kind=(typeof FEEDBACK_TYPES)[number]['value'];
const DRAFT='bibliarch-feedback-draft-v2';
type Draft={type:Kind;summary:string;details:string;steps:string};
const empty:Draft={type:'bug',summary:'',details:'',steps:''};
const Icon={
 bug:<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 9a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0z"/><path d="M12 9v9M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2M10 5 9 3M14 5l1-2"/></svg>,
 feature:<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>,
 general:<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
};

export default function BugReport({userId}:{userId?:string}){
 const draftKey=`${DRAFT}:${userId??'guest'}`;
 const [open,setOpen]=useState(false),[draft,setDraft]=useState<Draft>(empty),[status,setStatus]=useState<'idle'|'sending'|'sent'>('idle'),[error,setError]=useState('');
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{try{const d=JSON.parse(localStorage.getItem(draftKey)||'null');if(d&&FEEDBACK_TYPES.some(t=>t.value===d.type)&&['summary','details','steps'].every(k=>typeof d[k]==='string'))setDraft(d);}catch{}},[draftKey]);
 useEffect(()=>{const d=ref.current;if(open&&d&&!d.open)d.showModal();},[open]);
 const kind=FEEDBACK_TYPES.find(t=>t.value===draft.type)!;
 function change<K extends keyof Draft>(key:K,value:Draft[K]){const next={...draft,[key]:value};setDraft(next);setError('');try{localStorage.setItem(draftKey,JSON.stringify(next));}catch{}}
 async function submit(){
  if(!draft.summary.trim()){setError('Write a short summary first.');return;}
  setStatus('sending');setError('');
  try{
   const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
   if(!url||!key)throw new Error('offline');
   const session=await sharedSession().catch(()=>null);
   if(userId&&session?.user.id!==userId)throw new Error('Account changed');
   const description=[draft.details.trim(),draft.steps.trim()&&kind.more&&`${kind.more}\n${draft.steps.trim()}`].filter(Boolean).join('\n\n')||draft.summary.trim();
   const res=await fetch(`${url}/rest/v1/feedback`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${session?.access_token??key}`,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({
    user_id:session?.user.id??null,user_email:session?.user.email??null,type:draft.type,title:draft.summary.trim().slice(0,200),description:description.slice(0,10000),
    page_url:location.href,browser_info:navigator.userAgent,screen_size:`${screen.width}x${screen.height}`}),signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw new Error(String(res.status));
   setStatus('sent');setDraft({...empty,type:draft.type});try{localStorage.removeItem(draftKey);}catch{}
  }catch{
   setStatus('idle');
   setError('Your message couldn’t be sent right now. It’s saved here, so you can try again in a moment.');
  }
 }
 const close=()=>{ref.current?.close();setOpen(false);if(status==='sent')setStatus('idle');};
 return <><button className="feedback-button" aria-label="Send feedback" title="Send feedback" onClick={()=>setOpen(true)}>{Icon.general}</button>{open&&createPortal(<dialog ref={ref} className="feedback-dialog" aria-label="Send feedback" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <div className="fb-head"><h2>Send feedback</h2><button type="button" className="fb-close" aria-label="Close" onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
  {status==='sent'?<div className="fb-sent"><span className="fb-sent-icon" aria-hidden="true">✓</span><p><strong>Thank you!</strong> We read every message.</p><div className="fb-actions"><button type="button" className="fb-primary" onClick={close}>Done</button></div></div>:
  <form className="fb-form" onSubmit={e=>{e.preventDefault();void submit();}}>
   <div className="fb-types" role="radiogroup" aria-label="Kind of feedback">
    {FEEDBACK_TYPES.map(t=><button key={t.value} type="button" role="radio" aria-checked={draft.type===t.value} className={draft.type===t.value?'on':''} onClick={()=>change('type',t.value)}>{Icon[t.value]}<strong>{t.label}</strong><small>{t.hint}</small></button>)}
   </div>
   <label><span className="fb-label">{kind.summary}</span><input maxLength={180} value={draft.summary} placeholder={kind.example} onChange={e=>change('summary',e.target.value)}/></label>
   <label><span className="fb-label">Tell us more <span className="fb-optional">(optional)</span></span><textarea rows={4} maxLength={5000} value={draft.details} onChange={e=>change('details',e.target.value)}/></label>
   {kind.more&&<label><span className="fb-label">{kind.more} <span className="fb-optional">(optional)</span></span><textarea rows={2} maxLength={5000} value={draft.steps} onChange={e=>change('steps',e.target.value)}/></label>}
   <p className="fb-note">Only what you type here is sent, never your books or notes.</p>
   {error&&<p role="alert" className="fb-error">{error}</p>}
   <div className="fb-actions"><button type="button" className="fb-cancel" onClick={close}>Cancel</button><button className="fb-primary" disabled={status==='sending'||!draft.summary.trim()}>{status==='sending'?'Sending…':'Send'}</button></div>
  </form>}
 </dialog>,document.body)}</>;
}
