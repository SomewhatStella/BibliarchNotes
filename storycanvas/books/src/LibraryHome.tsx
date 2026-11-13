import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {ComicLayoutIcon} from './ComicPage';
import {comicOf} from './comic';
import {createPortal} from 'react-dom';
import MiniPage from './MiniPage';
import {pageDimensions, type Appearance} from './model';
import type {Book, PageTemplate, Scene} from './model';
import {documentText} from './review';
import {wordCount} from './model';
import {bookPresets, pageStyles, createPresetBook} from './templates';
const displayTitle=(t:string)=>!t.trim()||/^(book name|untitled book)$/i.test(t.trim())?'Untitled book':t;
const bookWords=(b:Book)=>b.chapters.reduce((n,c)=>n+c.scenes.reduce((m,s)=>m+wordCount(s.content),0),0);
/** "Edited today", "Edited yesterday", "Edited 3 days ago", then a date. */
function edited(iso?:string){
 if(!iso||isNaN(Date.parse(iso)))return 'Edited a while ago';
 const d=new Date(iso),days=Math.floor((new Date().setHours(0,0,0,0)-new Date(d).setHours(0,0,0,0))/86400000);
 return days<=0?'Edited today':days===1?'Edited yesterday':days<7?`Edited ${days} days ago`:`Edited ${d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:d.getFullYear()===new Date().getFullYear()?undefined:'numeric'})}`;
}
/** Old books kept the starter text "Book name / Author name" on page 1: show it as an untitled cover (display only). */
function coverScene(s:Scene,title:string):Scene{
 const untitled=displayTitle(title)==='Untitled book';
 if(!untitled)return s;
 const fix=(n:any):any=>n.type==='text'?{...n,text:/^book name$/i.test(n.text.trim())?'Untitled book':n.text}:n.children?{...n,children:n.children.map(fix).filter((c:any)=>!(c.type==='text'&&/^author name$/i.test(c.text.trim())))}:n;
 return {...s,content:{...s.content,root:fix((s.content as any).root)}} as Scene;
}
/** Cover width that fits a given preview height for this book's paper shape. */
const fitWidth=(a:Appearance,height:number)=>{const [w,h]=pageDimensions(a);return Math.round(height*w/h);};

