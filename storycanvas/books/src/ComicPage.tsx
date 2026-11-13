'use client';
import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import type {ImageAsset, Scene} from './model';
import {decalSource} from './design';
import {artworkOverflowCss} from './artwork-overflow';
import {comicOf, panelBoxes, visiblePanels, artBox, panFocus, clipPath, svgPoints, comicCss, layoutById, MAX_BUBBLES, type ComicPage as Comic, type ComicPanel, type ComicBubble, type ComicBubbleKind, type ComicTail} from './comic';

/** Small drawing of a panel layout, for the layout picker and page thumbnails. */
export function ComicLayoutIcon({comic, width = 36, height = 48}: {comic: Comic; width?: number; height?: number}) {
  const boxes = panelBoxes({...comic, marginMm: 6, gutterMm: Math.max(2.5, comic.gutterMm)}, 100, 140);
  return <svg className="comic-layout-icon" width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
    <rect x="0" y="0" width="100" height="100" fill="#fff"/>
    {boxes.map(b => <polygon key={b.index} points={svgPoints(b.shape)} fill="#ece6d8" stroke="#3a3326" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>)}
  </svg>;
}

type Selection = {panel: number; bubble?: string} | null;
const BUBBLE_LABEL: Record<ComicBubbleKind, string> = {speech: 'Speech bubble', thought: 'Thought bubble', caption: 'Caption box'};
const TAILS: {value: ComicTail; label: string}[] = [
  {value: 'bottom-left', label: 'Pointer bottom left'}, {value: 'bottom-right', label: 'Pointer bottom right'},
  {value: 'top-left', label: 'Pointer top left'}, {value: 'top-right', label: 'Pointer top right'}, {value: 'none', label: 'No pointer'},
];

/**
 * A comic / manga page in the editor. Panels come from a layout template; each one
 * holds the writer's own art (from the book's picture library) and optional bubbles.
 * Gestures update a local draft and save once, when the pointer is released.
 */
