import {useEffect,useRef,useState} from 'react';
import {pageTemplates,type PageTemplate,type Scene} from './model';
import {pageLabels,pageStyles} from './templates';
import {PageThumbnail} from './LibraryHome';
export default function PageGallery({scene,chapter,onClose,onApply,onInsert}:{scene:Scene;chapter:string;onClose:()=>void;onApply:(type:PageTemplate,style:string)=>void;onInsert:(type:PageTemplate,style:string)=>void}) {
 const [type,setType]=useState<PageTemplate>(scene.template||'prose');
 const [style,setStyle]=useState(pageStyles.find(p=>p.layout.divider===scene.layout?.divider)?.id||'minimal');
 const [notice,setNotice]=useState('');const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;dialog.current?.showModal();return()=>previous?.focus();},[]);
 return <dialog ref={dialog} className="page-gallery" aria-labelledby="gallery-title" onCancel={onClose}>
  <header><div><h2 id="gallery-title">Page types</h2><p>Pick a kind of page and a style. Your writing always stays.</p></div><button aria-label="Close gallery" onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
  <div className="gallery-body"><div className="gallery-options"><h3>1. Choose a page type</h3><div className="page-type-cards">{pageTemplates.map(t=><button key={t} aria-label={`Choose ${pageLabels[t]}`} aria-pressed={type===t} onClick={()=>{setType(t);setNotice('')}}><PageThumbnail template={t} style={style} title={pageLabels[t]}/><strong>{pageLabels[t]}</strong></button>)}</div>
   <h3>2. Choose a layout style</h3><div className="page-style-cards">{pageStyles.map(s=><button key={s.id} aria-label={`Choose ${s.name} style`} aria-pressed={style===s.id} onClick={()=>{setStyle(s.id);setNotice('')}}><PageThumbnail template={type} style={s.id} title={pageLabels[type]}/><strong>{s.name}</strong></button>)}</div>
  </div><aside className="gallery-preview"><PageThumbnail template={type} style={style} title={pageLabels[type]}/><h3>{pageLabels[type]}</h3><p>{pageStyles.find(s=>s.id===style)?.name} layout</p><p className="gallery-hint">Layout previews are illustrative. Pages use your book’s fonts and paper size; artwork is added separately.</p></aside></div>
  <footer><div><p>Insert into <strong>{chapter}</strong>, after the selected page.</p><small>“Change this page” keeps its words and pictures and only changes its look.</small><span role="status">{notice}</span></div><button onClick={()=>{onApply(type,style);setNotice('Style applied. Your writing is unchanged.')}}>Change this page</button><button className="gallery-primary" onClick={()=>onInsert(type,style)}>Add as new page</button></footer>
 </dialog>;
}
