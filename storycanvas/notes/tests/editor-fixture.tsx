import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import CanvasView from '../src/components/CanvasView';
import NodeInspector from '../src/components/NodeInspector';
import type {StoryNode} from '../src/lib/types';
const initial = [{id:'folder-old',type:'folder',text:'Legacy folder',content:'Editable description',x:60,y:60,width:260,height:160},{id:'table',type:'table',text:'Table',x:60,y:300,width:360,height:220,tableData:[{Name:'Alice',Role:'Writer'}]}];
function Fixture(){
 const [nodes,setNodes]=useState<StoryNode[]>(initial as StoryNode[]); const [selected,setSelected]=useState<string|null>(null); const [inspector,setInspector]=useState<{id:string;x:number;y:number}|null>(null);
 const editNode=(id:string,patch:Partial<StoryNode>)=>setNodes(ns=>ns.map(n=>n.id===id?{...n,...patch}:n));
 const actions={editNode,moveNode:(id:string,x:number,y:number)=>editNode(id,{x,y}),resizeNode:(id:string,width:number,height:number)=>editNode(id,{width,height}),openNode:(n:StoryNode)=>{(window as any).opened=n.id},deleteNode:()=>{},lockNode:()=>{},unlockNode:()=>{}} as any;
 return <div className="editor-workspace" style={{height:'100vh'}}><div className="editor-canvas"><CanvasView canvas={{nodes,connections:[]} as any} allCharacters={[]} selectedId={selected} onSelect={setSelected} selectedConnId={null} onSelectConnection={()=>{}} actions={actions} gridSize={20} snap={false} onOpenInspector={(id,anchor)=>setInspector({id,...anchor})}/></div>{inspector&&<NodeInspector node={nodes.find(n=>n.id===inspector.id) as any} anchor={inspector} onChange={p=>editNode(inspector.id,p)} onClose={()=>setInspector(null)}/>}</div>
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
