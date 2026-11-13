import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
function load(path){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
const L=load('src/lib/character-links.ts');
const row=(ct,nodes)=>({id:ct,story_id:'s',canvas_type:ct,nodes,connections:[],palette:null,updated_at:''});
const mira={id:'mira',type:'character',text:'Mira',content:'A thief',linkedCanvasId:'canvas-mira',x:0,y:0,width:320,height:72};
const folder={id:'cast',type:'folder',text:'Cast',linkedCanvasId:'canvas-cast',x:0,y:0,width:300,height:139};
const link={id:'l1',type:'character',text:'Mira',refNodeId:'mira',linkedCanvasId:'canvas-mira',x:0,y:0,width:320,height:72};
const link2={...link,id:'l2'};
const canvases={main:row('main',[folder,link]),'canvas-cast':row('canvas-cast',[mira]),'canvas-x':row('canvas-x',[link2])};

test('a new link copies the original and opens its board',()=>{
  const f=L.linkFields(mira);
  assert.equal(f.refNodeId,'mira');assert.equal(f.linkedCanvasId,'canvas-mira');assert.equal(f.text,'Mira');assert.equal(f.content,'A thief');assert.equal(f.id,undefined);
});
test('renaming a link renames the original and every other link',()=>{
  const ups=L.linkedEdits(canvases,'l1',{text:'Mirabel',x:5});
  assert.deepEqual(ups.map(u=>[u.canvasType,u.nodeId]),[['canvas-cast','mira'],['canvas-x','l2']]);
  assert.deepEqual(ups[0].patch,{text:'Mirabel'});
});
test('renaming the original updates its links; unrelated edits need nothing',()=>{
  assert.deepEqual(L.linkedEdits(canvases,'mira',{text:'M'}).map(u=>u.nodeId),['l1','l2']);
  assert.deepEqual(L.linkedEdits(canvases,'mira',{x:3}),[]);
});
test('a link whose original was deleted only changes itself',()=>{
  const gone={main:row('main',[link]),'canvas-x':row('canvas-x',[link2])};
  assert.deepEqual(L.linkedEdits(gone,'l1',{text:'x'}),[]);
});
test('the picker lists originals only, with where they live',()=>{
  const list=L.linkableCards(canvases);
  assert.deepEqual(list.map(c=>[c.node.id,c.board]),[['mira','Cast']]);
  assert.equal(L.boardLabel(canvases,'main'),'the main board');
});
test('getAllCharacters skips linked cards (no duplicates in pickers)',()=>{
  assert.match(readFileSync('src/lib/store.ts','utf8'),/n\.type === "character" && !n\.refNodeId/);
});
