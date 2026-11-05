import {it,expect} from 'vitest';
import {createPresetBook,bookPresets,inlineTitles,applyTemplate} from '../src/templates';
import {titleFromContent,chapterLabelFromContent} from '../src/paragraph-styles';
import {newBook,parseLibrary,seed} from '../src/model';

it('every preset uses editable headings for titles and survives a backup round trip',()=>{
 for(const p of bookPresets){
  const b=createPresetBook(p.id);
  for(const s of b.chapters.flatMap(c=>c.scenes)){
   expect(s.inlineTitle).toBe(true);
   if(['book-front','chapter-title','afterword','toc','characters'].includes(s.template!))expect(s.content.root.children.some((n:any)=>n.type==='heading')).toBe(true);
  }
  const l={...seed(),books:[b],activeBook:b.id,activeScene:b.chapters[0].scenes[0].id};
  expect(parseLibrary(JSON.stringify(l)).books[0].chapters.length).toBe(b.chapters.length);
 }
});
it('novel template is a real book skeleton',()=>{
 const scenes=createPresetBook('novel').chapters.flatMap(c=>c.scenes);
 expect(scenes.map(s=>s.template)).toEqual(['book-front','copyright','prose','toc','chapter-title','chapter-title','afterword']);
 expect(chapterLabelFromContent(scenes[4].content)).toBe('Chapter One');
 expect(titleFromContent(scenes[4].content)).toBe('The Beginning');
});
it('converts old separate titles into the first lines of the page, once',()=>{
 const b=newBook('My Book');
 const up=inlineTitles(b);
 const [front,chapter]=up.chapters.map(c=>c.scenes[0]);
 expect(front.content.root.children[0]).toMatchObject({type:'heading',tag:'h1'});
 expect(titleFromContent(front.content)).toBe('My Book');
 expect(chapterLabelFromContent(chapter.content)).toBe('Chapter One');
 expect(titleFromContent(chapter.content)).toBe('Chapter name');
 expect(inlineTitles(up)).toEqual(up);
});
it('turning a plain page into a chapter opener adds an editable heading only if it has none',()=>{
 const b=createPresetBook('blank');const s=b.chapters[0].scenes[0];
 const opened=applyTemplate(s,'chapter-title',b);
 expect(opened.content.root.children.filter((n:any)=>n.type==='heading')).toHaveLength(2);
 expect(applyTemplate(opened,'afterword',b).content.root.children.filter((n:any)=>n.type==='heading')).toHaveLength(2);
});
