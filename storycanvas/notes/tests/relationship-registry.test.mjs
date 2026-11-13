import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
function load(path){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
const R=load('src/lib/relationship-registry.ts');
const tie=(id,a,b,extra={})=>({id,fromCharacterId:a,toCharacterId:b,relationshipType:'friends',strength:2,label:'friends',isBidirectional:true,...extra});
const map=(id,people,rels=[])=>({id,type:'relationship-canvas',text:id,x:0,y:0,width:600,height:400,relationshipData:{selectedCharacters:people.map(p=>({id:p,name:p,position:{x:0,y:0}})),relationships:rels}});
const row=(ct,nodes)=>({id:ct,story_id:'s',canvas_type:ct,nodes,connections:[],palette:null,updated_at:''});

test('migration imports every per-map tie and keeps both labels on a conflict',()=>{
  const a=map('A',['x','y','z'],[tie('r1','x','y',{label:'sisters'}),tie('r2','y','z')]);
  const b=map('B',['x','y'],[tie('r3','y','x',{label:'rivals',notes:'since school'})]);
  const {registry,changed}=R.migrateLegacy(null,[a,b]);
  assert.equal(changed,true);
  assert.equal(registry.relationships.length,2);
  const xy=registry.relationships.find(r=>R.pairKey(r.fromCharacterId,r.toCharacterId)===R.pairKey('x','y'));
  assert.equal(xy.label,'sisters / rivals');
  assert.equal(xy.notes,'since school');
  assert.deepEqual(new Set(registry.importedIds),new Set(['r1','r2','r3']));
});

test('migration is idempotent and never resurrects a deleted tie from a stale map copy',()=>{
  const a=map('A',['x','y'],[tie('r1','x','y')]);
  const first=R.migrateLegacy(null,[a]).registry;
  const again=R.migrateLegacy(first,[a]);
  assert.equal(again.changed,false);
  const deleted=R.applyMapEdit(first,[first.relationships[0]],[],'2026-11-12T00:00:00Z');
  assert.equal(deleted.relationships.length,0);
  const reload=R.migrateLegacy(deleted,[a]);
  assert.equal(reload.changed,false);
  assert.equal(reload.registry.relationships.length,0);
});

test('newest timestamp wins when both copies have one',()=>{
  const old=tie('r1','x','y',{label:'old',updatedAt:'2026-01-01T00:00:00Z'});
  const fresh=tie('r9','y','x',{label:'new',updatedAt:'2026-06-01T00:00:00Z'});
  const m=R.mergeTie(old,fresh);assert.equal(m.label,'new');assert.equal(m.id,'r1');
  assert.equal(R.mergeTie(fresh,old).label,'new');
  // A registry edit (timestamped) beats an untimestamped legacy copy.
  assert.equal(R.mergeTie(fresh,tie('r2','x','y',{label:'legacy'})).label,'new');
});

test('a tie edited in one map shows in every map that has both people',()=>{
  const a=map('A',['x','y','z']),b=map('B',['x','y']),c=map('C',['x','z']);
  let reg=R.emptyRegistry();
  const created=tie('t1','x','y',{label:'married'});
  reg=R.applyMapEdit(reg,[],[created],'2026-11-12T01:00:00Z');
  assert.deepEqual(R.tiesAmong(reg,R.memberIdsOf(b)).map(t=>t.label),['married']);
  assert.deepEqual(R.tiesAmong(reg,R.memberIdsOf(c)),[]);
  const visibleInB=R.tiesAmong(reg,R.memberIdsOf(b));
  reg=R.applyMapEdit(reg,visibleInB,[{...visibleInB[0],label:'divorced'}],'2026-11-12T02:00:00Z');
  assert.equal(R.tiesAmong(reg,R.memberIdsOf(a))[0].label,'divorced');
  assert.equal(R.tiesAmong(reg,R.memberIdsOf(a))[0].updatedAt,'2026-11-12T02:00:00Z');
  const maps=[{canvasType:'main',node:a},{canvasType:'main',node:b},{canvasType:'f',node:c}];
  assert.deepEqual(R.mapsSharingTies(maps,'A',R.tiesAmong(reg,R.memberIdsOf(a))).map(m=>m.node.id),['B']);
});

test('editing only touches ties the map shows; changing the pair replaces it',()=>{
  let reg=R.emptyRegistry();
  reg=R.applyMapEdit(reg,[],[tie('t1','x','y'),tie('t2','y','z')],'t0');
  const inB=R.tiesAmong(reg,new Set(['x','y']));
  reg=R.applyMapEdit(reg,inB,[],'t1'); // B removes x-y
  assert.deepEqual(reg.relationships.map(r=>r.id),['t2']);
  reg=R.applyMapEdit(reg,[reg.relationships[0]],[{...reg.relationships[0],toCharacterId:'x'}],'t2');
  assert.deepEqual(reg.relationships.map(r=>R.pairKey(r.fromCharacterId,r.toCharacterId)),[R.pairKey('x','y')]);
});

test('registry is read from its own hidden row; maps there are ignored and bad ties dropped',()=>{
  const reg={version:1,relationships:[tie('ok','a','b'),tie('self','a','a'),{id:'broken'}],importedIds:['ok']};
  const canvases={main:row('main',[map('A',['a','b'])]),[R.REGISTRY_CANVAS]:row(R.REGISTRY_CANVAS,[R.registryNode(reg)])};
  assert.deepEqual(R.readRegistry(canvases).relationships.map(r=>r.id),['ok']);
  assert.deepEqual(R.findMaps(canvases).map(m=>m.node.id),['A']);
  assert.equal(R.readRegistry({main:row('main',[])}),null);
});
