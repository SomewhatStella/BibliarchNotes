'use client';
import {useEffect,useState} from 'react';
import Studio from '../app/BooksStudio';
import {sharedAuth,sharedSession} from './shared-auth';
import type {CloudSession} from './cloud';
import './shared-account.css';
import LoadingScreen from './LoadingScreen';
import BugReport from './BugReport';
import {createPortal} from 'react-dom';
export default function SharedAccount(){
 const [session,setSession]=useState<CloudSession|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
 const [mode,setMode]=useState<'login'|'signup'>('login'),[pending,setPending]=useState(false);
 // Signed out, the header still gets Send feedback (signed in, the library or editor adds its own).
 const [slot,setSlot]=useState<HTMLElement|null>(null);useEffect(()=>setSlot(document.getElementById('site-nav-tools')),[]);
 useEffect(()=>{
  let live=true,serial=0;
  async function check(){const ticket=++serial;try{const next=await sharedSession();if(live&&ticket===serial){setSession(next);setError('');setReady(true);}}catch(e){if(live&&ticket===serial){setSession(null);setReady(true);setError((e as Error).message);}}}
  void check();let unsubscribe=()=>{};
  try{const {data}=sharedAuth().auth.onAuthStateChange(()=>{queueMicrotask(()=>void check());});unsubscribe=()=>data.subscription.unsubscribe();}catch{}
  const focus=()=>void check();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  // Cookies changed by a Notes server action do not emit storage/auth events.
  const timer=setInterval(focus,5000);
  return()=>{live=false;serial++;unsubscribe();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[]);
 async function submit(form:FormData){
  setPending(true);setError('');
  try{
   const auth=sharedAuth().auth,email=String(form.get('email')),password=String(form.get('password'));
   const result=mode==='login'?await auth.signInWithPassword({email,password}):await auth.signUp({email,password,options:{data:{username:String(form.get('username'))}}});
   if(result.error)throw result.error;
   if(!result.data.session)throw Error("Your account was created but couldn't be activated automatically. Try logging in directly.");
   if(mode==='signup'&&result.data.user)await sharedAuth().from('profiles').upsert({id:result.data.user.id,username:String(form.get('username')),email});
   setSession(await sharedSession());
  }catch(e){setError((e as Error).message);}finally{setPending(false);}
 }
 if(!ready)return <LoadingScreen message="Opening your books…"/>;
 if(session)return <Studio key={session.user.id} userId={session.user.id}/>;
 return <main className="shared-account">{slot&&createPortal(<BugReport/>,slot)}<section><p className="eyebrow">BIBLIARCH · BOOKS</p><h1>{mode==='login'?'Welcome back':'Create your account'}</h1><p>One account for Notes and Books.</p>
 <form action={submit}>{mode==='signup'&&<label>Username<input name="username" required autoComplete="username"/></label>}<label>Email<input name="email" type="email" required autoComplete="email"/></label><label>Password<input name="password" type="password" required minLength={6} autoComplete={mode==='login'?'current-password':'new-password'}/></label>{error&&<p role="alert">{error}</p>}<button className="primary" disabled={pending}>{pending?'One moment…':mode==='login'?'Log in':'Create account'}</button></form>
 <button className="switch-mode" disabled={pending} onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');}}>{mode==='login'?"New here? Create an account":"Already have an account? Log in"}</button></section></main>;
}
