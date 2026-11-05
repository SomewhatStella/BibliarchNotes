'use client';
import {useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Choice} from './BookDesignPanel';
import {COVER_PALETTES, COVER_STYLES, BLEED_MM, coverGeometry, coverImagePpi, coverParts, coverRender, defaultCover, type Cover, type CoverRender} from './cover';
import {fonts, type Book} from './model';
import {fontLabel} from './design';
import {PRINTERS} from './print-check';

type View = 'whole' | 'front' | 'spine' | 'back';
const PX = 96 / 25.4;
const inch = (mm: number) => (mm / 25.4).toFixed(2).replace(/\.?0+$/, '');

/** The real cover HTML in a shadow root, framed on one part of the wrap (front, spine, back or all). */
export function CoverView({render, view = 'whole', guides = false, className, fixed}: {render: CoverRender; view?: View; guides?: boolean; className?: string; fixed?: {w: number; h: number}}) {
  const host = useRef<HTMLDivElement>(null), box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{w: number; h: number}>(fixed ?? {w: 0, h: 0});
  const parts = useMemo(() => coverParts(render, {guides}), [render, guides]);
  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    const root = el.shadowRoot ?? el.attachShadow({mode: 'open'});
    root.innerHTML = `<style>${parts.css}:host{display:block}</style>${parts.body}`;
  }, [parts]);
  useEffect(() => {
    if (fixed || !box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({w: e.contentRect.width, h: e.contentRect.height}));
    ro.observe(box.current); return () => ro.disconnect();
  }, [fixed]);
  const b = BLEED_MM, w = render.trimW, s = render.spine, H = parts.height;
  const region = view === 'front' ? {x: b + w + s, w: w + b} : view === 'back' ? {x: 0, w: w + b} : view === 'spine' ? {x: b + w, w: s} : {x: 0, w: parts.width}; // spine view: just the spine, none of the front or back
  const scale = size.w && size.h ? Math.min(size.w / (region.w * PX), size.h / (H * PX)) : 0;
  return <div ref={box} className={`cover-view${className ? ' ' + className : ''}`} style={fixed ? {width: fixed.w, height: fixed.h} : undefined}>
    <div className="cover-window" style={{width: region.w * PX * scale, height: H * PX * scale}}>
      <div ref={host} className="cover-sheet" style={{width: parts.width * PX, height: H * PX, transform: `translateX(${-region.x * PX * scale}px) scale(${scale})`}}/>
    </div>
  </div>;
}

/** Small front-cover thumbnail; only redraws when the cover itself changes, not on every keystroke. */
export function OutlineCover({book, pages}: {book: Book; pages: number}) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const render = useMemo(() => coverRender(book, pages, book.cover ?? defaultCover(book)), [book.cover, book.title, book.appearance, book.images, book.customFonts, pages]);
  return <CoverView render={render} view="front" fixed={{w: 30, h: 44}}/>;
}

