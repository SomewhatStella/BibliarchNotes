"use client";
import Editor from '../Editor';
import {useState} from 'react';
const initial:any={root:{type:'root',version:1,format:'',indent:0,direction:null,children:[{type:'paragraph',version:1,format:'',indent:0,direction:null,textFormat:0,textStyle:'',children:[{type:'text',version:1,text:'Start here.',format:0,style:'',detail:0,mode:'normal'}]}]}};
export default function Harness(){const [content,setContent]=useState(initial);const [key,setKey]=useState(0);return <div style={{font:'16px/24px Georgia'}}><button onClick={()=>setKey(key+1)}>Reload source</button><textarea aria-label="source" readOnly value={JSON.stringify(content)}/><Editor key={key} content={content} onChange={setContent} onError={e=>{throw e}} pageMetrics={{widthPx:440,heightPx:400,marginPx:40,header:'Header',footer:'Page {page}'}}/></div>}
