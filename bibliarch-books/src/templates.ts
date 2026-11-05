import {newBook, uid, type Book, type Chapter, type PageTemplate, type Scene} from './model';
import type {PageLayout} from './design';
import {heading, para, doc, hasHeading, chapterWord} from './paragraph-styles';
export const pageLabels: Record<PageTemplate,string> = {'book-front':'Title page','chapter-title':'Chapter opener',prose:'Writing page','color-art':'Illustration','bnw-art':'Black & white art',characters:'Characters',afterword:'Afterword','back-cover':'Back cover',copyright:'Copyright',toc:'Contents'};
export const pageStyles: {id:string;name:string;layout:PageLayout}[] = [
 {id:'minimal',name:'Minimal',layout:{titleAlign:'left',chapterSpacing:0,border:'none',divider:'none'}},
 {id:'classic',name:'Classic',layout:{titleAlign:'center',chapterSpacing:24,border:'none',divider:'diamond'}},
 {id:'botanical',name:'Botanical',layout:{titleAlign:'center',chapterSpacing:18,border:'solid',divider:'leaves'}},
 {id:'ornate',name:'Ornate',layout:{titleAlign:'center',chapterSpacing:32,border:'double',divider:'stars'}},
];
export const bookPresets = [
 {id:'blank',name:'Blank book',description:'A clean page. All yours.',style:'minimal'},
 {id:'novel',name:'Classic novel',description:'Title page, copyright, contents & chapters · 6 × 9 in',style:'classic'},
 {id:'light-novel',name:'Japanese light novel',description:'Color insert, characters, prologue & afterword · pocket size',style:'minimal'},
 {id:'journal',name:'Botanical journal',description:'Dated entries & sketches, by season · 5.8 × 8.3 in',style:'botanical'},
 {id:'poetry',name:'Poetry collection',description:'One poem per page, contents & notes · 5.5 × 8.5 in',style:'ornate'},
];
type Block = ReturnType<typeof para>;
const year = () => new Date().getFullYear();
/** Starting text for a new page of each kind. Everything is ordinary, editable text. */
export function starterBlocks(t:PageTemplate, opts:{chapter?:number;title?:string;author?:string;align?:string}={}):Block[] {
 const c=opts.align??'center';
 switch(t){
  case 'book-front': return [heading('h1',opts.title||'Book title','center'),heading('h5','A subtitle, if you like','center'),para(''),para(opts.author||'Author name','center')];
  case 'chapter-title': return [heading('h6',`Chapter ${chapterWord(opts.chapter||1)}`,c),heading('h2',opts.title||'Chapter title',c),para('')];
  case 'afterword': return [heading('h2',opts.title||'Afterword',c),para('')];
  case 'characters': return [heading('h2','Characters',c),heading('h4','Character name'),para('One or two sentences about who they are and what they want.'),heading('h4','Character name'),para('One or two sentences about who they are and what they want.')];
  case 'copyright': return copyrightBlocks(opts.author);
  case 'toc': return [heading('h2','Contents',c)];
  case 'back-cover': return [heading('h3','“A short line from a review or a hook goes here.”','center'),para(''),para('Write two or three exciting paragraphs about your book here: who it is about, what they want, and what stands in their way. Don’t give away the ending!')];
  default: return [para('')];
 }
}
const copyrightBlocks=(author='Author Name')=>[
 para(`Copyright © ${year()} ${author}`,'center'),para('All rights reserved.','center'),para(''),
 para('No part of this book may be reproduced in any form without written permission from the author, except for brief quotations in a book review.','center'),para(''),
 para('This is a work of fiction. Names, characters, places and events are the products of the author’s imagination.','center'),para(''),
 para('First edition','center'),para('ISBN: add yours here','center'),
];
export function styledPage(template:PageTemplate, style:string, opts:{chapter?:number}={}):Scene {
 const layout={...(pageStyles.find(s=>s.id===style)||pageStyles[0]).layout,...(template==='chapter-title'?{titleAlign:'center' as const}:{})};
 const align=layout.titleAlign==='left'||layout.titleAlign==='justify'?'':layout.titleAlign;
 return {id:uid(),title:pageLabels[template],template,inlineTitle:true,content:doc(starterBlocks(template,{chapter:opts.chapter,align})),layout};
}
/** Chapter number for a new chapter opener: one more than the chapter openers already in the book. */
export const nextChapterNumber=(b:Book)=>b.chapters.flatMap(c=>c.scenes).filter(s=>s.template==='chapter-title').length+1;
/** Changing the kind of page: if it gains a title and has none yet, give it one as normal editable text. */
export function applyTemplate(scene:Scene, template:PageTemplate, book?:Book):Scene {
 const titled=!['prose','color-art','bnw-art'].includes(template);
 if(!titled||hasHeading(scene.content))return {...scene,template};
 const align=scene.layout?.titleAlign&&scene.layout.titleAlign!=='left'&&scene.layout.titleAlign!=='justify'?scene.layout.titleAlign:(template==='chapter-title'||template==='book-front'?'center':'');
 const head=starterBlocks(template,{chapter:book?nextChapterNumber(book):1,title:template==='book-front'?book?.title:undefined,align}).filter(b=>b.type==='heading');
 return {...scene,template,inlineTitle:true,content:{...scene.content,root:{...scene.content.root,children:[...head,...scene.content.root.children]}} as any};
}
/**
 * One-time upgrade for books made before titles were editable text: the page's
 * title (and chapter number) become the first lines of the page. Idempotent.
 */
