import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
const src=readFileSync('src/components/StoryBoard.tsx','utf8');
const method=src.match(/    openNode\(node: StoryNode\) \{([\s\S]*?)\n    \},/)[1];
for(const type of ['folder','character','location'])for(const explicit of [false,true])test(`${type} ${explicit?'explicit':'legacy'} canvas navigation`,()=>{let opened,crumbs,cleared;const store={canvases:{},ensureCanvas:id=>opened=id,addNode(){},addConnection(){}};const readOnly=true;const node={id:'old-123',type,text:'Child',...(explicit?{linkedCanvasId:'saved-special-id'}:{})};const js=ts.transpile(`(function(node,store,setCrumbs,setSelectedId,setSelectedConnId,setInspectorAnchor,readOnly){${method}})`,{target:ts.ScriptTarget.ES2020});const fn=eval(js);fn(node,store,f=>crumbs=f([]),()=>{},()=>{},()=>cleared=true,readOnly);assert.equal(opened,explicit?'saved-special-id':`${type}-canvas-old-123`);assert.equal(crumbs[0].canvasType,opened);});
