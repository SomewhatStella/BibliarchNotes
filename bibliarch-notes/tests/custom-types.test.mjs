import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';
const path='src/lib/custom-templates.ts';
function load(){const exports={};new Function('exports',ts.transpile(readFileSync(path,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}))(exports);return exports;}
test('template instances deep-copy interiors, links, list and relationship IDs',()=>{const {instantiateTemplate}=load();const t={id:'t',name:'Place',displayType:'folder',nodes:[{id:'a',type:'list',childIds:['b']},{id:'b',type:'character',parentId:'a',linkedCanvasId:'old',settings:{locked:false}},{id:'r',relationshipData:{selectedCharacters:[{id:'b'}],relationships:[{id:'rel',fromCharacterId:'b',toCharacterId:'b'}]}}],connections:[{id:'c',from:'a',to:'b'}]};const a=instantiateTemplate(t),b=instantiateTemplate(t);assert.notEqual(a.nodes[0].id,b.nodes[0].id);assert.equal(a.nodes[0].childIds[0],a.nodes[1].id);assert.equal(a.connections[0].to,a.nodes[1].id);assert.equal(a.nodes[2].relationshipData.selectedCharacters[0].id,a.nodes[1].id);assert.notEqual(a.nodes[1].linkedCanvasId,'old');a.nodes[1].settings.locked=true;assert.equal(t.nodes[1].settings.locked,false);});
test('sidebar has no board directory; slim global scrollbars and cell-only depth',()=>{assert.doesNotMatch(readFileSync('src/components/Sidebar.tsx','utf8'),/openableNodes\.map/);const css=readFileSync('src/app/globals.css','utf8');assert.match(css,/\*::-webkit-scrollbar/);assert.match(css,/\.table-node\s*\{[^}]*box-shadow/);});
