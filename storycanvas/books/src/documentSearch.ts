import type {Scene} from './model';
import {documentText} from './review';
import {isIllustration} from './artwork';
export function searchDocument(scenes:Scene[],query:string){
 const needle=query.trim().toLowerCase();if(!needle)return [];
 return scenes.flatMap(scene=>{
  const text=isIllustration(scene.template)?scene.overlay?.text||'':documentText(scene.content);
  const normalized=text.toLowerCase(),index=normalized.indexOf(needle);if(index<0)return [];
  let count=0,at=0;while((at=normalized.indexOf(needle,at))!==-1){count++;at+=needle.length;}
  const start=Math.max(0,index-45),end=Math.min(text.length,index+needle.length+65);
  return [{scene,index,count,before:(start?'…':'')+text.slice(start,index),match:text.slice(index,index+needle.length),after:text.slice(index+needle.length,end)+(end<text.length?'…':'')}];
 });
}
