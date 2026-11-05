import { describe, it, expect } from 'vitest';
import { flattenPages, safeSplitOffset } from '../src/pagination/serialization';
const text = (text:string, format=0) => ({type:'text',version:1,text,format,style:'',detail:0,mode:'normal'});
const paragraph = (group:string, children:any[]) => ({type:'flow-paragraph',version:1,group,children,format:'',indent:0,direction:null});
describe('runtime pagination serialization', () => {
 it('joins fragments across pages without persisting wrappers or metadata', () => {
  const source:any = {root:{type:'root',version:1,children:[{type:'page',children:[paragraph('a',[text('hello ')])]},{type:'page',children:[paragraph('a',[text('world')]),paragraph('b',[text('next',1)])]}]}};
  const result:any = flattenPages(source);
  expect(result.root.children).toHaveLength(2);
  expect(result.root.children[0].children).toEqual([text('hello world')]);
  expect(result.root.children[1].children).toEqual([text('next',1)]);
  expect(JSON.stringify(result)).not.toMatch(/flow-paragraph|"group"|"page"/);
 });
 it('retains distinct paragraphs and formatted runs', () => {
  const source:any={root:{children:[paragraph('a',[text('A',1)]),paragraph('a',[text('B',2)]),paragraph('b',[text('')])]}};
  const result:any=flattenPages(source);
  expect(result.root.children).toHaveLength(2);
  expect(result.root.children[0].children).toEqual([text('A',1),text('B',2)]);
 });
 it('never splits a UTF-16 surrogate pair', () => {
  expect(safeSplitOffset('a😀b',2)).toBe(1);
  expect(safeSplitOffset('abcd',2)).toBe(2);
  expect(safeSplitOffset('the immediately',9)).toBe(4);
  expect(safeSplitOffset('one two',4)).toBe(4);
 });
});