export function PageThumbnail({template='book-front',style='minimal',title='Your title',scene}: {template?:PageTemplate;style?:string;title?:string;scene?:Scene}) {
 const layout=scene?.layout||pageStyles.find(s=>s.id===style)?.layout;
 const body=scene?documentText(scene.content):'';
 return <span aria-hidden="true" className={`page-thumbnail thumb-${template} thumb-${style}`} style={{textAlign:layout?.titleAlign,borderStyle:layout?.border==='double'?'double':layout?.border==='solid'?'solid':undefined,borderWidth:layout?.border==='double'?4:undefined}}>
  {template==='chapter-title'&&<small>CHAPTER ONE</small>}
  {template!=='prose'&&template!=='comic'&&<strong>{title}</strong>}
  {scene?.image?<img src={scene.image.src} alt=""/>:['color-art','bnw-art'].includes(template)?<span className="thumb-art"><i/><b/></span>:null}
  {template==='characters'?<span className="thumb-portraits">◯ ◯ ◯</span>:null}
  {template==='comic'?<ComicLayoutIcon comic={comicOf(scene||{})} width={60} height={80}/>:null}
  {template==='toc'?<span className="thumb-contents">Opening ······· 1<br/>The journey ··· 3<br/>Afterword ···· 9</span>:null}
  {template==='comic'?null:body?<span className="thumb-excerpt">{body.slice(0,220)}</span>:<span className="thumb-lines"><i/><i/><i/><i/><i/></span>}
  {layout?.divider&&layout.divider!=='none'&&<span className="thumb-ornament">{layout.divider==='leaves'?'❧':layout.divider==='stars'?'✦  ✧  ✦':'◆'}</span>}
 </span>;
}
export default function LibraryHome({books,status,error,tools,recoveryTools,onOpen,onCreate,onDelete,onImport}:{books:Book[];status:string;error:ReactNode;tools:ReactNode;recoveryTools?:ReactNode;onOpen:(b:Book)=>void;onCreate:(id:string)=>void;onDelete:(b:Book)=>void;onImport?:(file?:File)=>void}) {
 const [search,setSearch]=useState(''),[dropping,setDropping]=useState(false);
 // Previews are the real first page each template creates, not a stand-in drawing.
 const samples=useMemo(()=>Object.fromEntries(bookPresets.filter(p=>p.id!=='blank').map(p=>[p.id,createPresetBook(p.id)])),[]);
 // Page-level tools (feedback) live in the site's top bar instead of their own row.
 const [toolSlot,setToolSlot]=useState<HTMLElement|null>(null);
 useEffect(()=>setToolSlot(document.getElementById('site-nav-tools')),[]);
 const filtered=books.filter(b=>b.title.toLowerCase().includes(search.toLowerCase())).slice().sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
 // Drop a manuscript anywhere on the library to start importing it.
 const isFile=(e:React.DragEvent)=>e.dataTransfer.types.includes('Files');
 return <div className={`library-home${dropping?' is-dropping':''}`} onDragOver={e=>{if(onImport&&isFile(e)){e.preventDefault();setDropping(true);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDropping(false);}} onDrop={e=>{if(!onImport||!isFile(e))return;e.preventDefault();setDropping(false);const f=e.dataTransfer.files?.[0];if(f)onImport(f);}}>
  {dropping&&<div className="library-drop-hint" aria-hidden="true"><strong>Drop to import your manuscript</strong><span>Word, Google Docs or text file</span></div>}
  {toolSlot?createPortal(<div className="library-tools">{tools}</div>,toolSlot):<div className="library-tools library-tools-fallback">{tools}</div>}
  {error}

  <main>
   <section className="start-section" aria-labelledby="start-heading"><div className="library-section-heading"><div><h1 id="start-heading">Start a new book</h1></div><p>Begin with a blank page or make a template your own.</p></div>
    <div className="book-presets">{bookPresets.map(p=><button key={p.id} className={`book-preset preset-${p.id}`} aria-label={`Create ${p.name}`} onClick={()=>onCreate(p.id)}><span className="preset-stage">{p.id==='blank'?<span className="blank-thumbnail" aria-hidden="true">＋</span>:<MiniPage className="preset-cover" scene={samples[p.id].chapters[0].scenes[0]} appearance={samples[p.id].appearance} width={fitWidth(samples[p.id].appearance,172)} boost={1.85}/>}</span><strong>{p.name}</strong><small>{p.description}</small></button>)}{onImport&&<button className="book-preset preset-import" aria-label="Import a manuscript" onClick={()=>onImport()}><span className="preset-stage"><span className="import-thumbnail" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3"/></svg><em>Word, Google Docs<br/>or text file</em></span></span><strong>Import a manuscript</strong><small>Your draft from Word or Google Docs, split into chapters</small></button>}</div>
   </section>
   {books.length>0&&<section className="saved-section" aria-labelledby="books-heading"><div className="library-section-heading"><div className="books-title"><h2 id="books-heading">Your books</h2><span>{books.length} {books.length===1?'book':'books'}</span></div><input type="search" aria-label="Search books" placeholder="Search your books" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    {filtered.length?<div className="saved-books">{filtered.map(b=>{const s=b.chapters[0].scenes[0];const style=pageStyles.find(p=>p.layout.divider===s.layout?.divider)?.id||'minimal';void style;return <div key={b.id} className="saved-book-card"><button className="saved-book" aria-label={`Open ${displayTitle(b.title)}`} onClick={()=>onOpen(b)}><span className="saved-book-preview"><MiniPage className="book-cover" scene={coverScene(s,b.title)} appearance={b.appearance} width={fitWidth(b.appearance,172)} boost={1.85}/></span><span className="saved-book-meta"><strong>{displayTitle(b.title)}</strong><small>{edited(b.updatedAt)} · {bookWords(b).toLocaleString()} {bookWords(b)===1?'word':'words'}</small></span></button><button className="saved-book-delete" aria-label={`Delete ${b.title}`} title="Delete this book" onClick={()=>onDelete(b)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button></div>})}</div>:<div className="library-empty"><h3>{books.length?'No books found':'Your first book starts here'}</h3><p>{books.length?'Try a different title, or start a new book above.':'Pick Blank book or a style above to start writing. Have a backup file? Use Open backup… to bring your books back.'}</p></div>}
   </section>}
   {books.length===0&&<section className="saved-section" aria-labelledby="books-heading"><div className="library-section-heading"><div className="books-title"><h2 id="books-heading">Your books</h2></div></div><div className="library-empty"><h3>Your first book starts here</h3><p>Pick Blank book or a style above, or drop a manuscript anywhere on this page. Have a backup file? Use Open backup… below.</p></div></section>}
  </main>
  <footer className="library-footer"><span role="status">{status}</span> · Your words stay yours.{recoveryTools&&<details><summary>Backup &amp; recovery</summary>{recoveryTools}</details>}</footer>
 </div>;
}