export function inlineTitles(book:Book):Book {
 let chapterNo=0;
 const chapters=book.chapters.map(c=>({...c,scenes:c.scenes.map(s=>{
  if(s.template==='chapter-title')chapterNo++;
  if(s.inlineTitle||!s.template||s.template==='prose'||s.template==='color-art'||s.template==='bnw-art')return s;
  const align=s.layout?.titleAlign&&s.layout.titleAlign!=='left'&&s.layout.titleAlign!=='justify'?s.layout.titleAlign:'';
  const title=s.template==='book-front'?book.title:s.title;
  const head:Block[]=[];
  if(s.template==='chapter-title')head.push(heading('h6',`Chapter ${chapterWord(chapterNo)}`,align||'center'));
  if(title?.trim())head.push(heading(s.template==='book-front'?'h1':'h2',title,s.template==='book-front'?'center':align));
  return {...s,inlineTitle:true,content:{...s.content,root:{...s.content.root,children:[...head,...(s.content.root.children as any[])]}} as any};
 })}));
 return {...book,chapters};
}

const section=(title:string,scenes:Scene[]):Chapter=>({id:uid(),title,scenes});
const page=(template:PageTemplate,name:string,blocks:Block[],layout:Partial<PageLayout>={}):Scene=>({id:uid(),title:name,template,inlineTitle:true,content:doc(blocks),layout:{titleAlign:'left',chapterSpacing:0,border:'none',divider:'none',...layout}});
const START='Start writing here. Click anywhere on this page and type. (This line is only a placeholder, so delete it whenever you like.)';