function Field({label, children, hint}: {label: string; children: ReactNode; hint?: string}) {
  return <label className="bd-text cover-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

/** Cover & spine: design the printed wraparound cover and download it for the printer. */
export default function CoverDesigner({book, pages, busy, onChange, onAddImage, onDownload, onClose}: {
  book: Book; pages: number; busy: boolean;
  onChange: (cover: Cover) => void; onAddImage: (file: File) => Promise<string | undefined>;
  onDownload: (cover: Cover) => void; onClose: () => void;
}) {
  const cover = useMemo(() => book.cover ?? defaultCover(book), [book]);
  const set = (patch: Partial<Cover>) => onChange({...cover, ...patch});
  const setSpine = (patch: NonNullable<Cover['spine']>) => set({spine: {...cover.spine, ...patch}});
  const [tab, setTab] = useState<'Front' | 'Spine' | 'Back'>('Front');
  const [view, setView] = useState<View>('whole');
  const [guides, setGuides] = useState(true);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const g = coverGeometry(book, pages, cover);
  const render = useMemo(() => coverRender(book, pages, cover), [book, pages, cover]);
  const printer = book.appearance.printer ?? 'home';
  const ppi = coverImagePpi(book, cover, pages);
  const words = (cover.blurb ?? '').trim().split(/\s+/).filter(Boolean).length;
  const palette = COVER_PALETTES.find(p => p.bg === cover.bg && p.fg === cover.fg && p.accent === cover.accent)?.id;
  const allFonts = [...fonts, ...(book.customFonts || []).map(f => f.family)];
  const pickTab = (t: typeof tab) => { setTab(t); setView(t === 'Front' ? 'front' : t === 'Spine' ? 'spine' : 'back'); };

  return <div className="cover-designer">
    <div className="panel-heading"><h2>Cover &amp; spine</h2><button aria-label="Close" onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div className="cover-body">
      <div className="cover-stage">
        <div className="cover-viewbar" role="group" aria-label="Show">
          {(['whole', 'front', 'spine', 'back'] as View[]).map(v => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{{whole: 'Whole cover', front: 'Front', spine: 'Spine', back: 'Back'}[v]}</button>)}
          <label className="cover-guides"><input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)}/> Print guides</label>
        </div>
        <div className="cover-preview-wrap">
          <CoverView render={render} view={view} guides={guides} className="cover-preview"/>
          {view === 'spine' && g.spine < 3 && <p className="cover-thin-note">Your spine is only {g.spineIn.toFixed(3)} in wide, so it’s just a thin line for now. It gets wider as your book grows.</p>}
        </div>
        <div className="cover-measure">
          <span><b>Cover file</b> {inch(g.width)} × {inch(g.height)} in</span>
          <span><b>Spine</b> {g.spineIn.toFixed(3)} in</span>
          <span><b>Each side</b> {inch(g.trimW)} × {inch(g.trimH)} in</span>
          {guides && <span className="cover-legend"><i className="lg-red"/>Trim &amp; fold <i className="lg-blue"/>Keep words inside</span>}
        </div>
      </div>
      <div className="cover-controls book-design">
        <div className="bd-tabs" role="tablist" aria-label="Cover parts">
          {(['Front', 'Spine', 'Back'] as const).map(t => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => pickTab(t)}>{t}</button>)}
        </div>
        <div className="bd-scroll" role="tabpanel">
          {tab === 'Front' && <>
            <section className="bd-section">
              <h3>Look</h3>
              <div className="cover-styles" role="group" aria-label="Cover look">
                {COVER_STYLES.map(st => <button key={st.id} type="button" aria-pressed={cover.style === st.id} title={st.hint} onClick={() => set({style: st.id})}>
                  <CoverView render={{...render, cover: {...cover, style: st.id}}} view="front" fixed={{w: 76, h: 112}}/>
                  <strong>{st.name}</strong>
                  {cover.style === st.id && <span className="bd-check-badge" aria-hidden="true">✓</span>}
                </button>)}
              </div>
            </section>
            <section className="bd-section">
              <h3>Colours</h3>
              <div className="cover-palettes" role="group" aria-label="Colours">
                {COVER_PALETTES.map(p => <button key={p.id} type="button" aria-pressed={palette === p.id} title={p.name} aria-label={p.name} onClick={() => set({bg: p.bg, fg: p.fg, accent: p.accent})}>
                  <span style={{background: p.bg, color: p.fg}}>Aa<i style={{background: p.accent}}/></span><small>{p.name}</small>
                </button>)}
              </div>
              <div className="cover-colors">
                {([['bg', 'Background'], ['fg', 'Words'], ['accent', 'Accent']] as const).map(([k, label]) => <label key={k}><input type="color" value={cover[k]} onChange={e => set({[k]: e.target.value})}/>{label}</label>)}
              </div>
            </section>
            <section className="bd-section">
              <h3>Words</h3>
              <Field label="Title"><input maxLength={300} value={cover.title ?? ''} placeholder={book.title} onChange={e => set({title: e.target.value || undefined})}/></Field>
              <Field label="Subtitle"><input maxLength={300} value={cover.subtitle ?? ''} placeholder="Optional" onChange={e => set({subtitle: e.target.value || undefined})}/></Field>
              <Field label="Author name"><input maxLength={200} value={cover.author ?? ''} placeholder="Your name" onChange={e => set({author: e.target.value || undefined})}/></Field>
              <Choice label="Title size" columns={3} options={[{value: 0.82, label: 'Smaller', hint: 'Room for a long title or a big picture'}, {value: 1, label: 'Standard', hint: 'Sized to fit the cover'}, {value: 1.18, label: 'Larger', hint: 'Stands out as a thumbnail online'}]} value={cover.titleScale ?? 1} onChange={v => set({titleScale: v})}/>
              <Field label="Title font"><select value={cover.font ?? ''} onChange={e => set({font: e.target.value || undefined})}>
                <option value="">Same as your chapter titles ({fontLabel(book.appearance.headingFont)})</option>
                {allFonts.map(f => <option key={f} value={f}>{fontLabel(f)}</option>)}
              </select></Field>
            </section>
            <section className="bd-section">
              <h3>Picture</h3>
              {cover.style === 'picture' && !cover.imageId && <p className="bd-help">The Picture look needs a picture. Until you add one, it shows a colour fade.</p>}
              <div className="cover-pictures">
                <button type="button" className="cover-upload" onClick={() => file.current?.click()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Upload</button>
                {(book.images || []).map(im => <button key={im.id} type="button" aria-pressed={cover.imageId === im.id} title={im.name} aria-label={`Use ${im.name}`} onClick={() => set({imageId: cover.imageId === im.id ? undefined : im.id})}>
                  <img src={im.src} alt=""/>{cover.imageId === im.id && <span className="bd-check-badge" aria-hidden="true">✓</span>}
                </button>)}
              </div>
              <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setError(''); try { const id = await onAddImage(f); if (id) set({imageId: id}); } catch (err) { setError(err instanceof Error ? err.message : 'That picture could not be added.'); } }}/>
              {error && <p className="bd-help bd-warn" role="alert">{error}</p>}
              {cover.imageId && <>
                {cover.style === 'picture' && <label className="bd-check"><input type="checkbox" checked={!!cover.imageFull} onChange={e => set({imageFull: e.target.checked})}/><span>Wrap the picture around the whole cover<small>It continues across the spine onto the back. The blurb gets a soft backing so it stays readable.</small></span></label>}
                {ppi !== undefined && <p className={`bd-help ${ppi < 200 ? 'bd-warn' : 'bd-note'}`}>{ppi < 200 ? `This picture will print at about ${ppi} pixels per inch, so it may look soft. Printers suggest 300. Try a larger picture.` : `Sharp enough to print (about ${ppi} pixels per inch).`}</p>}
                <button type="button" className="link-button" onClick={() => set({imageId: undefined, imageFull: undefined})}>Remove picture from cover</button>
              </>}
            </section>
          </>}
          {tab === 'Spine' && <>
            <section className="bd-section">
              <div className="spine-readout">
                <div className="spine-ruler" aria-hidden="true"><i style={{width: Math.max(4, Math.min(64, g.spine * 2.4))}}/></div>
                <div><strong>{g.spineIn.toFixed(3)} in wide</strong><small>({g.spine.toFixed(1)} mm) from {pages} pages on {cover.paper ?? 'cream'} paper{printer !== 'home' ? ` for ${PRINTERS[printer].name}` : ''}. It updates by itself as your book grows.</small></div>
              </div>
              {!g.spineText && <p className="bd-help bd-note" role="status">{g.spineNote}</p>}
            </section>
            <section className="bd-section">
              <Choice label="Paper inside the book" columns={3} options={[{value: 'cream', label: 'Cream', hint: 'Warm and easy on the eyes, the usual choice for novels'}, {value: 'white', label: 'White', hint: 'Crisp, good for non-fiction and black & white pictures'}, {value: 'color', label: 'Colour', hint: 'For full-colour pages; a little thinner'}]} value={cover.paper ?? 'cream'} onChange={v => set({paper: v as Cover['paper']})}/>
              <p className="bd-help">Pick the same paper when you order from your printer. It changes how thick the book is.</p>
            </section>
            <section className="bd-section" aria-disabled={!g.spineText}>
              <h3>Words on the spine</h3>
              <label className="bd-check"><input type="checkbox" disabled={!g.spineText} checked={cover.spine?.title !== false} onChange={e => setSpine({title: e.target.checked})}/><span>Title</span></label>
              {cover.spine?.title !== false && <Field label="Spine title" hint="A shorter title fits better on a thin spine."><input disabled={!g.spineText} maxLength={200} value={cover.spine?.text ?? ''} placeholder={cover.title || book.title} onChange={e => setSpine({text: e.target.value || undefined})}/></Field>}
              <label className="bd-check"><input type="checkbox" disabled={!g.spineText} checked={cover.spine?.author !== false} onChange={e => setSpine({author: e.target.checked})}/><span>Author name{!cover.author && <small>Add your name on the Front tab first.</small>}</span></label>
              <Choice label="Reading direction" columns={2} options={[{value: 'down', label: 'Top to bottom', hint: 'US and UK books'}, {value: 'up', label: 'Bottom to top', hint: 'Most European books'}]} value={cover.spine?.dir ?? 'down'} onChange={v => setSpine({dir: v as 'down' | 'up'})}/>
            </section>
            <section className="bd-section">
              <Choice label="Spine colour" columns={3} options={[{value: 'cover', label: 'Same as the cover', hint: 'One colour all the way round'}, {value: 'accent', label: 'Accent colour', hint: 'A band of colour on the shelf'}, {value: 'dark', label: 'Dark', hint: 'Classic, and hides small printing shifts'}]} value={cover.spine?.color ?? 'cover'} onChange={v => setSpine({color: v as 'cover' | 'accent' | 'dark'})}/>
            </section>
          </>}
          {tab === 'Back' && <>
            <section className="bd-section">
              <Field label="Tagline or review quote" hint="One line in bigger letters at the top."><input maxLength={300} value={cover.tagline ?? ''} placeholder="“Impossible to put down.”" onChange={e => set({tagline: e.target.value || undefined})}/></Field>
              <Field label="Blurb" hint={`${words} ${words === 1 ? 'word' : 'words'}. Most back covers have 120–200. Leave a blank line between paragraphs.`}>
                <textarea rows={9} maxLength={4000} value={cover.blurb ?? ''} placeholder="Who is the story about, what do they want, and what stands in their way?" onChange={e => set({blurb: e.target.value || undefined})}/>
              </Field>
            </section>
            <section className="bd-section">
              <label className="bd-check"><input type="checkbox" checked={cover.barcode !== false} onChange={e => set({barcode: e.target.checked})}/><span>Leave room for the barcode<small>{printer === 'kdp' ? 'Amazon KDP prints the barcode here for you.' : printer === 'ingram' ? 'IngramSpark gives you a barcode to place here.' : 'Only needed if you will sell the book in shops.'}</small></span></label>
            </section>
          </>}
        </div>
        <footer className="bd-footer cover-footer">
          <span>Saves automatically</span>
          <button type="button" className="primary" disabled={busy} onClick={() => onDownload(cover)}>{busy ? 'Working…' : 'Download cover PDF'}</button>
        </footer>
      </div>
    </div>
  </div>;
}
