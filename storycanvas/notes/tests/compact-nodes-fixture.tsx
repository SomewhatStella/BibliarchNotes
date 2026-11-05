import React from 'react';
import {createRoot} from 'react-dom/client';
import NodeCard from '../src/components/NodeCard';
import {DEFAULT_SIZE, type StoryNode} from '../src/lib/types';
const specs = [
  ['character', 'Character', 320, 72], ['location', 'Location', 320, 72],
  ['folder', 'Folder', 300, 139], ['folder', 'Small saved folder', 220, 100],
  ['character', 'Small saved character', 240, 58], ['location', 'Tall saved location', 280, 110],
] as const;
const nodes: StoryNode[] = specs.map(([type,text,width,height],i)=>({id:String(i),type,text,content:'Saved description',x:40+(i%2)*380,y:40+Math.floor(i/2)*190,width,height}));
const state = {nodes, defaults:DEFAULT_SIZE, opened:[] as string[], writes:0, moves:0};
(window as any).compactState=state;
const actions:any={openNode:(n:StoryNode)=>state.opened.push(n.id),editNode:()=>state.writes++,lockNode:()=>{},unlockNode:()=>{}};
createRoot(document.getElementById('root')!).render(<>{nodes.map(node=><NodeCard key={node.id} node={node} allNodes={nodes} allCharacters={[]} selected={false} actions={actions} onMouseDownMove={()=>state.moves++} onMouseDownResize={()=>{}} onSelect={()=>{}} onStartConnect={()=>{}} onOpenInspector={()=>{}}/>)}</>);