export function createPresetBook(id:string):Book {
 const preset=bookPresets.find(p=>p.id===id)||bookPresets[0];
 const title=id==='blank'?'Untitled book':({novel:'The Long Road','light-novel':'A New Dawn',journal:'Field Notes',portfolio:'Collected Works',poetry:'Quiet Hours'} as Record<string,string>)[id];
 const b=newBook(title);
 const centered={titleAlign:'center' as const};
 if(id==='novel'){
  // Trade-paperback novel: front matter, numbered chapters, back matter.
  b.appearance={...b.appearance,preset:'Custom',widthMm:152.4,heightMm:228.6,margin:19,mirror:true,insideMm:25,outsideMm:19,bodyFont:'Georgia',headingFont:'Georgia',bodySize:16,headingSize:30,lineHeight:1.6,paragraphSpacing:0,paragraphIndent:1.5,paragraphAlign:'justify',tracking:0,header:'{title}',footer:'{page}'};
  b.chapters=[
   section('Front matter',[
    page('book-front','Title page',[heading('h1',title,'center'),heading('h5','A Novel','center'),para(''),para(''),para('Author Name','center')],{...centered,chapterSpacing:50}),
    page('copyright','Copyright',copyrightBlocks(),{...centered,chapterSpacing:85}),
    page('prose','Dedication',[para('For everyone who has a story to tell.','center',2)],{chapterSpacing:60}),
    page('toc','Contents',[heading('h2','Contents','center')],centered),
   ]),
   section('Chapter One',[page('chapter-title','The Beginning',[heading('h6','Chapter One','center'),heading('h2','The Beginning','center'),para(START)],{...centered,chapterSpacing:40,dropCap:true,divider:'diamond'})]),
   section('Chapter Two',[page('chapter-title','Chapter title',[heading('h6','Chapter Two','center'),heading('h2','Chapter title','center'),para('')],{...centered,chapterSpacing:40,dropCap:true})]),
   section('Back matter',[page('afterword','About the Author',[heading('h2','About the Author','center'),para('Write two or three sentences about yourself here: where you live, what you love, and what you’re writing next.')],{...centered,chapterSpacing:30})]),
  ];
 } else if(id==='light-novel'){
  // English light-novel volume: color insert up front, character list, prologue, afterword.
  b.appearance={...b.appearance,preset:'B6',bodyFont:'Arial',headingFont:'Times New Roman',bodySize:13,headingSize:28,margin:12,lineHeight:1.45,paragraphSpacing:0,paragraphIndent:1,paragraphAlign:'justify',tracking:0,header:'',footer:'{page}',mirror:false};
  b.chapters=[
   section('Front matter',[
    page('book-front','Title page',[heading('h1',title,'center'),heading('h5','Volume 1','center'),para(''),para('Story by Author Name','center'),para('Illustrations by Artist Name','center')],{...centered,chapterSpacing:40}),
    page('color-art','Color insert',[para('')]),
    page('characters','Characters',[heading('h2','Characters','center'),heading('h4','Main character'),para('Age, what they’re like, and the one thing they want most.'),heading('h4','Best friend / rival'),para('How they know the main character, and why they matter.'),heading('h4','Mysterious stranger'),para('What everyone thinks about them, and what they’re hiding.')],centered),
    page('toc','Contents',[heading('h2','Contents','center')],centered),
   ]),
   section('Prologue',[page('chapter-title','Prologue',[heading('h2','Prologue','center'),para(START)],{...centered,chapterSpacing:30})]),
   section('Chapter 1',[
    page('chapter-title','Chapter one',[heading('h6','Chapter 1','center'),heading('h2','Chapter one','center'),para('')],{...centered,chapterSpacing:30}),
    page('bnw-art','Illustration',[para('')]),
   ]),
   section('Afterword',[page('afterword','Afterword',[heading('h2','Afterword','center'),para('Thank you so much for reading! Write a friendly note to your readers here: how the story started, and a hint about the next volume.')],{...centered,chapterSpacing:20})]),
  ];
 } else if(id==='journal'){
  b.appearance={...b.appearance,preset:'A5',bodyFont:'Georgia',headingFont:'Georgia',bodySize:16,headingSize:28,lineHeight:1.7,paragraphSpacing:14,paragraphIndent:0,paragraphAlign:'left',tracking:0,header:'',footer:'— {page} —'};
  const frame={border:'solid' as const,divider:'leaves' as const};
  b.chapters=[
   section('Title page',[page('book-front','Title page',[heading('h1',title,'center'),heading('h5','A botanical journal','center'),para(''),para('Your Name','center'),para(String(year()),'center')],{...centered,...frame,divider:'none',chapterSpacing:45})]),
   section('Spring',[
    page('chapter-title','Spring',[heading('h6','Part One','center'),heading('h2','Spring','center'),heading('h3','March 14 · The garden path'),para(START)],{...centered,...frame,chapterSpacing:20}),
    page('color-art','Sketch: first crocus',[para('')]),
    page('prose','April entry',[heading('h3','April 2 · After the rain'),para('')],frame),
   ]),
   section('Summer',[page('chapter-title','Summer',[heading('h6','Part Two','center'),heading('h2','Summer','center'),heading('h3','June 21 · Longest day'),para('')],{...centered,...frame,chapterSpacing:20})]),
   section('Notes',[page('afterword','Plant notes',[heading('h2','Plant notes','center'),heading('h4','Crocus'),para('Where you found it, when it bloomed, and anything you want to remember.')],{...centered,...frame})]),
  ];
 } else if(id==='portfolio'){
  b.appearance={...b.appearance,preset:'Letter',bodyFont:'Arial',headingFont:'Arial',bodySize:16,headingSize:34,margin:19,lineHeight:1.6,paragraphSpacing:16,paragraphIndent:0,paragraphAlign:'left',tracking:0,header:'',footer:'{page}'};
  b.chapters=[
   section('Title page',[page('book-front','Title page',[heading('h1',title),heading('h5',`Selected work, ${year()-3}–${year()}`),para(''),para('Artist Name')],{chapterSpacing:85})]),
   section('Statement',[page('afterword','Artist statement',[heading('h2','Artist Statement'),para('What do you make, and why? Two short paragraphs are plenty. Talk about the ideas, materials or feelings that connect the pieces in this book.')],{chapterSpacing:20})]),
   section('Works',[page('color-art','Untitled I',[para('')]),page('color-art','Untitled II',[para('')]),page('color-art','Untitled III',[para('')])]),
   section('Index',[page('afterword','Index of works',[heading('h2','Index of Works'),para('Untitled I — ink and watercolor on paper, 2025'),para('Untitled II — digital painting, 2025'),para('Untitled III — graphite, 2026'),heading('h3','About the artist'),para('A short bio, your website and how to get in touch.')],{chapterSpacing:20})]),
  ];
 } else if(id==='poetry'){
  // Poems keep their line breaks: each line is its own paragraph, blank lines separate stanzas.
  b.appearance={...b.appearance,preset:'Custom',widthMm:139.7,heightMm:215.9,margin:22,bodyFont:'Georgia',headingFont:'Georgia',bodySize:16,headingSize:24,lineHeight:1.6,paragraphSpacing:0,paragraphIndent:0,paragraphAlign:'left',tracking:0,header:'',footer:'{page}'};
  const poem=(name:string,lines:string[])=>page('prose',name,[heading('h3',name),...lines.map(l=>para(l))],{chapterSpacing:30});
  b.chapters=[
   section('Front matter',[
    page('book-front','Title page',[heading('h1',title,'center'),heading('h5','Poems','center'),para(''),para('Poet Name','center')],{...centered,border:'double',chapterSpacing:45}),
    page('prose','Dedication',[para('for the people who stay up late','center',2)],{chapterSpacing:60}),
    page('toc','Contents',[heading('h2','Contents','center')],centered),
   ]),
   section('Poems',[
    poem('Morning',['The kettle hums its one low note,','and light comes in the way it does —','slowly, then all at once.','','I write your name in the steam.']),
    poem('Small Lanterns',['Your poem’s first line goes here,','the second line here.','','Leave an empty line','between stanzas.']),
   ]),
   section('Notes',[page('afterword','Acknowledgments',[heading('h2','Acknowledgments','center'),para('Thank the people who helped, and list any magazines where these poems first appeared.')],{...centered,chapterSpacing:30})]),
  ];
 } else {
  b.appearance={...b.appearance,preset:'Custom',widthMm:152.4,heightMm:228.6,margin:19,bodyFont:'Georgia',headingFont:'Georgia',bodySize:16,headingSize:30,lineHeight:1.6,paragraphSpacing:16,paragraphIndent:0,paragraphAlign:'left',footer:'{page}'};
  b.chapters=[section('Chapter 1',[page('prose','',[para('')])])];
 }
 // Decorate title pages only, never the plain writing pages.
 for(const s of b.chapters.flatMap(c=>c.scenes)){
  const ornament=id==='journal'&&s.template==='book-front'?'willow-sprig':id==='poetry'&&s.template==='book-front'?'paired-flourish':null;
  if(ornament)s.decals=[{id:uid(),src:'builtin:bibliarch-'+ornament,alt:ornament.replaceAll('-',' '),x:30,y:6,width:40,rotation:0,opacity:.75}];
 }
 return {...b,updatedAt:new Date().toISOString()};
}
