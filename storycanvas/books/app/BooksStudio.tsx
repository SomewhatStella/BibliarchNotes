"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Editor from "../src/Editor";
import BugReport from '../src/BugReport';
import {ThemeToggle} from '../src/ThemeToggle';
import CloudPanel from '../src/CloudPanel';
import {createLibraryStore, type LibraryStore} from '../src/library-storage';
import {restoreWorkspace,WORKSPACE_KEY} from '../src/workspace';
import {searchDocument} from '../src/documentSearch';
import OverlayTextTools from '../src/OverlayTextTools';
import IllustrationPage from '../src/IllustrationPage';
import ComicPage from '../src/ComicPage';
import {comicOf, visiblePanels} from '../src/comic';
import './comic.css';
import BookPreview, {type BookView} from '../src/BookPreview';
import './book-preview.css';
import {isIllustration} from '../src/artwork';
import LibraryHome, {PageThumbnail} from '../src/LibraryHome';
import PageGallery from '../src/PageGallery';
import ToolDialog from '../src/ToolDialog';
import {askConfirm, askText} from '../src/AskDialog';
import PageIndicator, {useCurrentPage} from '../src/PageIndicator';
import ImportManuscript from '../src/ImportManuscript';
import ExportPanel from '../src/ExportPanel';
import LoadingScreen from '../src/LoadingScreen';
import CoverDesigner, {OutlineCover} from '../src/CoverDesigner';
import {coverRender, defaultCover, type Cover} from '../src/cover';
import {useWritingGoal} from '../src/goals';
import {GoalChip, GoalToast, FocusBar} from '../src/WritingGoal';
import BookDesignPanel, {Choice, TEXT_SIZES, LINE_SPACING, nearest} from '../src/BookDesignPanel';
import PictureSettings from '../src/PictureSettings';
import './book-design.css';
import {createPresetBook, styledPage, pageStyles, bookPresets, pageLabels, inlineTitles, applyTemplate, nextChapterNumber, starterBlocks} from '../src/templates';
import {titleFromContent, chapterLabelFromContent, doc as docOf, paragraphStyleCss} from '../src/paragraph-styles';
import './library.css';
import './simplified.css';
import './artwork-tools.css';
import './dialogs.css';
import './document-workspace.css';
import './toolbar.css';
import './design-round2.css';
import './design-round3.css';
import './cover.css';
import './dark.css';
import './mobile.css';
import {usePageSequence} from "../src/pagination/usePageSequence";
import ImageLibrary from '../src/ImageLibrary';
import DecalTray from '../src/DecalTray';
import ChangeReview from '../src/ChangeReview';
import {fontCss, designCss} from '../src/design';
import {moveScene, pageMargins} from '../src/model';
import {editTracked,documentText} from "../src/review";
import {
  KEY,
  seed,
  newBook,
  emptyDoc,
  uid,
  parseLibrary,
  addRevision,
  restoreRevision,
  reorder,
  wordCount,
  fonts,
  pageTemplates,
  applyPageTemplate,
  pageDimensions,
  validateImage,
  type Library,
  type Book,
  type Scene,
  type Appearance,
  type PageTemplate,
} from "../src/model";

