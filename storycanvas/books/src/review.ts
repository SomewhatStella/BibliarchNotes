import type {SerializedEditorState} from 'lexical';
import type {Scene} from './model';
export function documentText(content:SerializedEditorState):string{const walk=(n:any):string=>n.type==='text'?n.text:(n.children||[]).map(walk).join(n.type==='root'?'\n\n':'');return walk(content.root);}
export function editTracked(scene:Scene,content:SerializedEditorState,tracking:boolean):Scene{if(JSON.stringify(content)===JSON.stringify(scene.content))return scene;return {...scene,content,suggestion:scene.suggestion||(tracking?{before:structuredClone(scene.content),at:new Date().toISOString()}:undefined)};}
export function resolveTracked(scene:Scene,accept:boolean):Scene{if(!scene.suggestion)return scene;const {suggestion,...rest}=scene;return {...rest,content:accept?scene.content:structuredClone(suggestion.before)};}
const json=JSON.stringify;
const metadata=(n:any)=>{const {children,...rest}=n;return rest;};
const tokens=(n:any):any[]=>n.children.flatMap((t:any)=>(t.text.match(/\s+|[^\s]+/gu)||['']).map((text:string)=>({...t,text})));
export type ReviewHunk={id:string;kind:'inline'|'structure';block:number;before:string;after:string;oldNodes:any[];newNodes:any[];a:number;b:number;endA:number;endB:number};
// Exact snapshot identity prevents applying a stale button action after another edit.
export function reviewHunks(scene:Scene):ReviewHunk[]{
 if(!scene.suggestion)return [];
 const old:any=scene.suggestion.before,next:any=scene.content;
 if(json(old)===json(next))return [];
 const stamp=json([old,next]);
 const structure=():ReviewHunk[]=>[{id:stamp,kind:'structure',block:-1,before:documentText(old),after:documentText(next),oldNodes:[old.root],newNodes:[next.root],a:0,b:0,endA:0,endB:0}];
 const x=old.root.children,y=next.root.children;
 if(json(metadata(old.root))!==json(metadata(next.root))||x.length!==y.length)return structure();
 if(x.some((p:any,i:number)=>json(metadata(p))!==json(metadata(y[i]))||!Array.isArray(p.children)||!Array.isArray(y[i].children)||[...p.children,...y[i].children].some((t:any)=>t.type!=='text'||t.mode!=='normal')))return structure();
 const result:ReviewHunk[]=[];
 for(let block=0;block<x.length;block++){
  const a=tokens(x[block]),b=tokens(y[block]);
  // Bound quadratic diff memory; large or complex edits are explicitly structural.
  if(a.length*b.length>250000)return structure();
  const ak=a.map(v=>json(v)),bk=b.map(v=>json(v));
  const dp=Array.from({length:a.length+1},()=>new Uint32Array(b.length+1));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)dp[i][j]=ak[i]===bk[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  let i=0,j=0;
  while(i<a.length||j<b.length){
   if(i<a.length&&j<b.length&&ak[i]===bk[j]){i++;j++;continue;}
   const startA=i,startB=j;
   while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&ak[i]===bk[j])break;if(j<b.length&&(i===a.length||dp[i][j+1]>=dp[i+1][j]))j++;else i++;}
   const oldNodes=a.slice(startA,i),newNodes=b.slice(startB,j);
   result.push({id:stamp+':'+block+':'+startA+':'+startB,kind:'inline',block,before:oldNodes.map(n=>n.text).join(''),after:newNodes.map(n=>n.text).join(''),oldNodes,newNodes,a:startA,b:startB,endA:i,endB:j});
  }
 }
 // Serialization-only node boundaries are not a user-visible edit; preserve those via whole resolution.
 return result.length?result:structure();
}
export function resolveHunk(scene:Scene,id:string,accept:boolean):Scene{
 const h=reviewHunks(scene).find(h=>h.id===id);if(!h||!scene.suggestion)return scene;
 if(h.kind==='structure')return resolveTracked(scene,accept);
 const content:any=structuredClone(scene.content),before:any=structuredClone(scene.suggestion.before);
 const target=accept?before:content,block=target.root.children[h.block],list=tokens(block);
 list.splice(accept?h.a:h.b,accept?h.endA-h.a:h.endB-h.b,...structuredClone(accept?h.newNodes:h.oldNodes));
 // Merge only identical node metadata. Every style/format/detail property survives.
 block.children=list.reduce((out:any[],node:any)=>{const last=out[out.length-1];if(last&&json({...last,text:''})===json({...node,text:''}))last.text+=node.text;else out.push(node);return out;},[]);
 const updated={...scene,content,suggestion:{...scene.suggestion,before}};
 const remaining=reviewHunks(updated);
 if(!remaining.length)return resolveTracked(updated,true);
 // Equal rich token streams with only equivalent text-node splitting need no pending review.
 if(remaining.length===1&&remaining[0].kind==='structure'&&json({...before,root:{...before.root,children:before.root.children.map((p:any)=>({...p,children:tokens(p)}))}})===json({...content,root:{...content.root,children:content.root.children.map((p:any)=>({...p,children:tokens(p)}))}}))return resolveTracked(updated,true);
 return updated;
}
