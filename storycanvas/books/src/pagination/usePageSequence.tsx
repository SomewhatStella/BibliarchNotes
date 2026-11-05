'use client';
import {useEffect,useState} from 'react';
import type {Book} from '../model';
export function usePageSequence(book:Book|undefined,epoch:number){
 const [counts,setCounts]=useState<Record<string,number>>({});
 useEffect(()=>{const root=document.querySelector('.document-scroller');if(!root)return;let frame=0;const measure=()=>{frame=0;const next:Record<string,number>={};root.querySelectorAll<HTMLElement>('.paginated-source').forEach(el=>next[el.id.slice(5)]=Math.max(1,el.querySelectorAll('.pagination-page').length));setCounts(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);};const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(measure)});observer.observe(root,{childList:true,subtree:true});measure();return()=>{observer.disconnect();cancelAnimationFrame(frame)}},[book?.id,epoch]);
 const starts:Record<string,number>={},blanks:Record<string,boolean>={};let next=1;
 for(const c of book?.chapters||[])for(const s of c.scenes){if(book?.appearance.recto&&s.template==='chapter-title'&&next%2===0){blanks[s.id]=true;next++;}starts[s.id]=next;next+=counts[s.id]||1;}
 return {starts,blanks,total:next-1};
}