/** Errors shown to writers: no "Error:" prefixes or stack-ish wording. */
function friendlyError(e:unknown){
  const m=(e instanceof Error?e.message:String(e)).replace(/^(\w*Error:\s*)+/,'');
  if(/megapixels/i.test(m))return 'That picture is too large. Try a smaller version of it (under about 4000 × 4000 pixels).';
  if(/decode|EncodingError/i.test(m))return 'That picture couldn’t be opened. Try saving it again as a PNG or JPEG.';
  return m;
}
const presetSampleTitle=(id:string)=>({portfolio:'Collected works',poetry:'Quiet hours',journal:'Field notes',novel:'The long road','light-novel':'A new dawn'} as Record<string,string>)[id]||'Your title';
const versionLabel=(kind:string)=>({'Automatic review snapshot':'Saved automatically','Manual review snapshot':'Saved by you','Before deleting page':'Before a page was deleted','Before removing picture':'Before a picture was removed'} as Record<string,string>)[kind]||(/restor/i.test(kind)?'Before going back to an earlier version':kind);
const plural=(n:number,word:string)=>`${n.toLocaleString()} ${word}${n===1?'':'s'}`;
export default function Studio({userId}:{userId:string}) {
  const [cloudStatus,setCloudStatus]=useState('Opening your library…');
  const [deviceFresh,setDeviceFresh]=useState(false);

  const cloudOwner=useRef<string|null>(null);
  const [bookView,setBookView]=useState<BookView>('write');
  const [hydrated,setHydrated]=useState(false);
  const [templateAppearance,setTemplateAppearance]=useState(false);
  const [pendingFind,setPendingFind]=useState<{sceneId:string;query:string}|null>(null);
  const [importing,setImporting]=useState<false|true|File>(false),[exporting,setExporting]=useState(false);
  const [home,setHome]=useState(true), [gallery,setGallery]=useState(false),[toolTab,setToolTab]=useState('');
  const [lib, setLib] = useState<Library | null>(null),
    latest = useRef<Library | null>(null),
    blocked = useRef(false);
  const [status, setStatus] = useState("Opening…"),
    [error, setError] = useState(""),
    [outline, setOutline] = useState(()=>typeof window==="undefined"||window.innerWidth>1100),
    [panel, setPanel] = useState(""),
    [zoom, setZoom] = useState(100),
    [spread, setSpread] = useState(false),
    [tracking,setTracking] = useState(false),
    [epoch, setEpoch] = useState(0),
    [host, setHost] = useState<HTMLDivElement | null>(null),
    [preview, setPreview] = useState(""),
    [query, setQuery] = useState(""),
    [personal, setPersonal] = useState<
      { name: string; template: PageTemplate; appearance: Appearance }[]
    >([]);
  const backupInput = useRef<HTMLInputElement>(null);
  const pictureInput = useRef<HTMLInputElement>(null);
  const pictureTarget = useRef('');
  const pictureLegacy = useRef(false);
  const store = useRef<LibraryStore | null>(null);
  const saveGeneration = useRef(0);
  const dirty = useRef(false);
  const deleting = useRef(false);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [reviewTab,setReviewTab]=useState('Comments');
  const [selectedTheme,setSelectedTheme]=useState('');
  const [designTab,setDesignTab]=useState<'Text'|'Paper'|'This page'>('Text');
  const [draftNote,setDraftNote]=useState('');
  const [refDraft,setRefDraft]=useState<{kind:'Character'|'Location';name:string;notes:string}|null>(null);
  useEffect(()=>{
    const closeMenus=(event:Event)=>{
      if(event instanceof KeyboardEvent && event.key!=='Escape')return;
      if(event.type==='pointerdown' && (event.target as HTMLElement).closest('nav[aria-label="Document menu"]'))return;
      if(event.type==='pointerdown')document.querySelectorAll<HTMLDetailsElement>('details.format-more[open],details.find[open],details.outline-actions[open],.section-controls details[open]').forEach(d=>{if(!d.contains(event.target as Node))d.open=false;});
      else document.querySelectorAll<HTMLDetailsElement>('details.format-more[open],details.find[open],details.outline-actions[open],.section-controls details[open]').forEach(d=>{d.open=false;});
      document.querySelectorAll<HTMLDetailsElement>('details.menu[open]').forEach(menu=>{menu.open=false;if(event.type==='keydown')(menu.querySelector('summary') as HTMLElement)?.focus();});
    };
    document.addEventListener('pointerdown',closeMenus);document.addEventListener('keydown',closeMenus);
    return()=>{document.removeEventListener('pointerdown',closeMenus);document.removeEventListener('keydown',closeMenus);};
  },[]);
  useEffect(()=>{
    const narrow=window.matchMedia('(max-width:760px)');
    const compact=()=>{if(narrow.matches){setOutline(false);setToolTab('');}};
    compact();narrow.addEventListener('change',compact);return()=>narrow.removeEventListener('change',compact);
  },[hydrated]);
  // On a phone the page starts out filling the screen width (and refits when the phone is turned).
  const fitBook=lib?.books.find(b=>b.id===lib.activeBook);
  const fitWidth=fitBook?pageDimensions(fitBook.appearance)[0]:0;
  useEffect(()=>{
    if(!fitWidth)return;
    const narrow=window.matchMedia('(max-width:760px)');let last=0;
    const fit=()=>{if(!narrow.matches||window.innerWidth===last)return;last=window.innerWidth;setZoom(Math.max(40,Math.min(100,Math.floor((last-24)/(fitWidth*3.78)*100))));};
    fit();window.addEventListener('resize',fit);return()=>window.removeEventListener('resize',fit);
  },[hydrated,fitWidth]);
  const sequence=usePageSequence(lib?.books.find(b=>b.id===lib.activeBook),epoch);
  const libraryWords=lib?lib.books.reduce((n,b)=>n+b.chapters.reduce((m,c)=>m+c.scenes.reduce((k,s)=>k+wordCount(s.content),0),0),0):0;
  const goal=useWritingGoal(userId,libraryWords,!!lib&&hydrated);
  const [focus,setFocus]=useState(false),[dim,setDim]=useState(false);
  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle('books-focus',focus&&!home);root.classList.toggle('books-dim',focus&&dim&&!home);
    if(!focus)return;
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))setFocus(false);};
    document.addEventListener('keydown',esc);
    return()=>{document.removeEventListener('keydown',esc);root.classList.remove('books-focus','books-dim');};
  },[focus,dim,home]);
  // A docked side sheet sits below the toolbar; the pages make room for it instead of being covered.
  const sheetOpen=!home&&(panel==='style'||panel==='image');
  useEffect(()=>{
    const root=document.documentElement;root.classList.toggle('books-sheet-open',sheetOpen);
    const place=()=>{const w=document.querySelector('.studio .workspace');if(w)root.style.setProperty('--workspace-top',Math.round(w.getBoundingClientRect().top)+'px');};
    place();window.addEventListener('resize',place);
    return()=>{window.removeEventListener('resize',place);root.classList.remove('books-sheet-open');};
  },[sheetOpen]);
  const pageNow=useCurrentPage(sequence.starts,sequence.total,`${home}|${lib?.activeBook}|${epoch}|${!!lib}`);
  const saveTimer=useRef<number|undefined>(undefined);
  const pageCache=useRef(new Map<string,{deps:unknown[];el:React.ReactNode}>());
  const persistRef=useRef<()=>Promise<void>|void>(()=>{});
  // True only when a save on this device actually failed (not merely "about to save").
  const saveFailed=useRef(false);
  useEffect(()=>{
    const flush=()=>{if(saveTimer.current!==undefined)persistRef.current();};
    const hidden=()=>{if(document.visibilityState==='hidden')flush();};
    window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);
    return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};
  },[]);
  function commit(l: Library) {
    if(deleting.current)return;
    latest.current = l;
    setLib(l);
    if (blocked.current) {
      setStatus("Saving paused");
      return;
    }
    dirty.current = true;
    // Typing changes the library on every keystroke; writing a whole book to storage
    // each time made long books lag. Save once typing pauses (and always on leave).
    setStatus('Saving…');
    clearTimeout(saveTimer.current);
    saveTimer.current=window.setTimeout(persist,450);
  }
  function persist():Promise<void>|void{
    clearTimeout(saveTimer.current);saveTimer.current=undefined;
    const l=latest.current;
    if(!l||blocked.current||deleting.current||!dirty.current)return;
    const generation = ++saveGeneration.current;
    return store.current?.save(l).then(r=>{
      if(generation!==saveGeneration.current || blocked.current)return;
      dirty.current=!r.ok;saveFailed.current=!r.ok;
      setStatus(r.ok ? "Saved on this device" : "Unsaved changes");
      setError(r.ok ? "" : /quota/i.test(r.error||"") ? "Your latest changes couldn’t be saved because this browser is out of storage space. Download a copy so nothing is lost, then try removing some large pictures." : `Your latest changes couldn’t be saved (${r.error}). Download a copy so nothing is lost.`);
    });
  }
  persistRef.current=persist;
  useEffect(() => {
    let cancelled=false;
    const existing=latest.current;
    const storageStore=store.current ?? (store.current=createLibraryStore(userId));
    void (async()=>{
    try {
      // Fast Refresh retains the draft, but a newly introduced store still needs
      // a safe revision baseline. Never load/migrate persisted data over it.
      if(existing){
        await storageStore.initializeLiveDraft(existing);
        if(cancelled)return;
        dirty.current=true;saveFailed.current=true;
        setStatus('Unsaved changes');
        setError('Your work is still here but hasn’t been saved yet. Try saving again, or download a copy.');
        setHydrated(true);
        return;
      }
      const result=await storageStore.load();
      if(cancelled || latest.current)return;
      const loaded=result.library;
      setDeviceFresh(!!result.fresh);
      let workspaceRaw:string|null=null;
      try{workspaceRaw=localStorage.getItem(`${WORKSPACE_KEY}:${userId}`);}catch{}
      const workspace=restoreWorkspace(workspaceRaw,loaded);
      // Older books kept titles outside the text; turn them into ordinary editable lines.
      const restored={...loaded,books:loaded.books.map(inlineTitles),activeBook:workspace.bookId,activeScene:workspace.sceneId};
      latest.current=restored;setLib(restored);
      setHome(workspace.home);setZoom(workspace.zoom);setBookView(workspace.view);setSpread(workspace.spread);
      setStatus(result.warning?'Unsaved changes':'Saved on this device');
      if(result.warning){dirty.current=true;saveFailed.current=true;setError(result.warning);}
      // Reading a library must never rewrite it, including legacy normalization.
      if(result.fresh)commit(restored);
      setHydrated(true);
    } catch (e) {
      if(cancelled)return;
      if(latest.current){
        dirty.current=true;saveFailed.current=true;
        setStatus('Unsaved changes');
        setError(`Live draft retained; storage could not be initialized: ${(e as Error).message}. Download a backup or retry saving.`);
        return;
      }
      blocked.current = true;
      const l = seed();
      latest.current = l;
      setLib(l);
      setError(
        "Your saved books couldn’t be opened. Nothing has been deleted. Download your saved data to keep it safe, or open a backup.",
      );
    }
    })();
    try {
      setPersonal(
        JSON.parse(localStorage.getItem(`bibliarch-page-templates:${userId}`) || "[]"),
      );
    } catch {}
    const storage = (e: StorageEvent) => {
      if (e.key === KEY) {
        blocked.current = true;
        setError(
          "Your books were changed in another tab. To avoid overwriting that work, saving here is paused. Download a copy of this page’s work, then reload.",
        );
      }
    };
    // Leaving the page: start any pending save now and let the page go. Only warn when work could
    // really be lost: a save on this device failed, or saving is paused by another tab.
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current && !saveFailed.current && !blocked.current) { void persistRef.current(); return; }
      if (blocked.current || (dirty.current && saveFailed.current)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    // Links to Home and Notes: finish saving first, then go (no "unsaved changes" prompt).
    const leave = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/books') || !dirty.current || blocked.current || saveFailed.current) return;
      e.preventDefault();
      void Promise.resolve(persistRef.current()).finally(() => location.assign(url.href));
    };
    document.addEventListener("click", leave, true);
    window.addEventListener("storage", storage);
    window.addEventListener("beforeunload", before);
    let last = "";
    const timer = setInterval(() => {
      const l = latest.current;
      if (!l || blocked.current) return;
      const b = l.books.find((b) => b.id === l.activeBook)!;
      if(!b || deleting.current)return;
      const value = JSON.stringify(b.chapters);
      if (last && last !== value)
        commit({
          ...l,
          books: l.books.map((x) =>
            x.id === b.id ? addRevision(x, "Automatic review snapshot") : x,
          ),
        });
      last = value;
    }, 60000);
    return () => {
      cancelled=true;
      clearInterval(timer);
      window.removeEventListener("storage", storage);
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", leave, true);
    };
  }, []);
  useEffect(()=>{
    if(!hydrated||!lib||blocked.current)return;
    try{localStorage.setItem(`${WORKSPACE_KEY}:${userId}`,JSON.stringify({bookId:lib.activeBook,sceneId:lib.activeScene,zoom,view:bookView,home,spread}));}catch{}
  },[hydrated,lib?.activeBook,lib?.activeScene,zoom,bookView,home,spread]);
  useEffect(()=>{
    if(!pendingFind||lib?.activeScene!==pendingFind.sceneId||bookView!=='write')return;
    // Child editor effects attach listeners before this post-commit frame.
    let frame=0;
    const ready=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
      const target=document.getElementById('page-'+pendingFind.sceneId);
      target?.scrollIntoView({block:'center'});
      const overlay=target?.querySelector<HTMLElement>('[aria-label="Illustration text"]');
      if(overlay){
        const text=overlay.textContent||'',start=text.toLowerCase().indexOf(pendingFind.query.toLowerCase());
        if(start>=0){
          const walker=document.createTreeWalker(overlay,NodeFilter.SHOW_TEXT);let node:Node|null,offset=0;
          const range=document.createRange();let started=false;
          while((node=walker.nextNode())){const length=node.textContent?.length||0;if(!started&&start<offset+length){range.setStart(node,start-offset);started=true;}if(started&&start+pendingFind.query.length<=offset+length){range.setEnd(node,start+pendingFind.query.length-offset);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);break;}offset+=length;}
        }
      }else {
        target?.querySelector<HTMLElement>('[contenteditable="true"]')?.focus({preventScroll:true});
        window.dispatchEvent(new CustomEvent('bibliarch-find',{detail:{query:pendingFind.query}}));
      }
      setPendingFind(null);
    });});
    return()=>{cancelAnimationFrame(ready);cancelAnimationFrame(frame);};
  },[pendingFind,lib?.activeScene,bookView]);
  // Tab title: the open book's name while writing, "Bibliarch Books" in the library.
  const openTitle=!home&&lib?.books.length?(lib.books.find(b=>b.id===lib.activeBook)?.title.trim()||'Untitled book'):'';
  useEffect(()=>{document.title=openTitle?`${openTitle} — Bibliarch Books`:'Bibliarch Books';},[openTitle]);
  useEffect(()=>()=>{document.title='Bibliarch Books';},[]);
  if (!lib) return <LoadingScreen message="Opening your books…"/>;
  const book = lib.books.find((b) => b.id === lib.activeBook) || newBook('Untitled book'),
    chapter =
      book.chapters.find((c) =>
        c.scenes.some((s) => s.id === lib.activeScene),
      ) || book.chapters[0],
    scene =
      chapter.scenes.find((s) => s.id === lib.activeScene) || chapter.scenes[0],
    a = book.appearance;
  const pages = book.chapters.flatMap((c) => c.scenes.map((s) => ({ c, s }))),
    [width, height] = pageDimensions(a);
  const searchResults=searchDocument(pages.map(p=>p.s),query);
  // Contents lists real sections, not the title/copyright/art pages.
  const tocEntries=pages.filter(p=>['chapter-title','afterword','characters','prose'].includes(p.s.template||'prose')&&(p.s.template!=='prose'||!!titleFromContent(p.s.content))).map(p=>({...p,label:chapterLabelFromContent(p.s.content)}));
  /** The page name in the outline follows the first heading on the page, like Docs' outline. */
  function syncTitle(x:Scene):Scene{const t=titleFromContent(x.content);return t&&t!==x.title?{...x,title:t}:x;}
  function update(fn: (b: Book) => Book) {
    const l = latest.current!;
    commit({ ...l, books: l.books.map((b) => (b.id === book.id ? {...fn(b),updatedAt:new Date().toISOString()} : b)) });
  }
  function editPage(id: string, fn: (s: Scene) => Scene) {
    update((b) => ({
      ...b,
      chapters: b.chapters.map((c) => ({
        ...c,
        scenes: c.scenes.map((s) => (s.id === id ? fn(s) : s)),
      })),
    }));
  }
  function select(id: string, scroll = false) {
    if (latest.current!.activeScene !== id)
      commit({ ...latest.current!, activeScene: id });
    if (scroll)
      document
        .getElementById("page-" + id)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function appearance(key: string, value: unknown) {
    update((b) => ({ ...b, appearance: { ...b.appearance, [key]: value } }));
  }
  function download(data: BlobPart, name: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function openDesign(tab:'Text'|'Paper'|'This page'){setDesignTab(tab);setPanel('style');}
  function backup() {
    download(JSON.stringify(latest.current, null, 2), "bibliarch-library.json");
  }
  async function downloadStored(){
    try{download(await store.current!.storedRaw(),'bibliarch-stored-recovery.json');}
    catch{setError('Stored data unavailable. Download this draft instead.');}
  }
  function addPage(newChapter = false) {
    const n = nextChapterNumber(book);
    const s: Scene = {
      id: uid(),
      title: newChapter ? "Chapter title" : "New page",
      template: newChapter ? "chapter-title" : "prose",
      inlineTitle: true,
      content: newChapter ? docOf(starterBlocks("chapter-title", { chapter: n })) : emptyDoc(),
      layout: newChapter ? { titleAlign: "center", chapterSpacing: 40, border: "none", divider: "none" } : undefined,
    };
    const l = latest.current!;
    const b = {
      ...book,
      chapters: newChapter
        ? [...book.chapters, { id: uid(), title: `Chapter ${n}`, scenes: [s] }]
        : book.chapters.map((c) =>
            c.id === chapter.id ? { ...c, scenes: [...c.scenes, s] } : c,
          ),
    };
    commit({
      ...l,
      books: l.books.map((x) => (x.id === b.id ? b : x)),
      activeScene: s.id,
    });
    setTimeout(() => select(s.id, true), 30);
  }
  async function removePage(id = scene.id) {
    if (
      pages.length === 1 ||
      !(await askConfirm({title: 'Delete this page?', message: 'Everything written on it will be removed. You can get it back from Review → Earlier versions.', confirmLabel: 'Delete page', danger: true}))
    )
      return;
    const b = addRevision(book, "Before deleting page");
    b.chapters = b.chapters
      .map((c) => ({ ...c, scenes: c.scenes.filter((s) => s.id !== id) }))
      .filter((c) => c.scenes.length);
    commit({
      ...latest.current!,
      books: lib!.books.map((x) => (x.id === b.id ? b : x)),
      activeScene: b.chapters[0].scenes[0].id,
    });
  }
  async function publish(kind: string) {
    setExporting(true);
    try {
      setStatus(kind==='preview'?'Making your preview…':'Making your '+kind+'…');
      const p = await import("../src/publishing");
      const payload = {
        title: book.title,
        customFonts: book.customFonts,
        format: {
          widthMm: width,
          heightMm: height,
          marginMm: a.margin,
          mirror: a.mirror,
          bleedMm: a.bleedMm,
          header: a.header,
          footer: a.footer,
          bodyFont: a.bodyFont,
          bodySizePt: a.bodySize * 0.75,
          headingFont: a.headingFont,
          headingSizePt: a.headingSize * 0.75,
          lineHeight: a.lineHeight,
          paragraphSpacing: a.paragraphSpacing,
          paragraphIndent: a.paragraphIndent,
          indentStepMm: a.indentStepMm,
          paragraphAlign: a.paragraphAlign,
          tracking: a.tracking,
          insideMm: a.insideMm,
          outsideMm: a.outsideMm,
          recto: a.recto,
          safeMm: a.safeMm,
        },
        sections: pages.map(({ s, c }) => ({
          id: s.id,
          title: s.template === "book-front" ? book.title : s.title,
          kind: s.template || "prose",
          content: s.content,
          image: s.image,
          overlay: s.overlay,
          decals: s.decals,
          layout: s.layout,
          comic: s.template === 'comic' ? (() => { const c = comicOf(s); return {...c, art: visiblePanels(c).map(p => { const im = book.images?.find(x => x.id === p.assetId); return im ? {src: im.src, width: im.naturalWidth, height: im.naturalHeight} : null; })}; })() : undefined,
          chapterStart: c.scenes[0].id === s.id && !c.folder,
          chapter: !c.folder && !/^(front|back) matter$/i.test(c.title.trim()) ? c.title : undefined,
          inlineTitle: s.inlineTitle || undefined,
          tocTitle: s.inlineTitle ? (tocEntries.find(t => t.s.id === s.id) ? (chapterLabelFromContent(s.content) ? `${chapterLabelFromContent(s.content)}: ${s.title}` : s.title) : undefined) : undefined,
          label: s.template === 'chapter-title' ? 'CHAPTER ' + (book.chapters.filter(x => !x.folder && !x.scenes.some(y => y.template === 'book-front')).indexOf(c) + 1) : undefined,
        })),
      };
      if(pages.some(({s})=>s.images?.length)){
        if(kind!=='EPUB'){window.print();setStatus('Choose “Save as PDF” in the print window to download your book.');return;}
        // Reflowable EPUB cannot preserve free page coordinates: package each used
        // image after its section, without changing the editable manuscript.
        payload.sections=pages.flatMap(({s},i)=>[payload.sections[i],...(s.images||[]).flatMap(placement=>{const asset=book.images?.find(a=>a.id===placement.assetId);return asset?[{...payload.sections[i],id:placement.id,title:asset.name,kind:'color-art' as const,content:emptyDoc(),image:{src:asset.src,alt:asset.name},overlay:undefined,decals:undefined,layout:undefined,chapterStart:false}]:[];})]);
        setError('Your e-book is downloading. E-readers can’t place pictures freely, so each picture appears after the text of its page.');
      }
      const warnings = p.validatePrint(payload);
      if (kind === "preview") {
        const response = await fetch("/api/pdf", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
        if (!response.ok) throw Error(await response.text());
        if (preview) URL.revokeObjectURL(preview);
        setPreview(URL.createObjectURL(await response.blob()));
        if (warnings.length) setError(warnings.join(" "));
      } else if (kind === "EPUB") {
        const bytes = await p.buildEpub(payload);
        download(
          new Uint8Array(bytes).buffer,
          "book.epub",
          "application/epub+zip",
        );
      } else {
        const response = await fetch("/api/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw Error(await response.text());
        download(await response.blob(), "book.pdf", "application/pdf");
      }
      setStatus("Saved on this device");
    } catch (e) {
      setStatus(dirty.current?'Unsaved changes':'Saved on this device');
      setError("Sorry, your book couldn’t be made into a file just now. Please try again. (" + friendlyError(e).slice(0,200) + ")");
    } finally { setExporting(false); }
  }
  /** Adds a cover picture to the book's library; big photos are shrunk to fit the library limit. */
  async function addCoverImage(file: File): Promise<string|undefined> {
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPEG or WebP picture.');
    if((book.images?.length||0)>=100)throw Error('Your picture library is full (100 pictures).');
    const url=URL.createObjectURL(file);
    try{
      const image=new Image();image.src=url;await image.decode();
      let src='';
      if(file.size<=1_500_000&&image.naturalWidth*image.naturalHeight<=16_000_000)src=await new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(file);});
      let w=image.naturalWidth,h=image.naturalHeight;
      for(let side=3600,q=0.9;!src||src.length>2_000_000;side=Math.round(side*0.85),q=Math.max(0.7,q-0.05)){
        const k=Math.min(1,side/Math.max(image.naturalWidth,image.naturalHeight));w=Math.round(image.naturalWidth*k);h=Math.round(image.naturalHeight*k);
        const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d')!.drawImage(image,0,0,w,h);src=canvas.toDataURL('image/jpeg',q);
        if(side<600)break;
      }
      if(src.length>2_000_000)throw Error('That picture is too big. Try a smaller one.');
      const id=uid();
      update(b=>({...b,images:[...(b.images||[]),{id,src,name:file.name.slice(0,200),naturalWidth:w,naturalHeight:h}]}));
      return id;
    }finally{URL.revokeObjectURL(url);}
  }
  async function downloadCover(cover: Cover) {
    setExporting(true);setStatus('Making your cover…');
    try{
      const response=await fetch('/api/cover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(coverRender(book,sequence.total,cover))});
      if(!response.ok)throw Error(await response.text());
      download(await response.blob(),'cover.pdf','application/pdf');
      setStatus('Saved on this device');
    }catch(e){setStatus(dirty.current?'Unsaved changes':'Saved on this device');setError('Sorry, your cover couldn’t be made into a file just now. Please try again. ('+friendlyError(e).slice(0,200)+')');}
    finally{setExporting(false);}
  }
  function choosePicture() { pictureTarget.current=scene.id; pictureLegacy.current=false; pictureInput.current?.click(); }
  function choosePictureForPage() { pictureTarget.current=scene.id; pictureLegacy.current=true; pictureInput.current?.click(); }
  const dialogTitle=({themes:'Book themes',style:'Book design',image:'Picture settings',review:'Review',find:'Find in book'} as Record<string,string>)[panel]||'';
  async function importImage(file: File, targetId=scene.id, legacy=false) {
    const problem = validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }
    const id = targetId;
    const src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const image = new Image();
    image.src=src;
    await image.decode();
    if(image.naturalWidth*image.naturalHeight>16000000)throw Error('Image exceeds 16 megapixels; resize it before importing.');
    // Resolve against the live draft after decoding, never replace prose or
    // write a delayed upload into a different book.
    const live = latest.current!;
    if (live.activeBook !== book.id) throw Error('Book changed. Please add the picture again.');
    const current = live.books.find(b=>b.id===book.id)!;
    const target = current.chapters.flatMap(c=>c.scenes).find(s=>s.id===id);
    if (!target) throw Error('This page was removed. Please choose another page.');
    const picture: NonNullable<Scene['image']> = {src,alt:file.name,widthPercent:100,rotation:0,opacity:1,fit:'contain',position:'50% 50%',naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight};
    if(legacy&&isIllustration(target.template)){editPage(id,s=>({...s,image:picture}));return;}
    if((current.images?.length||0)>=100)throw Error('Image library is full (100 pictures).');
    update(b=>({...b,images:[...(b.images||[]),{id:uid(),src,name:file.name,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight}]}));
    setBookView('write');setPanel('');setToolTab('Image');
  }
  /** A comic panel's art goes into the book's picture library like any other picture, and the panel points at it. */
  async function addComicArt(file: File, targetId: string, index: number) {
    const problem = validateImage(file);
    if (problem) { setError(problem); return; }
    const src = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
    const image = new Image();
    image.src = src;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 16000000) throw Error('Image exceeds 16 megapixels; resize it before importing.');
    const live = latest.current!;
    if (live.activeBook !== book.id) throw Error('Book changed. Please add the picture again.');
    const current = live.books.find(b => b.id === book.id)!;
    if (!current.chapters.some(c => c.scenes.some(s => s.id === targetId))) throw Error('This page was removed. Please choose another page.');
    if ((current.images?.length || 0) >= 100) throw Error('Image library is full (100 pictures).');
    const id = uid();
    update(b => ({...b, images: [...(b.images || []), {id, src, name: file.name, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight}],
      chapters: b.chapters.map(c => ({...c, scenes: c.scenes.map(s => {
        if (s.id !== targetId) return s;
        const comic = comicOf(s);
        return {...s, comic: {...comic, panels: comic.panels.map((p, k) => k === index ? {...p, assetId: id, focusX: 50, focusY: 50, zoom: 1} : p)}};
      })}))}));
  }
  const movePage = (delta: number) =>
    update((b) => ({
      ...b,
      chapters: b.chapters.map((c) =>
        c.id === chapter.id
          ? {
              ...c,
              scenes: reorder(
                c.scenes,
                c.scenes.findIndex((s) => s.id === scene.id),
                delta,
              ),
            }
          : c,
      ),
    }));
  const rename = async () => {
    const title = await askText({title: 'Rename page', label: 'Page name', value: scene.title, confirmLabel: 'Rename'});
    if (title?.trim())
      editPage(scene.id, (s) => ({ ...s, title: title.slice(0, 300) }));
  };
  function openBook(b:Book) {
    const l=latest.current!;
    commit({...l,activeBook:b.id,activeScene:l.activeBook===b.id&&b.chapters.some(c=>c.scenes.some(s=>s.id===l.activeScene))?l.activeScene:b.chapters[0].scenes[0].id});
    setPanel('');setHome(false);setEpoch(x=>x+1);
  }
  async function deleteBook(target:Book){
    if(blocked.current || deleting.current){setError('Book not deleted: storage is protected or busy.');return;}
    if(!(await askConfirm({title:`Delete “${target.title}”?`,message:'This can’t be undone. If you might want it later, choose Save backup first.',confirmLabel:'Delete book',danger:true})))return;
    goal.exclude(-bookWords(target));
    const current=latest.current!;
    const books=current.books.filter(b=>b.id!==target.id);
    const active=books.find(b=>b.id===current.activeBook)||books[0];
    const next={...current,books,activeBook:active?.id||'',activeScene:active?.id===current.activeBook?current.activeScene:active?.chapters[0].scenes[0].id||''};
    if(cloudOwner.current){commit(next);setHome(true);setEpoch(x=>x+1);return;}
    deleting.current=true;setDeleteBusy(true);++saveGeneration.current;setStatus('Deleting…');
    try{
      const result=await store.current!.save(next);
      if(!result.ok)throw Error(result.error);
      latest.current=next;setLib(next);dirty.current=false;setError('');setStatus('Saved on this device');setHome(true);setEpoch(x=>x+1);
    }catch(e){setStatus(dirty.current?'Unsaved changes':'Saved on this device');setError(`Book not deleted: ${(e as Error).message}. Your book has been kept.`);}
    finally{deleting.current=false;setDeleteBusy(false);}
  }
  const bookWords=(b:Book)=>b.chapters.reduce((m,c)=>m+c.scenes.reduce((k,s)=>k+wordCount(s.content),0),0);
  function importBook(b:Book){
    if(deleting.current)return;
    goal.exclude(bookWords(b));
    commit({...latest.current!,books:[...latest.current!.books,b],activeBook:b.id,activeScene:b.chapters[0].scenes[0].id});
    setImporting(false);setPanel('');setHome(false);setEpoch(x=>x+1);
  }
  const importDialog=importing&&<ImportManuscript onClose={()=>setImporting(false)} onImport={importBook} initialFile={importing instanceof File?importing:undefined}/>;
  function createBook(id:string) {
    if(deleting.current)return;
    document.querySelectorAll<HTMLDetailsElement>('details.menu[open]').forEach(menu=>{menu.open=false;});
    const b=createPresetBook(id);
    goal.exclude(bookWords(b));
    commit({...latest.current!,books:[...latest.current!.books,b],activeBook:b.id,activeScene:b.chapters[0].scenes[0].id});
    setPanel('');setHome(false);setEpoch(x=>x+1);
  }
  async function importBackup(file?:File) {
    if(!file)return;
    try {
      const parsed=parseLibrary(await file.text());const imported={...parsed,books:parsed.books.map(inlineTitles)};
      if(!(await askConfirm({title:'Open this backup?',message:'It will replace the books in this browser. A copy of your current books will download first, just in case.',confirmLabel:'Open backup'})))return;
      backup();
      if(blocked.current)await store.current!.prepareReplacement();
      blocked.current=false;commit(imported);setEpoch(x=>x+1);
    }catch(e){setError((e as Error).message)}
  }
  const backupControls=<><button onClick={backup} title="Download a backup file of all your books">Save backup</button><button onClick={()=>backupInput.current?.click()}>Open backup…</button><input ref={backupInput} hidden aria-label="Import JSON backup" type="file" accept=".json,application/json" onChange={e=>{void importBackup(e.target.files?.[0]);e.target.value='';}}/></>;
  async function retrySaving(){
    if(blocked.current || !latest.current)return;
    try{
      const storageStore=store.current ?? (store.current=createLibraryStore(userId));
      await storageStore.initializeLiveDraft(latest.current);
      // Initialization is asynchronous: save the current draft, not its snapshot.
      if(!blocked.current && latest.current)commit(latest.current);
    }catch(e){dirty.current=true;saveFailed.current=true;setStatus('Unsaved changes');setError(`Not saved: ${(e as Error).message}. Download a JSON backup now.`);}
  }
  const atRisk = dirty.current || blocked.current;
  const recovery = error ? <div className="error" role="alert"><span>{error}</span>{atRisk&&<button onClick={backup}>Download a copy</button>}{atRisk&&!blocked.current&&<button onClick={()=>void retrySaving()}>Try saving again</button>}{blocked.current&&<button onClick={()=>void downloadStored()}>Download saved data</button>}<button onClick={()=>setError('')}>Dismiss</button></div> : null;
  const cloud=hydrated&&<CloudPanel userId={userId} deviceFresh={deviceFresh} library={lib} onStatus={setCloudStatus} onLoad={value=>{commit(value);setEpoch(x=>x+1);setHome(true);}}/>;
  if(home||!lib.books.length)return <>{cloud}<div className="library-scroll" data-unsaved={dirty.current||blocked.current}><fieldset disabled={deleteBusy} style={{border:0,padding:0,margin:0,minWidth:0}}><LibraryHome books={lib.books} status={cloudStatus} error={recovery} onOpen={openBook} onDelete={deleteBook} onCreate={createBook} onImport={(file?:File)=>setImporting(file??true)} recoveryTools={backupControls} tools={<BugReport userId={userId}/>}/></fieldset></div>{importDialog}</>;
  return (
    <>{cloud}
    <div className={`studio${focus?' focus-mode':''}`} data-unsaved={dirty.current||blocked.current}>
      {focus&&<FocusBar goal={goal.goal} words={goal.words} dark={dim} onDark={()=>setDim(d=>!d)} onExit={()=>setFocus(false)}/>}
      {goal.celebrate&&goal.goal>0&&goal.words>=goal.goal&&<GoalToast words={goal.words} onClose={goal.dismiss}/>}
      {gallery&&<PageGallery scene={scene} chapter={chapter.title} onClose={()=>setGallery(false)} onApply={(type,style)=>{editPage(scene.id,s=>applyTemplate({...s,layout:{...s.layout,...pageStyles.find(p=>p.id===style)!.layout}},type,book));setEpoch(x=>x+1);}} onInsert={(type,style)=>{
        const s=styledPage(type,style,{chapter:nextChapterNumber(book)}), l=latest.current!;
        const current=l.books.find(b=>b.id===l.activeBook)!;
        const b={...current,updatedAt:new Date().toISOString(),chapters:current.chapters.map(c=>{if(c.id!==chapter.id)return c;const scenes=[...c.scenes];scenes.splice(scenes.findIndex(p=>p.id===scene.id)+1,0,s);return {...c,scenes}})};
        commit({...l,books:l.books.map(x=>x.id===b.id?b:x),activeScene:s.id});setGallery(false);setTimeout(()=>select(s.id,true),30);
      }}/>}
      <style>{fontCss(book.customFonts || []) + designCss + paragraphStyleCss('.paper .editor') + `.toc-list{list-style:none;margin:0;padding:0;font-family:var(--body-font)}.toc-list li{display:flex;align-items:baseline;gap:6px;margin:0 0 .55em}.toc-list i{flex:1;border-bottom:1px dotted #999;transform:translateY(-3px)}.toc-list b{font-weight:400}.paper .editor h1:first-child,.paper .editor h2:first-child,.paper .editor h6:first-child{margin-top:0}` + `.document-heading{display:flex;flex-direction:column;align-items:flex-start;gap:2px}.settings-shortcuts{display:flex;flex-direction:column;gap:8px}.settings-shortcuts h3{margin:12px 0 0;font-size:13px}.format-more{position:relative}.advanced-formatting{position:absolute;top:100%;left:0;min-width:320px;padding:16px;background:white;box-shadow:0 4px 24px #0003;z-index:100;display:flex;flex-wrap:wrap;gap:8px}.page-tools [role=tablist]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;margin-bottom:16px}.page-tools [role=tab]{padding:8px 5px;font-size:12px}.page-tools [aria-selected=true]{background:#57416e;color:white}.canvas-note,.ruler{display:none}.decal-tray[hidden]{display:none}.artwork-overlay [contenteditable]{min-width:1ch;min-height:1.2em;border:0;outline:1px dashed #777;padding:0;pointer-events:auto}.artwork-overlay [contenteditable],.artwork-overlay [contenteditable]:focus{background:transparent!important}.artwork-overlay{print-color-adjust:exact;-webkit-print-color-adjust:exact}@media print{.artwork-overlay [contenteditable]{outline:none!important}}.crop-controls>p{display:none}.illustration-crop>button[hidden]{display:none}.image-mini-toolbar button{font-size:14px;padding:6px 10px}@media print{.image-mini-toolbar,.artwork-overlay>button{display:none!important}}`}</style>
      {importDialog}
      <header className="masthead">
        <button className="home-button" onClick={()=>{setHome(true);setPanel('');setGallery(false)}} title="Back to all your books" aria-label="Back to all your books">←<span className="home-label"> My books</span></button>
        <div className="document-heading">
          <input
            aria-label="Book title"
            maxLength={300}
            value={book.title}
            onChange={(e) => update((b) => ({ ...b, title: e.target.value }))}
          />
          <nav aria-label="Document menu" onClick={e=>{if((e.target as HTMLElement).closest('button'))document.querySelectorAll<HTMLDetailsElement>('details.menu[open]').forEach(m=>m.open=false);}} onKeyDown={e=>{if(e.key==='Escape')document.querySelectorAll<HTMLDetailsElement>('details.menu[open]').forEach(m=>m.open=false);}}>
            <details className="menu" name="document-menu">
              <summary>File</summary>
              <div>
                <button onClick={() => createBook('blank')}>New book</button>
                <button onClick={() => setImporting(true)}>Import a manuscript…</button>
                <button onClick={() => publish("preview")}>Preview &amp; print…</button>
                <button onClick={() => publish("PDF")}>Download as PDF</button>
                <button onClick={() => publish("EPUB")}>Download as e-book (EPUB)</button>
                <hr/>
                {backupControls}
              </div>
            </details>
            <details className="menu" name="document-menu">
              <summary>Edit</summary>
              <div>
                <button onClick={()=>openDesign('This page')}>Rename this page</button>
                <button onClick={() => setPanel("find")}>Find in book</button>
              </div>
            </details>
            <details className="menu" name="document-menu">
              <summary>View</summary>
              <div>
                <button onClick={() => setFocus(true)}>Focus mode (hide everything but the page)</button>
                <button onClick={() => setOutline(!outline)}>{outline?'Hide':'Show'} page list</button>
                <button onClick={() => {setBookView('write');setSpread(false);}}>Writing view</button>
                <button onClick={() => {setBookView('facing');setSpread(false);}}>Two pages side by side</button>
                <button onClick={() => {setBookView('3d');setSpread(false);}}>3D book</button>
              </div>
            </details>
            <details className="menu" name="document-menu">
              <summary>Insert</summary>
              <div>
                <button onClick={() => setGallery(true)}>Page…</button>
                <button onClick={() => addPage(true)}>New chapter</button>
                <button onClick={choosePicture}>Picture…</button>
                <button onClick={() => {setReviewTab('Comments');setPanel("review");}}>Comment</button>
              </div>
            </details>
            <details className="menu" name="document-menu"><summary role="button">Format</summary><div><button onClick={()=>openDesign('Text')}>Text &amp; fonts</button><button onClick={()=>openDesign('Paper')}>Book size &amp; margins</button><button onClick={()=>openDesign('This page')}>This page</button><button onClick={()=>setPanel('themes')}>Book themes</button></div></details>
            <details className="menu" name="document-menu"><summary role="button">Review</summary><div><button onClick={()=>{setReviewTab('Comments');setPanel('review');}}>Comments</button><button onClick={()=>{setReviewTab('Changes');setPanel('review');}}>Track changes</button><button onClick={()=>{setReviewTab('History');setPanel('review');}}>Earlier versions</button><button onClick={()=>{setReviewTab('References');setPanel('review');}}>Characters &amp; places</button></div></details>

          </nav>
        </div>
        <span role="status" className="save">
          {cloudStatus}
        </span>

        <button className="share" onClick={() => setPanel("export")}>
          Preview<span className="share-long"> &amp; export</span>
        </button>
        <BugReport userId={userId}/>
        <ThemeToggle className="masthead-theme"/>
      </header>
      {recovery}
      <input ref={pictureInput} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose picture" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void importImage(file,pictureTarget.current,pictureLegacy.current).catch(err=>setError(friendlyError(err)));}}/>
      <div className="format-row">
        <button
          aria-label="Toggle outline"
          title={outline?'Hide page list':'Show page list'}
          onClick={() => setOutline(!outline)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
        </button>
        <span className="separator"/>
        <button onClick={()=>addPage()}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 12v6M9 15h6"/></svg>Add page</button>
        <button aria-label="Page templates" onClick={()=>setGallery(true)}>Page types</button>
        <span className="separator"/>
        <label title="View">{''}<select aria-label="View" value={bookView} onChange={e=>{setBookView(e.target.value as BookView);setSpread(false);}}><option value="write">Writing</option><option value="facing">Side by side</option><option value="covers">Covers</option><option value="3d">3D book</option></select></label>
        <select
          aria-label="Zoom"
          title="Zoom"
          value={zoom}
          onChange={(e) => setZoom(+e.target.value)}
        >
          {[...new Set([zoom, 50, 75, 90, 100, 125, 150])].sort((x, y) => x - y).map((n) => (
            <option key={n} value={n}>
              {n}%
            </option>
          ))}
        </select>
        <div className="toolbar-host" ref={setHost} />
        <button className="focus-button" aria-label="Focus mode" title="Focus mode: hide everything but the page" onClick={()=>setFocus(true)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
        <button
          className="style-button"
          onClick={() => panel === "style" ? setPanel("") : openDesign('Text')}
        >
          <span className="long-label">Book </span>design
        </button>
      </div>
      <div className="workspace">
        {outline && (
          <aside className="outline panel" aria-label="Outline panel" onClick={e=>{if((e.target as HTMLElement).closest('.chapter-row>button,.outline-page')&&window.matchMedia('(max-width:760px)').matches)setOutline(false);}}>
            <h2>Pages</h2>
            <button className="outline-cover" onClick={()=>setPanel('cover')} aria-label="Cover and spine">
              <OutlineCover book={book} pages={sequence.total}/>
              <span><strong>Cover &amp; spine</strong><small>{book.cover?'Front, spine and back':'Design your printed cover'}</small></span>
            </button>
            {book.chapters.map((c, i) => { const single=c.scenes.length===1&&!c.folder,sub=single&&c.scenes[0].title.trim()&&c.scenes[0].title.trim().toLowerCase()!==c.title.trim().toLowerCase()?c.scenes[0].title:''; return (
              <section key={c.id} className={single?'single-page':''} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); const id=e.dataTransfer.getData('application/bibliarch-scene'); if(id)update(b=>moveScene(b,id,c.id,c.scenes.length));}}>
                <div className={`chapter-row${single&&c.scenes[0].id===scene.id?' selected':''}`}>
                  <button onClick={() => select(c.scenes[0].id, true)} {...(single?{draggable:true,onDragStart:(e:React.DragEvent)=>e.dataTransfer.setData('application/bibliarch-scene',c.scenes[0].id),'aria-current':c.scenes[0].id===scene.id?'page' as const:undefined}:{})}>
                    <span>{c.folder ? '▸ ' : ''}{c.title}{sub&&<small className="row-sub">{sub}</small>}</span>{single&&<small className="page-no">{sequence.starts[c.scenes[0].id]}</small>}
                  </button>
                  <details className="outline-actions"><summary aria-label={`Options for ${c.title}`}>⋯</summary><div>
                  <button
                    title="Rename chapter"
                    onClick={async () => {
                      const title = await askText({title: 'Rename chapter', label: 'Chapter name', value: c.title, confirmLabel: 'Rename'});
                      if (title)
                        update((b) => ({
                          ...b,
                          chapters: b.chapters.map((x) =>
                            x.id === c.id
                              ? { ...x, title: title.slice(0, 300) }
                              : x,
                          ),
                        }));
                    }}
                  >
                    Rename
                  </button>
                  <button
                    title="Move chapter up"
                    disabled={!i}
                    onClick={() =>
                      update((b) => ({
                        ...b,
                        chapters: reorder(b.chapters, i, -1),
                      }))
                    }
                  >
                    Move up
                  </button>
                  <button
                    title="Move chapter down"
                    disabled={i === book.chapters.length - 1}
                    onClick={() =>
                      update((b) => ({
                        ...b,
                        chapters: reorder(b.chapters, i, 1),
                      }))
                    }
                  >
                    Move down
                  </button>
                  </div></details>
                </div>
                {!single && c.scenes.map((s) => (
                  <button
                    key={s.id}
                    className={`outline-page ${s.id === scene.id ? "selected" : ""}`}
                    draggable
                    onDragStart={e=>e.dataTransfer.setData('application/bibliarch-scene',s.id)}
                    onDragOver={e=>e.preventDefault()}
                    onDrop={e=>{e.preventDefault();e.stopPropagation();const id=e.dataTransfer.getData('application/bibliarch-scene');if(id)update(b=>moveScene(b,id,c.id,c.scenes.findIndex(x=>x.id===s.id)));}}
                    onClick={() => select(s.id, true)}
                  >
                    <span>{s.bookmark ? '★ ' : ''}{s.title || 'Untitled section'}</span><small className="page-no">{sequence.starts[s.id]}</small>
                  </button>
                ))}
              </section>
            );})}

          </aside>
        )}
        <main className="document-scroller" aria-label="Document pages" onClick={()=>{if(outline&&window.matchMedia('(max-width:760px)').matches)setOutline(false);}}>
          {bookView!=='write'&&<BookPreview key={book.id} mode={bookView} title={book.title}/>}
          <div className="ruler" style={{ width: (width * 3.78 * zoom) / 100 }}>
            0　　 1　　 2　　 3　　 4　　 5　　 6　　 7　　 8　　 9　　 10　　
            11　　 12
          </div>
          <div
            className={`pages ${spread ? "spread" : ""} ${bookView!=='write'?'preview-source-hidden':''}`}
            inert={bookView!=='write'}
            style={
              {
                "--body-font": a.bodyFont,
                "--body-size": a.bodySize + "px",
                "--heading-font": a.headingFont,
                "--heading-size": a.headingSize + "px",
                "--line-height": a.lineHeight ?? 1.65,
                "--paragraph-spacing": (a.paragraphSpacing ?? 16) + 'px',
                "--paragraph-indent": (a.paragraphIndent ?? 0) + 'em',
                "--indent-step": (a.indentStepMm ?? 12.7) + 'mm',
                "--paragraph-align": a.paragraphAlign ?? 'left',
                "--tracking": (a.tracking ?? 0) + 'px',
              } as CSSProperties
            }
          >
            {pages.map(({ c, s }, i) => {
              // Reuse each section's rendered element until something it shows changes, so
              // typing in one chapter doesn't re-render every other chapter of a long book.
              const chapterNo=s.template==='chapter-title'&&!s.inlineTitle?book.chapters.filter(x=>!x.folder&&!x.scenes.some(y=>y.template==='book-front')).indexOf(c)+1:0;
              const tocKey=s.template==='toc'?JSON.stringify(tocEntries.map(p=>[p.s.id,p.label,p.s.title,sequence.starts[p.s.id]])):'';
              const deps=[s,i,s.id===scene.id,a,width,height,zoom,sequence.starts[s.id],sequence.blanks[s.id],host,book.images,book.customFonts,book.title,book.id,epoch,tracking,pages.length===1,tocKey,chapterNo];
              const hit=pageCache.current.get(s.id);
              if(hit&&hit.deps.length===deps.length&&hit.deps.every((d,k)=>Object.is(d,deps[k])))return hit.el;
              const el=(
              <div className="page-section" key={`${book.id}:${s.id}:${epoch}`} style={{width:width*3.78,zoom:zoom/100}}>
              <article
                id={"page-" + s.id}
                key={`${book.id}:${s.id}:${epoch}`}
                className={`paper paginated-source template-${s.template || "prose"} ${a.guides ? 'show-guides' : ''} ${s.id === scene.id ? "selected-page" : ""}`}
                aria-label={`Page ${i + 1}: ${s.title}`}
                onFocusCapture={() => select(s.id)}
                onClick={() => select(s.id)}
                onDragOverCapture={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();}}
                onDropCapture={e=>{const file=e.dataTransfer.files?.[0];if(file&&s.template!=='comic'){e.preventDefault();e.stopPropagation();select(s.id);void importImage(file,s.id,true).catch(err=>setError(friendlyError(err)));}}}
                style={
                  {
                    width: width * 3.78,
                    padding: 0,
                    '--safe': (a.safeMm ?? 5)*3.78+'px',
                    '--bleed': (a.bleedMm ?? 3)*3.78+'px',
                    '--title-align': s.layout?.titleAlign,
                    '--chapter-spacing': (s.layout?.chapterSpacing ?? 0)+'mm',
                    borderStyle: s.layout?.border === 'none' ? undefined : s.layout?.border,

                  } as CSSProperties
                }
              >

                {sequence.blanks[s.id]&&<div className="recto-blank" aria-label="Intentional blank page" style={{width:width*3.78,height:height*3.78,background:'white',marginBottom:24,border:'1px solid #ddd'}}/>}
                {s.template==='comic'?<ComicPage scene={s} assets={book.images} width={width*3.78} height={height*3.78} widthMm={width} heightMm={height} onChange={comic=>editPage(s.id,x=>({...x,comic}))} onUploadArt={(file,index)=>{select(s.id);void addComicArt(file,s.id,index).catch(err=>setError(friendlyError(err)))}} onOpenLayout={()=>{select(s.id);openDesign('This page')}}/>:isIllustration(s.template)?<IllustrationPage assets={book.images} scene={s} width={width*3.78} height={height*3.78} onUpload={file=>{void importImage(file,s.id,true).catch(err=>setError(friendlyError(err)))}} onEdit={()=>{select(s.id);setPanel('image')}} onChange={patch=>{if('image' in patch&&patch.image===undefined)update(b=>addRevision(b,'Before removing picture'));editPage(s.id,x=>({...x,...patch}));}}/>:<Editor customFonts={(book.customFonts||[]).map(font=>font.family)} content={s.content} active={s.id===scene.id} toolbarHost={host}
                  pageMetrics={{startPage:sequence.starts[s.id],widthPx:width*3.78,heightPx:height*3.78,marginPx:a.margin*3.78,
                    insidePx:a.mirror?(a.insideMm??a.margin)*3.78:undefined,outsidePx:a.mirror?(a.outsideMm??a.margin)*3.78:undefined,
                    guides:a.guides,header:a.header?.replaceAll('{title}',book.title),headerRecto:a.header==='{title}'&&!/^(front|back) matter$/i.test(c.title.trim())&&!c.folder?c.title:undefined,footer:a.footer?.replaceAll('{title}',book.title),
                    styleKey:JSON.stringify([a.bodyFont,a.bodySize,a.headingFont,a.headingSize,a.lineHeight,a.paragraphSpacing,a.paragraphIndent,a.paragraphAlign,a.tracking,a.indentStepMm]),
                    view:{inlineTitle:!!s.inlineTitle,images:s.images,assets:book.images,onTitleLayout:(patch:Partial<import('../src/design').PageLayout>)=>editPage(s.id,x=>({...x,layout:{...x.layout,...patch}})),onTitleChange:s.inlineTitle?undefined:(title:string)=>s.template==='book-front'?update(b=>({...b,title})):editPage(s.id,x=>({...x,title})),toc:s.template==='toc'?tocEntries.map(p=>({id:p.s.id,title:p.label?`${p.label}: ${p.s.title}`:p.s.title,page:sequence.starts[p.s.id]})):undefined,title:s.template==='book-front'?book.title:s.title,template:s.template,image:s.image,decals:s.decals,layout:s.layout,
                      chapterLabel:s.template==='chapter-title'?'CHAPTER '+chapterNo:undefined}}}
                  onError={e=>setError(e.message)} onChange={content=>{const before=titleFromContent(s.content),after=titleFromContent(content);editPage(s.id,x=>syncTitle(editTracked(x,content,tracking)));if(s.template==='book-front'&&after&&before===book.title&&after!==before)update(b=>({...b,title:after}));}}/>}
              </article>
                <div className="section-controls" aria-label={`Section ${i+1} actions`}>
                  <button className="section-add" onClick={()=>{select(s.id);setGallery(true)}} aria-label="Add section after this" title="Add a page after this one"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Add page</button>
                  <details className="section-menu"><summary aria-label="Page actions" title="More for this page"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></summary><div className="section-menu-list"><button onClick={e=>{(e.currentTarget.closest('details') as HTMLDetailsElement).open=false;select(s.id);openDesign('This page')}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>Page design…</button><button className="section-delete" disabled={pages.length===1} onClick={e=>{(e.currentTarget.closest('details') as HTMLDetailsElement).open=false;void removePage(s.id)}} aria-label="Delete section"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>Delete page</button></div></details>
                </div>
              </div>
              );
              pageCache.current.set(s.id,{deps,el});
              return el;
            })}
          </div>
          <p className="canvas-note">
            Text flows automatically onto continuation pages. Add or delete sections using the controls below each section; to shorten a continuation page, edit its text.
          </p>
          <PageIndicator current={pageNow.current} total={sequence.total} visible={pageNow.scrolling}/>
        </main>
        <aside className={`page-tools ${toolTab?'is-expanded':''}`} aria-label="Page tools">
          <div className="tool-rail" role="tablist" aria-label="Page editing" aria-orientation="vertical">{([['Image','Picture',<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/></>],['Text','Text box',<><path d="M5 7V5h14v2M12 5v14M9 19h6"/></>],['Decorations','Ornaments',<><path d="M12 3c1.5 3 3 4.5 6 6-3 1.5-4.5 3-6 6-1.5-3-3-4.5-6-6 3-1.5 4.5-3 6-6z"/><path d="M5 19h14"/></>]] as [string,string,React.ReactNode][]).map(([tab,label,icon])=><button key={tab} role="tab" aria-label={tab} title={label} aria-selected={toolTab===tab} aria-controls="contextual-tools" onClick={()=>setToolTab(toolTab===tab?'':tab)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg><small>{label}</small></button>)}</div>
          <div className="tool-content" id="contextual-tools" hidden={!toolTab} role="tabpanel" aria-label={toolTab||'Page editing tools'}>
          <div className="tool-panel-heading"><strong>{({Image:'Pictures',Text:'Text box',Decorations:'Ornaments',Settings:'Settings'} as Record<string,string>)[toolTab]||toolTab}</strong><button aria-label="Close tool panel" onClick={()=>setToolTab('')}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
          {toolTab==='Settings'&&<div className="settings-shortcuts">
            <h3>Design your book</h3>
            <button onClick={()=>setPanel('cover')}>Cover &amp; spine</button>
            <button onClick={()=>openDesign('Text')}>Text &amp; fonts</button>
            <button onClick={()=>openDesign('Paper')}>Book size &amp; margins</button>
            <button onClick={()=>openDesign('This page')}>This page</button>
            <button onClick={()=>setPanel('themes')}>Book themes</button>
            <h3>Share your book</h3>
            <button onClick={()=>publish('preview')}>Preview &amp; print</button>
            <button onClick={()=>publish('PDF')}>Download as PDF</button>
            <button onClick={()=>publish('EPUB')}>Download as e-book (EPUB)</button>
          </div>}
          <ImageLibrary assets={book.images||[]} scenes={pages.map(p=>p.s)} onChange={editPage} onUpload={choosePicture} visible={toolTab==='Image'}/>
          {toolTab==='Text'&&<>{isIllustration(scene.template)?scene.overlay?<OverlayTextTools overlay={scene.overlay} customFonts={book.customFonts} onChange={patch=>editPage(scene.id,s=>s.overlay?{...s,overlay:{...s.overlay,...patch}}:s)}/>:<><p className="tool-hint">Put words right on top of this picture.</p><button onClick={()=>editPage(scene.id,s=>({...s,overlay:s.overlay||{text:'Your text',x:15,y:20,size:32,color:'#222222'}}))}>Add text to picture</button></>:<div className="quick-text"><p className="tool-hint">Click any page to start typing. These change the text of the whole book.</p>
            <Choice label="Text size" columns={2} options={TEXT_SIZES} value={nearest(TEXT_SIZES,a.bodySize,16)} onChange={v=>appearance('bodySize',v)}/>
            <Choice label="Line spacing" columns={2} options={LINE_SPACING} value={nearest(LINE_SPACING,a.lineHeight,1.6)} onChange={v=>appearance('lineHeight',v)}/>
            <button onClick={()=>openDesign('Text')}>Fonts and more…</button></div>}</>}
          <DecalTray scenes={pages.map(p=>p.s)} onChange={editPage} visible={toolTab==='Decorations'}/>
          </div>
        </aside>
        {panel==='export'&&(
          <ToolDialog name="Preview & export" className="export-dialog" onClose={()=>setPanel('')}>
            <ExportPanel book={book} pages={sequence.total} busy={exporting}
              onPrinter={printer=>update(b=>({...b,appearance:{...b.appearance,printer}}))}
              onFix={patch=>update(b=>({...b,appearance:{...b.appearance,...patch}}))}
              onGoTo={id=>{setPanel('');setBookView('write');select(id,true);}}
              onPreview={()=>{setPanel('');void publish('preview');}} onPdf={()=>void publish('PDF')} onEpub={()=>void publish('EPUB')} onClose={()=>setPanel('')}
              onCover={()=>setPanel('cover')} onCoverPdf={()=>void downloadCover(book.cover??defaultCover(book))}/>
          </ToolDialog>
        )}
        {panel==='cover'&&(
          <ToolDialog name="Cover & spine" className="cover-dialog" onClose={()=>setPanel('')}>
            <CoverDesigner book={book} pages={sequence.total} busy={exporting}
              onChange={cover=>update(b=>({...b,cover}))} onAddImage={addCoverImage} onDownload={c=>void downloadCover(c)} onClose={()=>setPanel('')}/>
          </ToolDialog>
        )}
        {panel && panel!=='export' && panel!=='cover' && (
          <ToolDialog name={dialogTitle} className={panel==='style'||panel==='image'?'side-sheet':''} modal={!(panel==='style'||panel==='image')} onClose={()=>setPanel('')}>
            <div className="panel-heading">
              <h2>{dialogTitle}</h2>
              <button aria-label="Close settings" onClick={() => setPanel("")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
            </div>
            {panel!=='style'&&panel!=='find'&&panel!=='themes'&&<p className="muted">On page: {scene.title || 'Untitled page'}</p>}
            {panel==='themes'&&<><p className="muted">A theme changes the fonts, spacing and book size all at once. Your words and pictures stay exactly as they are.</p><div className="theme-options">{bookPresets.filter(p=>p.id!=='blank').map(p=>{const appearance=createPresetBook(p.id).appearance;return <button key={p.id} aria-label={`Select ${p.name} theme`} aria-pressed={selectedTheme===p.id} onClick={()=>setSelectedTheme(p.id)}><PageThumbnail style={p.style} title={presetSampleTitle(p.id)}/><strong>{selectedTheme===p.id?'✓ ':''}{p.name}</strong><small>{appearance.bodyFont} text<br/>{appearance.preset==='Custom'?'Custom size':appearance.preset} pages</small></button>;})}</div><footer className="dialog-actions"><button onClick={()=>setPanel('')}>Cancel</button><button className="primary" disabled={!selectedTheme} onClick={()=>{const preset=createPresetBook(selectedTheme);update(b=>({...b,appearance:{...b.appearance,paragraphIndent:0,paragraphAlign:'left',...preset.appearance}}));setEpoch(x=>x+1);setPanel('');}}>Use this theme</button></footer></>}
            {panel === "style" && (
              <BookDesignPanel key={designTab} book={book} chapter={chapter} scene={scene} pageCount={pages.length} sheetCount={sequence.total} initialTab={designTab} actions={{
                appearance:patch=>update(b=>({...b,appearance:{...b.appearance,...patch}})),
                book:patch=>update(b=>({...b,...patch})),
                page:fn=>editPage(scene.id,fn),
                movePage,
                moveToChapter:id=>update(b=>moveScene(b,scene.id,id,999)),
                removePage:()=>removePage(),
                openImage:()=>setPanel('image'),
                preview:()=>{setPanel('');setBookView('3d');},
              }}/>
            )}
            {panel === "image" && (
              <PictureSettings image={scene.image} canCrop={!!scene.image&&isIllustration(scene.template)} pageWidthMm={width} pageHeightMm={height} textWidthMm={width-2*a.margin}
                onPick={choosePictureForPage}
                onCrop={()=>{setPanel('');setBookView('write');requestAnimationFrame(()=>{const art=document.getElementById('page-'+scene.id)?.querySelector('.illustration-art');art?.scrollIntoView({block:'center'});art?.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));});}}
                onChange={patch=>editPage(scene.id,s=>s.image?{...s,image:{...s.image,...patch}}:s)}
                onRemove={()=>{update(b=>addRevision(b,'Before removing picture'));editPage(scene.id,s=>({...s,image:undefined}));}}/>
            )}
            {panel === "find" && (
              <>
                <input
                  aria-label="Find in document"
                  placeholder="Search all pages"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query.trim() && <p role="status">{searchResults.length ? `${searchResults.reduce((n,r)=>n+r.count,0)} matches in ${searchResults.length} sections` : 'No results'}</p>}
                {searchResults.map(result=><button key={result.scene.id} className="search-result" onClick={()=>{
                  select(result.scene.id);setBookView('write');setPanel('');
                  setPendingFind({sceneId:result.scene.id,query:query.trim()});
                }}><strong>{result.scene.title}</strong><span style={{display:'block'}}>{result.before}<mark>{result.match}</mark>{result.after}</span><small>{result.count} {result.count===1?'match':'matches'} · Go to first match</small></button>)}
                <p className="muted">
                  Text replacement is available for the selected page in the
                  formatting bar.
                </p>
              </>
            )}
            {panel === "review" && (
              <>
                <div className="review-tabs" role="tablist" aria-label="Review tools" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));const index=tabs.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();tabs[next].click();}}>{([['Comments','Comments'],['Changes','Track changes'],['History','Earlier versions'],['References','Characters & places']] as const).map(([tab,label])=><button key={tab} role="tab" aria-selected={reviewTab===tab} onClick={()=>setReviewTab(tab)}>{label}</button>)}</div>
                <section role="tabpanel" aria-label={reviewTab} className="review-section">
                {reviewTab==='Changes'&&<>
                <h3>Track changes</h3>
                <label><input type="checkbox" checked={tracking} onChange={e=>setTracking(e.target.checked)}/> Remember my original text while I edit</label>
                <p className="muted">Turn this on before revising a page. Afterwards you can compare old and new, then keep your edits or go back to the original. Downloads always use your newest text.</p>
                <ChangeReview scene={scene} onChange={next=>{editPage(scene.id,()=>next);setEpoch(x=>x+1);}} />
                </>}
                {reviewTab==='Comments'&&<>
                <h3>Notes on this page</h3>
                <p className="muted">Leave yourself reminders. Comments never appear in the printed book.</p>
                <form className="review-form" onSubmit={e=>{e.preventDefault();const text=draftNote.trim();if(!text)return;editPage(scene.id,s=>({...s,comments:[...(s.comments||[]),{id:uid(),text:text.slice(0,2000),resolved:false}]}));setDraftNote('');}}>
                  <textarea aria-label="New comment" placeholder="e.g. Make this scene more tense" value={draftNote} maxLength={2000} onChange={e=>setDraftNote(e.target.value)}/>
                  <button className="primary" disabled={!draftNote.trim()}>Add comment</button>
                </form>
                {!scene.comments?.length&&<p className="muted">No comments on this page yet.</p>}
                {scene.comments?.map((c) => (
                  <div className={`review-card ${c.resolved?'resolved':''}`} key={c.id}>
                    <p>{c.resolved?'✓ ':''}{c.text}</p>
                    <button onClick={()=>editPage(scene.id,(s)=>({...s,comments:s.comments?.map((x)=>x.id===c.id?{...x,resolved:!x.resolved}:x)}))}>
                      {c.resolved ? "Reopen" : "Mark done"}
                    </button>
                    <button onClick={()=>editPage(scene.id,(s)=>({...s,comments:s.comments?.filter((x)=>x.id!==c.id)}))}>Delete</button>
                  </div>
                ))}
                </>}
                {reviewTab==='References'&&<>
                <h3>Who and where is on this page?</h3>
                <p className="muted">Keep track of the characters and places that show up here.</p>
                {refDraft?<form className="review-form" onSubmit={e=>{e.preventDefault();if(!refDraft.name.trim())return;const r={id:uid(),kind:refDraft.kind,name:refDraft.name.trim().slice(0,200),notes:refDraft.notes.trim().slice(0,2000)};editPage(scene.id,s=>({...s,references:[...(s.references||[]),r]}));setRefDraft(null);}}>
                  <input autoFocus aria-label={refDraft.kind==='Character'?'Character name':'Place name'} placeholder={refDraft.kind==='Character'?'Character name':'Place name'} value={refDraft.name} maxLength={200} onChange={e=>setRefDraft({...refDraft,name:e.target.value})}/>
                  <textarea aria-label="Notes" placeholder="Notes (optional)" value={refDraft.notes} maxLength={2000} onChange={e=>setRefDraft({...refDraft,notes:e.target.value})}/>
                  <div><button className="primary" disabled={!refDraft.name.trim()}>Add</button> <button type="button" onClick={()=>setRefDraft(null)}>Cancel</button></div>
                </form>:<div>{(["Character", "Location"] as const).map((kind) => (
                  <button key={kind} onClick={()=>setRefDraft({kind,name:'',notes:''})}>
                    + {kind==='Character'?'Character':'Place'}
                  </button>
                ))}</div>}
                {scene.references?.map((r) => (
                  <div className="review-card" key={r.id}>
                    <strong>
                      {r.kind==='Location'?'Place':'Character'}: {r.name}
                    </strong>
                    {r.notes&&<p>{r.notes}</p>}
                    <button onClick={()=>editPage(scene.id,(s)=>({...s,references:s.references?.filter((x)=>x.id!==r.id)}))}>
                      Remove
                    </button>
                  </div>
                ))}
                </>}
                {reviewTab==='History'&&<>
                <h3>Earlier versions</h3>
                <p className="muted">
                  Bibliarch keeps a few earlier copies of your book while you work, so you can go back if something goes wrong. Save one yourself before big changes.
                </p>
                <button onClick={() => update((b) => addRevision(b, "Manual review snapshot"))}>
                  Save a copy of this version
                </button>
                {!book.revisions.length&&<p className="muted">No earlier versions yet.</p>}
                {book.revisions.slice().reverse().map((r) => (
                  <div className="review-card" key={r.id}>
                    <strong>{versionLabel(r.kind)}</strong>
                    <p>{new Date(r.at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})} · {r.chapters.reduce((n,c)=>n+c.scenes.reduce((n,s)=>n+wordCount(s.content),0),0).toLocaleString()} words</p>
                    <button
                      onClick={async () => {
                        if (!(await askConfirm({title: 'Go back to this version?', message: 'A copy of your current book is saved first, so you can undo this.', confirmLabel: 'Restore version'}))) return;
                        const b = restoreRevision(book, r.id);
                        commit({
                          ...latest.current!,
                          books: lib.books.map((x) => (x.id === b.id ? b : x)),
                          activeScene: b.chapters[0].scenes[0].id,
                        });
                        setEpoch((x) => x + 1);
                      }}
                    >
                      Go back to this version
                    </button>
                  </div>
                ))}
                </>}
                </section>
              </>
            )}
          </ToolDialog>
        )}
      </div>
      <footer className="statusbar">
        <GoalChip goal={goal.goal} words={goal.words} streak={goal.streak} setGoal={goal.setGoal}/>
        <span>
          Page {pageNow.current} of {sequence.total} · This book: {plural(pages.reduce((n, { s }) => n + wordCount(s.content), 0),'word')}
        </span>
      </footer>
      {preview && (
        <div className="modal" role="dialog" aria-label="Print preview">
          <div>
            <strong>Preview: this is how your printed book will look</strong>
            <button className="primary" onClick={() => publish("PDF")}>Download PDF</button>
            <button onClick={() => publish("EPUB")}>Download e-book (EPUB)</button>
            <button onClick={() => {URL.revokeObjectURL(preview);setPreview("");}}>Close</button>
          </div>
          <iframe
            title="Print preview"
            src={preview}
          />
        </div>
      )}
    </div></>
  );
}
