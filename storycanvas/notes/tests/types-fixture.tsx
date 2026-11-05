import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import CustomTypesDialog from '../src/components/CustomTypesDialog';
import Sidebar from '../src/components/Sidebar';
import NodeCard from '../src/components/NodeCard';
import {instantiateTemplate} from '../src/lib/custom-templates';
const nodes:any[]=[{id:'rae',type:'character',text:'Rae',x:100,y:60,width:320,height:72},{id:'place',type:'location',text:'Harbor',x:100,y:190,width:320,height:72},{id:'t',type:'table',x:100,y:330,width:320,height:130,tableData:[{Name:'Rae',Role:'Writer'}]}];
function Fixture(){const [open,setOpen]=useState(false);return <div><Sidebar onManageTypes={()=>setOpen(true)} onAddNode={()=>{}} connectMode={false} onToggleConnectMode={()=>{}} onBackToDashboard={()=>{}} collapsed={false} onToggleCollapsed={()=>{}}/>{nodes.map(n=><NodeCard key={n.id} node={n} allNodes={nodes} allCharacters={[]} selected={false} actions={{openNode:()=>{},editNode:()=>{}} as any} onMouseDownMove={()=>{}} onMouseDownResize={()=>{}} onSelect={()=>{}} onStartConnect={()=>{}} onOpenInspector={()=>{}}/>)}{open&&<CustomTypesDialog canvas={{nodes,connections:[]} as any} canvases={{}} onClose={()=>setOpen(false)} onCreate={t=>{(window as any).instance=instantiateTemplate(t);setOpen(false)}}/>}</div>};createRoot(document.getElementById('root')!).render(<Fixture/>);