export default function ComicPage({scene, assets = [], width, height, widthMm, heightMm, onChange, onUploadArt, onOpenLayout}: {
  scene: Scene; assets?: ImageAsset[]; width: number; height: number; widthMm: number; heightMm: number;
  onChange: (comic: Comic) => void;
  /** Adds the file to the book's pictures and puts it in panel `index`. */
  onUploadArt: (file: File, index: number) => void;
  onOpenLayout: () => void;
}) {
  const saved = comicOf(scene);
  const [draft, setDraft] = useState<Comic | null>(null);
  const comic = draft ?? saved;
  const draftRef = useRef(draft); draftRef.current = draft;
  const [selected, setSelected] = useState<Selection>(null);
  const root = useRef<HTMLElement>(null), file = useRef<HTMLInputElement>(null), uploadTarget = useRef(0);
  const gesture = useRef<{kind: 'pan' | 'move' | 'resize'; x: number; y: number; start: Comic; panel: number; bubble?: string; w: number; h: number; moved: boolean} | null>(null);
  const boxes = panelBoxes(comic, widthMm, heightMm), panels = visiblePanels(comic);
  const asset = (p?: ComicPanel) => p?.assetId ? assets.find(a => a.id === p.assetId) : undefined;
  const save = (next: Comic) => { setDraft(null); onChange(next); };
  const patchPanel = (i: number, patch: Partial<ComicPanel>, c = comic): Comic => ({...c, panels: c.panels.map((p, k) => k === i ? {...p, ...patch} : p)});
  const patchBubble = (i: number, id: string, patch: Partial<ComicBubble>, c = comic): Comic => patchPanel(i, {bubbles: (c.panels[i].bubbles || []).map(b => b.id === id ? {...b, ...patch} : b)}, c);
  const allBubbles = panels.flatMap((p, i) => (p.bubbles || []).map(b => ({b, i})));
  const current = selected?.bubble ? allBubbles.find(x => x.b.id === selected.bubble) : undefined;

  // The toolbar floats just above the page (portaled out of the zoomed page), so it never covers
  // the panels or a bubble you just added. When the page top scrolls away it stays at the top of
  // the screen instead, and it never runs off the bottom.
  const bar = useRef<HTMLDivElement>(null);
  const [barStyle, setBarStyle] = useState<CSSProperties>({position: 'fixed', visibility: 'hidden'});
  useLayoutEffect(() => {
    if (!selected) return;
    const place = () => {
      const page = root.current?.getBoundingClientRect(), h = bar.current?.offsetHeight ?? 0;
      if (!page) return;
      // Stay inside the scrolling editor area: never over the app's own top bar.
      let scroller: HTMLElement | null = root.current?.parentElement ?? null;
      while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
      const area = scroller?.getBoundingClientRect() ?? {top: 0, bottom: window.innerHeight};
      const top = Math.min(Math.max(page.top - h - 12, area.top + 8), area.bottom - h - 8);
      setBarStyle({position: 'fixed', top, left: page.left + page.width / 2, transform: 'translateX(-50%)', margin: 0, zIndex: 60, maxWidth: Math.min(page.width + 120, window.innerWidth - 24)});
    };
    place();
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    return () => { window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [selected, current?.b.id]);

  // Clicking anywhere else (except this page's toolbar) ends the selection.
  useEffect(() => {
    if (!selected) return;
    const away = (e: PointerEvent) => { const t = e.target as HTMLElement; if (!root.current?.contains(t) && !bar.current?.contains(t)) setSelected(null); };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && selected.bubble && !(e.target as HTMLElement)?.closest?.('input,textarea,select,[contenteditable=true]')) {
        e.preventDefault(); save(patchPanel(selected.panel, {bubbles: (comic.panels[selected.panel].bubbles || []).filter(b => b.id !== selected.bubble)})); setSelected({panel: selected.panel});
      }
    };
    document.addEventListener('pointerdown', away, true); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', away, true); document.removeEventListener('keydown', key); };
  });

  const begin = (e: React.PointerEvent, kind: 'pan' | 'move' | 'resize', panel: number, bubble?: string) => {
    if (e.button !== 0) return;
    const page = root.current!.getBoundingClientRect(), b = boxes[panel];
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    gesture.current = {kind, x: e.clientX, y: e.clientY, start: comic, panel, bubble, w: kind === 'pan' ? page.width * b.width / 100 : page.width, h: kind === 'pan' ? page.height * b.height / 100 : page.height, moved: false};
  };
  const drag = (e: React.PointerEvent) => {
    const g = gesture.current; if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 3) return;
    g.moved = true;
    if (g.kind === 'pan') {
      const p = g.start.panels[g.panel], a = asset(p); if (!a) return;
      const b = boxes[g.panel], pa = (b.width * widthMm) / (b.height * heightMm || 1);
      setDraft(patchPanel(g.panel, panFocus(g.w, g.h, pa, a.naturalWidth / a.naturalHeight, p, dx, dy), g.start));
    } else if (g.bubble) {
      const b = (g.start.panels[g.panel].bubbles || []).find(x => x.id === g.bubble)!;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      setDraft(patchBubble(g.panel, g.bubble, g.kind === 'move'
        ? {x: clamp(b.x + dx / g.w * 100, -20, 120), y: clamp(b.y + dy / g.h * 100, -20, 120)}
        : {width: clamp(b.width + dx / g.w * 100, 5, 100)}, g.start));
    }
  };
  const end = () => { const g = gesture.current; if (!g) return; gesture.current = null; if (g.moved && draftRef.current) save(draftRef.current); else setDraft(null); };
  const commitDraft = () => { if (draftRef.current) save(draftRef.current); };

  // A new bubble's starter text ("Hello!") is selected when it opens, so typing replaces it
  // instead of landing in front of it. Existing bubbles keep the caret where the user clicks.
  const freshBubble = useRef<string | null>(null);
  const addBubble = (kind: ComicBubbleKind) => {
    if (!selected) return;
    const i = selected.panel, b = boxes[i], list = comic.panels[i].bubbles || [];
    if (list.length >= MAX_BUBBLES) return;
    const width = Math.min(Math.max(b.width * (kind === 'caption' ? 0.6 : 0.5), 14), 60);
    const bubble: ComicBubble = {id: crypto.randomUUID(), kind, text: kind === 'caption' ? 'Meanwhile…' : kind === 'thought' ? 'Hmm…' : 'Hello!', width,
      x: kind === 'caption' ? b.left + 2 : b.left + (b.width - width) / 2, y: kind === 'caption' ? b.top + 2 : b.top + b.height * 0.12 + list.length * 3, sizePt: 9, tail: kind === 'caption' ? undefined : 'bottom-left'};
    save(patchPanel(i, {bubbles: [...list, bubble]}));
    freshBubble.current = bubble.id;
    setSelected({panel: i, bubble: bubble.id});
  };
  const pick = (i: number) => { uploadTarget.current = i; file.current?.click(); };
  const sel = selected ? panels[selected.panel] : undefined, selArt = asset(sel);

  return <section ref={root} className="pagination-page comic-page comic-editor" style={{width, height}} aria-label={`Comic page, ${layoutById(comic.layout).name}${comic.rtl ? ', read right to left' : ''}`}
    onDoubleClick={e => e.stopPropagation()}>
    <style>{comicCss + artworkOverflowCss}</style>
    <input ref={file} hidden type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload panel art" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onUploadArt(f, uploadTarget.current); }}/>
    {boxes.map(b => {
      const p = panels[b.index], a = asset(p), pa = (b.width * widthMm) / (b.height * heightMm || 1);
      const box = a ? artBox(pa, a.naturalWidth / a.naturalHeight, p) : null;
      const isSel = selected?.panel === b.index && !selected.bubble;
      return <div key={b.index} className={`comic-panel${isSel ? ' is-selected' : ''}${a ? ' has-art' : ''}`} data-panel={b.index} role="group" tabIndex={0}
        aria-label={`Panel ${b.index + 1}${a ? `: ${a.name}` : ', empty'}`}
        style={{left: b.left + '%', top: b.top + '%', width: b.width + '%', height: b.height + '%', clipPath: clipPath(b.clip)}}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected({panel: b.index}); } }}
        onPointerDown={e => { const was = selected?.panel === b.index && !selected.bubble; setSelected({panel: b.index}); if (was && a) begin(e, 'pan', b.index); else e.stopPropagation(); }}
        onPointerMove={drag} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
        onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.stopPropagation(); } }}
        onDrop={e => { const f = e.dataTransfer.files?.[0]; if (f) { e.preventDefault(); e.stopPropagation(); setSelected({panel: b.index}); onUploadArt(f, b.index); } }}>
        {a && box && <img src={a.src} alt={p.alt ?? a.name} draggable={false} style={{left: box.left + '%', top: box.top + '%', width: box.width + '%', height: box.height + '%'}}/>}
        {!a && <span className="comic-empty comic-editor-only"><span className="comic-panel-number">{b.index + 1}</span>
          <button type="button" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setSelected({panel: b.index}); pick(b.index); }}>Add art</button></span>}
      </div>;
    })}
    {comic.borderMm > 0 && <svg className="comic-borders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {boxes.map(b => <polygon key={b.index} points={svgPoints(b.shape)} fill="none" stroke="#111" strokeWidth={comic.borderMm * 3.78} vectorEffect="non-scaling-stroke"/>)}
    </svg>}
    <svg className="comic-borders comic-editor-only" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {boxes.filter(b => selected?.panel === b.index && !selected.bubble).map(b => <polygon key={b.index} className="comic-selection" points={svgPoints(b.shape)} vectorEffect="non-scaling-stroke"/>)}
    </svg>
    {boxes.map(b => <span key={b.index} aria-hidden="true" className="comic-order comic-editor-only" style={{left: `calc(${comic.rtl ? b.left + b.width : b.left}% ${comic.rtl ? '- 26px' : '+ 6px'})`, top: `calc(${b.top}% + 6px)`}}>{b.index + 1}</span>)}
    {allBubbles.map(({b, i}) => {
      const isSel = selected?.bubble === b.id;
      const style: CSSProperties = {left: b.x + '%', top: b.y + '%', width: b.width + '%', fontSize: b.sizePt + 'pt'};
      return <div key={b.id} className={`comic-bubble ${b.kind}${isSel ? ' is-selected' : ''}`} style={style}
        onPointerDown={e => { if ((e.target as HTMLElement).closest('textarea,.comic-resize')) return; setSelected({panel: i, bubble: b.id}); begin(e, 'move', i, b.id); }}
        onPointerMove={drag} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
        {isSel ? <textarea aria-label={`${BUBBLE_LABEL[b.kind]} text`} value={b.text} maxLength={2000} rows={Math.max(1, b.text.split('\n').length)} autoFocus
          onFocus={e => { if (freshBubble.current === b.id) { freshBubble.current = null; e.currentTarget.select(); } }}
          onChange={e => save(patchBubble(i, b.id, {text: e.target.value}))} onPointerDown={e => e.stopPropagation()}/> : b.text || ' '}
        {b.kind !== 'caption' && b.tail && b.tail !== 'none' && <span className={`comic-tail ${b.tail}`}/>}
        {isSel && <span className="comic-resize comic-editor-only" role="slider" aria-label="Bubble width" aria-valuenow={Math.round(b.width)} aria-valuemin={5} aria-valuemax={100} tabIndex={0}
          onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); save(patchBubble(i, b.id, {width: Math.max(5, Math.min(100, b.width + (e.key === 'ArrowRight' ? 2 : -2)))})); } }}
          onPointerDown={e => begin(e, 'resize', i, b.id)} onPointerMove={drag} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}/>}
      </div>;
    })}
    {[false, true].map(ghost => <div key={String(ghost)} aria-hidden={ghost || undefined} className={ghost ? 'artwork-overflow-ghost decal-overflow-ghost' : 'artwork-clip'} style={{zIndex: 5}}>{(scene.decals || []).map(d => { try { return <img key={d.id} data-decal-id={ghost ? undefined : d.id} data-decal-proxy={ghost ? d.id : undefined} draggable={false} src={decalSource(d.src, d.color)} alt="" className="decal" style={{position: 'absolute', left: `${d.x}%`, top: `${d.y}%`, width: `${d.width}%`, height: 'auto', maxWidth: 'none', transform: `rotate(${d.rotation}deg)`, opacity: d.opacity, pointerEvents: 'auto'}}/>; } catch { return null; } })}</div>)}

    {selected && typeof document !== 'undefined' && createPortal(<div ref={bar} style={barStyle} className="image-mini-toolbar comic-toolbar comic-floating comic-editor-only" role="toolbar" aria-label={current ? BUBBLE_LABEL[current.b.kind] : `Panel ${selected.panel + 1}`} onPointerDown={e => e.stopPropagation()}>
      {current ? <>
        <strong>{BUBBLE_LABEL[current.b.kind]}</strong>
        <select aria-label="Kind of bubble" value={current.b.kind} onChange={e => save(patchBubble(current.i, current.b.id, {kind: e.target.value as ComicBubbleKind}))}>
          {(Object.keys(BUBBLE_LABEL) as ComicBubbleKind[]).map(k => <option key={k} value={k}>{BUBBLE_LABEL[k]}</option>)}</select>
        {current.b.kind !== 'caption' && <select aria-label="Pointer" value={current.b.tail ?? 'none'} onChange={e => save(patchBubble(current.i, current.b.id, {tail: e.target.value as ComicTail}))}>
          {TAILS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select>}
        <button type="button" aria-label="Smaller text" disabled={current.b.sizePt <= 5} onClick={() => save(patchBubble(current.i, current.b.id, {sizePt: Math.max(5, current.b.sizePt - 1)}))}>A−</button>
        <button type="button" aria-label="Larger text" disabled={current.b.sizePt >= 40} onClick={() => save(patchBubble(current.i, current.b.id, {sizePt: Math.min(40, current.b.sizePt + 1)}))}>A+</button>
        <button type="button" onClick={() => { save(patchPanel(current.i, {bubbles: (comic.panels[current.i].bubbles || []).filter(b => b.id !== current.b.id)})); setSelected({panel: current.i}); }}>Delete</button>
        <button type="button" onClick={() => setSelected({panel: current.i})}>Done</button>
      </> : <>
        <strong>Panel {selected.panel + 1}</strong>
        <button type="button" onClick={() => pick(selected.panel)}>{selArt ? 'Replace art' : 'Add art'}</button>
        {assets.length > 0 && <select aria-label="Use a picture from this book" value={sel?.assetId && selArt ? sel.assetId : ''} onChange={e => e.target.value && save(patchPanel(selected.panel, {assetId: e.target.value, focusX: 50, focusY: 50, zoom: 1}))}>
          <option value="">Your pictures…</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>}
        {selArt && sel && <>
          <span className="comic-segmented" role="group" aria-label="Picture size">
            <button type="button" aria-pressed={sel.fit === 'cover'} onClick={() => save(patchPanel(selected.panel, {fit: 'cover'}))}>Fill</button>
            <button type="button" aria-pressed={sel.fit === 'contain'} onClick={() => save(patchPanel(selected.panel, {fit: 'contain'}))}>Fit</button>
          </span>
          <label className="comic-zoom">Zoom<input type="range" min={1} max={4} step={0.05} value={sel.zoom} onChange={e => setDraft(patchPanel(selected.panel, {zoom: Number(e.target.value)}))} onPointerUp={commitDraft} onKeyUp={commitDraft} onBlur={commitDraft}/></label>
          <button type="button" onClick={() => save(patchPanel(selected.panel, {assetId: undefined, focusX: 50, focusY: 50, zoom: 1}))}>Remove art</button>
        </>}
        <span className="comic-divider" aria-hidden="true"/>
        <button type="button" onClick={() => addBubble('speech')}>+ Speech</button>
        <button type="button" onClick={() => addBubble('thought')}>+ Thought</button>
        <button type="button" onClick={() => addBubble('caption')}>+ Caption</button>
        <button type="button" onClick={onOpenLayout}>Page layout…</button>
        {selArt && <small className="comic-hint">Drag the picture to move it inside the panel.</small>}
      </>}
    </div>, document.body)}
  </section>;
}
