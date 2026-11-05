import type {CSSProperties} from 'react';
export type OverlayRun={text:string;bold?:boolean;italic?:boolean};
export type ArtworkOverlay={text:string;runs?:OverlayRun[];x:number;y:number;size:number;color:string;fontFamily?:string;bold?:boolean;italic?:boolean;align?:'left'|'center'|'right';background?:'none'|'solid'|'circle'|'faded-circle';backgroundColor?:string;backgroundOpacity?:number;padding?:number;backgroundWidth?:number;backgroundHeight?:number;backgroundOffsetX?:number;backgroundOffsetY?:number};
export const isIllustration=(kind?:string)=>kind==='color-art'||kind==='bnw-art';
export function assertOverlay(value:unknown):asserts value is ArtworkOverlay|undefined {
 if(value===undefined)return;
 const v=value as ArtworkOverlay;
 const invalid=()=>{throw Error('Invalid artwork text overlay');};
 if(!v||typeof v.text!=='string'||v.text.length>2000||!/^#[0-9a-fA-F]{6}$/.test(v.color)||!([['x',-200,200],['y',-200,200],['size',8,120]] as const).every(([k,min,max])=>typeof v[k]==='number'&&Number.isFinite(v[k])&&v[k]>=min&&v[k]<=max))invalid();
 if(v.runs!==undefined){
  if(!Array.isArray(v.runs)||v.runs.length>2000)invalid();
  for(const r of v.runs!){if(!r||typeof r.text!=='string'||!r.text.length||Object.keys(r).some(k=>!['text','bold','italic'].includes(k))||(['bold','italic'] as const).some(k=>r[k]!==undefined&&typeof r[k]!=='boolean'))invalid();}
  if(v.runs!.map(r=>r.text).join('')!==v.text)invalid();
 }
 if(v.fontFamily!==undefined&&(typeof v.fontFamily!=='string'||! /^(Georgia|Arial|Verdana|Times New Roman|Bibliarch-font-[a-zA-Z0-9-]{1,80})$/.test(v.fontFamily)))invalid();
 for(const k of ['bold','italic'] as const)if(v[k]!==undefined&&typeof v[k]!=='boolean')invalid();
 if(v.align!==undefined&&!['left','center','right'].includes(v.align))invalid();
 if(v.background!==undefined&&!['none','solid','circle','faded-circle'].includes(v.background))invalid();
 if(v.backgroundColor!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(v.backgroundColor))invalid();
 for(const k of ['backgroundOffsetX','backgroundOffsetY'] as const)if(v[k]!==undefined&&(typeof v[k]!=='number'||!Number.isFinite(v[k])||Math.abs(v[k]!)>2000))invalid();
 for(const k of ['backgroundWidth','backgroundHeight'] as const)if(v[k]!==undefined&&(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]!<1||v[k]!>2000))invalid();
 for(const [k,max] of [['backgroundOpacity',1],['padding',64]] as const)if(v[k]!==undefined&&(typeof v[k]!=='number'||!Number.isFinite(v[k])||v[k]!<0||v[k]!>max))invalid();
}
export function overlayAppearance(v:ArtworkOverlay):CSSProperties {
 assertOverlay(v);return {position:'absolute',left:`${v.x}%`,top:`${v.y}%`,fontSize:`${v.size}px`,color:v.color,maxWidth:'85%',width:'max-content',whiteSpace:'pre-wrap',overflowWrap:'anywhere',lineHeight:1.2,zIndex:3,pointerEvents:'none',textAlign:v.align??'left',fontFamily:v.fontFamily??'Georgia',fontWeight:v.bold?700:400,fontStyle:v.italic?'italic':'normal',padding:'0px',boxSizing:'border-box',isolation:'isolate'};
}
export function overlayBackgroundAppearance(v:ArtworkOverlay):CSSProperties {
 assertOverlay(v);const kind=v.background??'none',color=v.backgroundColor??'#ffffff';const circle=kind==='circle'||kind==='faded-circle';
 const extra=2*(v.padding??0);
 return {position:'absolute',pointerEvents:'none',zIndex:-1,display:kind==='none'?'none':'block',left:`calc(50% + ${v.backgroundOffsetX??0}px)`,top:`calc(50% + ${v.backgroundOffsetY??0}px)`,width:v.backgroundWidth?`${v.backgroundWidth}px`:`calc(100% + ${extra}px)`,height:v.backgroundHeight?`${v.backgroundHeight}px`:circle?'auto':`calc(100% + ${extra}px)`,aspectRatio:circle&&!v.backgroundHeight?'1':undefined,transform:'translate(-50%, -50%)',borderRadius:circle?'50%':'12px',background:kind==='faded-circle'?`radial-gradient(ellipse closest-side, ${color} 0%, ${color} 40%, ${color}00 100%)`:color,opacity:v.backgroundOpacity??.85};
}
function css(style:CSSProperties){return Object.entries(style).filter(([,v])=>v!==undefined).map(([k,v])=>`${k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}:${v};`).join('');}
export function overlayStyle(v:ArtworkOverlay){return css(overlayAppearance(v));}
export function overlayBackgroundStyle(v:ArtworkOverlay){return css(overlayBackgroundAppearance(v));}
