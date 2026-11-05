import {describe,it,expect} from 'vitest';
import {createEditor,$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {$findMatches,$replaceMatch,$selectionAppearance} from '../src/editorHelpers';
function run(fn:()=>void) {const editor=createEditor({namespace:'test',onError:e=>{throw e;}});editor.update(fn,{discrete:true});}
describe('editor audit regressions',()=>{
 it('finds across formatting runs without crossing paragraphs or modifying content',()=>run(()=>{
  const p=$createParagraphNode().append($createTextNode('one hel').setFormat('bold'),$createTextNode('lo two'));
  $getRoot().append(p,$createParagraphNode().append($createTextNode('hello')));
  const before=JSON.stringify($getRoot().exportJSON());
  expect($findMatches('hello',true)).toHaveLength(2);
  expect($findMatches('twohello',true)).toHaveLength(0);
  expect(JSON.stringify($getRoot().exportJSON())).toBe(before);
 }));
 it('replaces a cross-run match and preserves formatting outside the match',()=>run(()=>{
  const p=$createParagraphNode().append($createTextNode('before hel').setFormat('bold'),$createTextNode('lo after').setFormat('italic'));
  $getRoot().append(p);$replaceMatch($findMatches('hello',true)[0],'world');
  expect(p.getTextContent()).toBe('before world after');
  expect(p.getAllTextNodes()[0].hasFormat('bold')).toBe(true);
  expect(p.getAllTextNodes().at(-1)!.hasFormat('italic')).toBe(true);
 }));
 it('counts literal case-insensitive matches and supports backwards replacement',()=>run(()=>{
  const p=$createParagraphNode().append($createTextNode('Hi hi HI [x]'));$getRoot().append(p);
  expect($findMatches('hi',true)).toHaveLength(1);
  const matches=$findMatches('hi',false);expect(matches).toHaveLength(3);
  matches.reverse().forEach(m=>$replaceMatch(m,'hello'));
  expect(p.getTextContent()).toBe('hello hello hello [x]');expect($findMatches('[x]',true)).toHaveLength(1);
 }));
 it('reports cursor styles and mixed range styles/alignment',()=>run(()=>{
  const a=$createTextNode('first').setStyle('font-family: Georgia; font-size: 24px; color: #ff0000;');
  const b=$createTextNode('second').setStyle('font-family: Arial; font-size: 16px; color: #0000ff;');
  const p=$createParagraphNode().append(a).setFormat('center');const q=$createParagraphNode().append(b);$getRoot().append(p,q);
  a.select(2,2);expect($selectionAppearance()).toMatchObject({font:'Georgia',size:'24px',color:'#ff0000',alignment:'center'});
  const s=a.select(0,0);s.focus.set(b.getKey(),6,'text');
  expect($selectionAppearance()).toMatchObject({font:'',size:'',color:'',alignment:''});
 }));
});
