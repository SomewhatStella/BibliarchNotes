'use client';
import {useState, type ReactNode} from 'react';
import PrinterChoice from './PrinterChoice';
import {PRINTERS, supportedTrim, nearestTrim, printerReadyPatch, type Printer} from './print-check';
import {fonts, pageDimensions, pageTemplates, type Appearance, type Book, type Chapter, type PageTemplate, type Scene} from './model';
import {normalizeLayout, readFont, ORNAMENTS, type CustomFont, type PageLayout} from './design';
import {pageLabels, applyTemplate} from './templates';
import {PageThumbnail} from './LibraryHome';

/*
 * Book design, written for writers rather than typesetters: every setting is a
 * named choice. The stored model is still numeric; these tables translate.
 */

type Option<T> = {value: T; label: string; hint?: string; sample?: ReactNode};

/** Pick the option closest to the stored number so one choice is always lit. */
export function nearest<T extends number>(options: Option<T>[], value: number | undefined, fallback: T): T {
  const v = value ?? fallback;
  return options.reduce((best, o) => (Math.abs(o.value - v) < Math.abs(best - v) ? o.value : best), options[0].value);
}

export function Choice<T extends string | number>({label, help, options, value, onChange, columns}: {
  label: string; help?: string; options: Option<T>[]; value: T; onChange: (v: T) => void; columns?: number;
}) {
  return <div className="bd-field" role="group" aria-label={label}>
    <div className="bd-label">{label}</div>
    {/* Rows of 2 or 4 share one 4-column grid so card edges line up down the panel;
        rows of 3 become full-width rows (with their description) instead of breaking the grid. */}
    {(() => { const n = columns ?? options.length, list = n === 3; return <div className={`bd-choices${list ? ' bd-list' : ''}`} style={list ? undefined : {gridTemplateColumns: 'repeat(4, minmax(0,1fr))'}}>
      {options.map(o => <button key={String(o.value)} type="button" aria-pressed={o.value === value} title={list ? undefined : o.hint} style={list ? undefined : {gridColumn: `span ${n <= 2 ? 2 : 1}`}} onClick={() => onChange(o.value)}>
        {o.sample && <span className="bd-sample" aria-hidden="true">{o.sample}</span>}
        <span className="bd-choice-text"><span>{o.label}</span>{list && o.hint && <small>{o.hint}</small>}</span>
        {o.value === value && <span className="bd-check-badge" aria-hidden="true">✓</span>}
      </button>)}
    </div>; })()}
    {help && <p className="bd-help">{help}</p>}
  </div>;
}

export const TEXT_SIZES: Option<number>[] = [
  {value: 14, label: 'Small', sample: <span style={{fontSize: 13}}>Aa</span>},
  {value: 16, label: 'Medium', sample: <span style={{fontSize: 16}}>Aa</span>},
  {value: 18, label: 'Large', sample: <span style={{fontSize: 19}}>Aa</span>},
  {value: 21, label: 'Extra large', sample: <span style={{fontSize: 22}}>Aa</span>},
];
const HEADING_SIZES: Option<number>[] = [
  {value: 22, label: 'Subtle'},
  {value: 30, label: 'Classic'},
  {value: 38, label: 'Bold'},
  {value: 46, label: 'Dramatic'},
];
const INDENT_STEPS: Option<number>[] = [6.35, 12.7, 19.05, 25.4].map((mm, i) => ({value: mm, label: ['¼ inch', '½ inch', '¾ inch', '1 inch'][i], sample: <span className="bd-indent"><i style={{width: 5 + i * 7}}/><b/></span>}));
export const LINE_SPACING: Option<number>[] = [
  {value: 1.35, label: 'Snug', sample: <Lines gap={2}/>},
  {value: 1.6, label: 'Comfortable', sample: <Lines gap={4}/>},
  {value: 1.85, label: 'Airy', sample: <Lines gap={6}/>},
  {value: 2.2, label: 'Double', sample: <Lines gap={8}/>},
];
const LETTER_SPACING: Option<number>[] = [
  {value: -0.3, label: 'Tight'},
  {value: 0, label: 'Normal'},
  {value: 0.8, label: 'Wide'},
];
const inset = (pct: number) => <span className="bd-mini-page"><span className="bd-mini-text" style={{inset: `${pct}%`}}><i/><i/><i/><i/><i/></span></span>;
const MARGINS: Option<number>[] = [
  {value: 13, label: 'Narrow', hint: 'More words per page', sample: inset(9)},
  {value: 19, label: 'Normal', sample: inset(14)},
  {value: 25, label: 'Wide', sample: inset(19)},
  {value: 32, label: 'Extra wide', hint: 'Lots of white space', sample: inset(24)},
];
/** Trim sizes writers actually ask a printer for. */
const PAPER: {id: string; name: string; size: string; w: number; h: number; preset: Appearance['preset']}[] = [
  {id: 'B6', name: 'Pocket book', size: '5 × 7 in', w: 128, h: 182, preset: 'B6'},
  {id: '5x8', name: 'Small paperback', size: '5 × 8 in', w: 127, h: 203.2, preset: 'Custom'},
  {id: 'A5', name: 'Paperback', size: '5.8 × 8.3 in (A5)', w: 148, h: 210, preset: 'A5'},
  {id: '5.5x8.5', name: 'Trade paperback', size: '5.5 × 8.5 in', w: 139.7, h: 215.9, preset: 'Custom'},
  {id: '6x9', name: 'Novel', size: '6 × 9 in', w: 152.4, h: 228.6, preset: 'Custom'},
  {id: '8x10', name: 'Picture book', size: '8 × 10 in', w: 203.2, h: 254, preset: 'Custom'},
  {id: 'Letter', name: 'US Letter', size: '8.5 × 11 in', w: 215.9, h: 279.4, preset: 'Letter'},
  {id: 'A4', name: 'A4', size: '8.3 × 11.7 in', w: 210, h: 297, preset: 'A4'},
];
const HEADERS: Option<string>[] = [
  {value: '', label: 'Nothing'},
  {value: '{title}', label: 'Book title'},
  {value: 'custom', label: 'My own text'},
];
const FOOTERS: Option<string>[] = [
  {value: '', label: 'None'},
  {value: '{page}', label: '12'},
  {value: '— {page} —', label: '— 12 —'},
  {value: 'Page {page}', label: 'Page 12'},
];
const drop = (top: number) => <span className="bd-mini-page"><span className="bd-mini-text" style={{top: `${8 + top}%`, left: '18%', right: '18%'}}><i/><i/><i/></span></span>;
const TITLE_SPACE: Option<number>[] = [
  {value: 0, label: 'None', sample: drop(0)},
  {value: 20, label: 'A little', sample: drop(10)},
  {value: 50, label: 'A lot', sample: drop(26)},
  {value: 85, label: 'Half the page', sample: drop(44)},
];

function Lines({gap}: {gap: number}) {
  return <span className="bd-lines" style={{gap}}><i/><i/><i/></span>;
}

import {fontLabel} from './design';
const fontNotes: Record<string, string> = {
  Georgia: 'Classic book serif',
  'Times New Roman': 'Traditional serif',
  Arial: 'Clean sans-serif',
  Verdana: 'Wide, easy-to-read sans-serif',
};

/** A few real words from the book (its first sentence), so font choices preview the writer's own text. */
function sampleLine(book: Book): string {
  const walk = (n: any): string => n?.type === 'text' ? n.text : (n?.children || []).map(walk).join(' ');
  for (const c of book.chapters) for (const s of c.scenes) {
    if (s.template === 'book-front' || s.template === 'copyright' || s.template === 'toc') continue;
    for (const b of (s.content as any)?.root?.children || []) {
      if (b.type !== 'paragraph') continue;
      const words = walk(b).trim().split(/\s+/).filter(Boolean);
      if (words.length >= 3) return words.slice(0, 4).join(' ');
    }
  }
  return book.title.trim().split(/\s+/).slice(0, 3).join(' ') || 'Aa';
}
function FontPicker({label, value, custom, onChange, sample = 'Aa'}: {label: string; value: string; custom: CustomFont[]; onChange: (f: string) => void; sample?: string}) {
  const all = [...fonts, ...custom.map(f => f.family)];
  return <div className="bd-field" role="group" aria-label={label}>
    <div className="bd-label">{label}</div>
    <div className="bd-fonts">
      {all.map(f => <button key={f} type="button" aria-pressed={f === value} onClick={() => onChange(f)}>
        <span className="bd-font-sample" style={{fontFamily: `'${f}'`}}>{sample}</span>
        <strong style={{fontFamily: `'${f}'`}}>{custom.find(c => c.family === f)?.name ?? fontLabel(f)}</strong>
        <small>{fontNotes[f] ?? 'Your font'}</small>
        {f === value && <span className="bd-check-badge" aria-hidden="true">✓</span>}
      </button>)}
    </div>
  </div>;
}

export type DesignActions = {
  appearance: (patch: Partial<Appearance>) => void;
  book: (patch: Partial<Book>) => void;
  page: (fn: (s: Scene) => Scene) => void;
  movePage: (delta: number) => void;
  moveToChapter: (chapterId: string) => void;
  removePage: () => void;
  openImage: () => void;
  preview: () => void;
};

const tabs = ['Text', 'Paper', 'This page'] as const;
type Tab = typeof tabs[number];

export default function BookDesignPanel({book, chapter, scene, pageCount, sheetCount = pageCount, initialTab = 'Text', actions}: {
  book: Book; chapter: Chapter; scene: Scene; pageCount: number; sheetCount?: number; initialTab?: Tab; actions: DesignActions;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  return <div className="book-design">
    <div className="bd-tabs" role="tablist" aria-label="Book design sections">
      {tabs.map(t => <button key={t} type="button" role="tab" id={`bd-tab-${t}`} aria-selected={tab === t} aria-controls={`bd-panel-${t}`} onClick={() => setTab(t)}>{t}</button>)}
    </div>
    <div className="bd-scroll" role="tabpanel" id={`bd-panel-${tab}`} aria-labelledby={`bd-tab-${tab}`}>
      {tab === 'Text' && <TextTab book={book} actions={actions}/>}
      {tab === 'Paper' && <PaperTab book={book} sheets={sheetCount} actions={actions}/>}
      {tab === 'This page' && <PageTab book={book} chapter={chapter} scene={scene} pageCount={pageCount} actions={actions}/>}
    </div>
    <footer className="bd-footer"><span>Saves automatically</span><button type="button" onClick={actions.preview}>See it as a book →</button></footer>
  </div>;
}

function TextTab({book, actions}: {book: Book; actions: DesignActions}) {
  const a = book.appearance;
  const custom = book.customFonts || [];
  const indented = (a.paragraphIndent ?? 0) > 0;
  return <>
    <section className="bd-section">
      <h3>Story text</h3>
      <FontPicker label="Font" value={a.bodyFont} custom={custom} sample={sampleLine(book)} onChange={bodyFont => actions.appearance({bodyFont})}/>
      <Choice label="Size" options={TEXT_SIZES} value={nearest(TEXT_SIZES, a.bodySize, 16)} onChange={bodySize => actions.appearance({bodySize})}/>
      <Choice label="Line spacing" options={LINE_SPACING} value={nearest(LINE_SPACING, a.lineHeight, 1.6)} onChange={lineHeight => actions.appearance({lineHeight})}/>
      <Choice label="New paragraphs" value={indented ? 'indent' : 'space'} columns={2}
        help={indented ? 'The first line of each paragraph is pushed in, like most printed novels.' : 'A blank gap separates paragraphs, like a website or a letter.'}
        options={[
          {value: 'indent', label: 'Indent first line', sample: <span className="bd-para indent"><i/><i/><i/></span>},
          {value: 'space', label: 'Gap between', sample: <span className="bd-para space"><i/><i/><i/></span>},
        ]}
        onChange={v => actions.appearance(v === 'indent' ? {paragraphIndent: 1.5, paragraphSpacing: 0} : {paragraphIndent: 0, paragraphSpacing: 16})}/>
      <Choice label="Tab & indent size" value={nearest(INDENT_STEPS, a.indentStepMm, 12.7)} columns={4}
        help="How far the Tab key pushes a paragraph in, and where tab stops fall inside a line. Shift+Tab moves back."
        options={INDENT_STEPS} onChange={indentStepMm => actions.appearance({indentStepMm})}/>
      <Choice label="Line edges" value={a.paragraphAlign ?? 'left'} columns={2}
        options={[
          {value: 'left', label: 'Ragged right', sample: <span className="bd-align left"><i/><i/><i/></span>},
          {value: 'justify', label: 'Even edges', sample: <span className="bd-align justify"><i/><i/><i/></span>},
        ]}
        onChange={paragraphAlign => actions.appearance({paragraphAlign})}/>
      <Choice label="Letter spacing" options={LETTER_SPACING} value={nearest(LETTER_SPACING, a.tracking, 0)} onChange={tracking => actions.appearance({tracking})}/>
    </section>
    <section className="bd-section">
      <h3>Chapter titles</h3>
      <FontPicker label="Font" value={a.headingFont} custom={custom} sample={book.title.trim().split(/\s+/).slice(0, 3).join(' ') || 'Aa'} onChange={headingFont => actions.appearance({headingFont})}/>
      <Choice label="Size" options={HEADING_SIZES} value={nearest(HEADING_SIZES, a.headingSize, 30)} onChange={headingSize => actions.appearance({headingSize})}/>
    </section>
    <FontUpload book={book} actions={actions}/>
  </>;
}

function FontUpload({book, actions}: {book: Book; actions: DesignActions}) {
  const [licensed, setLicensed] = useState(false);
  const [error, setError] = useState('');
  const custom = book.customFonts || [];
  return <details className="bd-section bd-details">
    <summary>Use your own font</summary>
    <p className="bd-help">Have a font file (.ttf, .otf, .woff)? Add it here and it will appear in the font lists above. Only use fonts you're allowed to put in a book; many free fonts allow it.</p>
    <label className="bd-check"><input type="checkbox" checked={licensed} onChange={e => setLicensed(e.target.checked)}/>I'm allowed to use this font in my book</label>
    <label className="bd-file" aria-disabled={!licensed}>
      <span>Choose font file…</span>
      <input disabled={!licensed} type="file" accept=".woff,.woff2,.ttf,.otf" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        try {
          if (file.size > 256 * 1024) throw new Error('That font file is too big. Try a .woff2 version, which is much smaller.');
          const f = await readFont(file);
          if (custom.length >= 8 && !custom.some(x => x.id === f.id)) throw new Error('You can add up to 8 fonts. Remove one first.');
          actions.book({customFonts: [...custom.filter(x => x.id !== f.id), f]}); setError('');
        } catch (err) { setError((err as Error).message.replace('Font limit is 256 KiB', 'That font file is too big.')); }
      }}/>
    </label>
    {error && <p role="alert" className="bd-error">{error}</p>}
    {custom.length > 0 && <ul className="bd-list">{custom.map(f => <li key={f.id}><span style={{fontFamily: `'${f.family}'`}}>{f.name ?? f.family}</span>
      <button type="button" disabled={[book.appearance.bodyFont, book.appearance.headingFont].includes(f.family)} title={[book.appearance.bodyFont, book.appearance.headingFont].includes(f.family) ? 'In use — pick another font above first' : undefined}
        onClick={() => actions.book({customFonts: custom.filter(x => x.id !== f.id)})}>Remove</button></li>)}</ul>}
  </details>;
}

function PaperTab({book, sheets, actions}: {book: Book; sheets: number; actions: DesignActions}) {
  const a = book.appearance;
  const [w, h] = pageDimensions(a);
  const current = PAPER.find(p => Math.abs(p.w - w) < 1 && Math.abs(p.h - h) < 1);
  const headerMode = !a.header ? '' : a.header === '{title}' ? '{title}' : 'custom';
  const [customHeader, setCustomHeader] = useState(headerMode === 'custom');
  const footerKnown = FOOTERS.some(f => f.value === (a.footer ?? ''));
  const margin = nearest(MARGINS, a.margin, 19);
  const setMargin = (m: number) => actions.appearance(a.mirror ? {margin: m, insideMm: m + 6, outsideMm: m} : {margin: m});
  const maxW = Math.max(...PAPER.map(p => p.w)), maxH = Math.max(...PAPER.map(p => p.h));
  const printer = a.printer ?? 'home';
  const [note, setNote] = useState('');
  const choosePrinter = (p: Printer) => {
    const patch: Partial<Appearance> = {printer: p};
    const changes: string[] = [];
    if (p !== 'home') {
      if (supportedTrim(a, p) === null) { const near = nearestTrim(a, p)!; Object.assign(patch, {preset: 'Custom', widthMm: Math.round(near.w * 10) / 10, heightMm: Math.round(near.h * 10) / 10}); changes.push(`size changed to ${near.name}`); }
      const ready = printerReadyPatch(a, sheets, p);
      if (!a.mirror || (ready.insideMm ?? 0) > (a.insideMm ?? a.margin)) { Object.assign(patch, ready); changes.push(`margins set for ${sheets} pages`); }
    }
    actions.appearance(patch);
    setNote(p === 'home' ? '' : `Set up for ${PRINTERS[p].name}${changes.length ? ': ' + changes.join(', ') : ''}. Use Preview & export to check everything before you upload.`);
  };
  return <>
    <section className="bd-section">
      <h3>Where will it be printed?</h3>
      <PrinterChoice value={printer} onChange={choosePrinter}/>
      {note && <p className="bd-help bd-note" role="status">{note}</p>}
    </section>
    <section className="bd-section">
      <h3>Book size</h3>
      <div className="bd-paper" role="group" aria-label="Book size">
        {PAPER.map(p => <button key={p.id} type="button" aria-pressed={current?.id === p.id} onClick={() => actions.appearance(p.preset === 'Custom' ? {preset: 'Custom', widthMm: p.w, heightMm: p.h} : {preset: p.preset})}>
          <span className="bd-paper-shape"><i style={{width: `${p.w / maxW * 100}%`, height: `${p.h / maxH * 100}%`}}/></span>
          {p.id === '6x9' && <b className="bd-popular">Most popular</b>}{current?.id === p.id && <span className="bd-check-badge" aria-hidden="true">✓</span>}<strong>{p.name}</strong><small>{p.size}</small>{printer !== 'home' && <em className={PRINTERS[printer].trims!.some(x => Math.abs(x.w - p.w) < 1.2 && Math.abs(x.h - p.h) < 1.2) ? 'bd-ok' : 'bd-no'}>{PRINTERS[printer].trims!.some(x => Math.abs(x.w - p.w) < 1.2 && Math.abs(x.h - p.h) < 1.2) ? `✓ ${PRINTERS[printer].short}` : `Not on ${PRINTERS[printer].short}`}</em>}
        </button>)}
      </div>
      {!current && <p className="bd-help">Your book uses a custom size ({(w / 25.4).toFixed(1)} × {(h / 25.4).toFixed(1)} in). Pick one above to change it.</p>}
      <p className="bd-help">Not sure? Most printed novels are 6 × 9 in or 5.5 × 8.5 in.</p>
    </section>
    <section className="bd-section">
      <h3>Margins</h3>
      <Choice label="White space around the text" options={MARGINS} value={margin} onChange={setMargin}/>
      <label className="bd-check"><input type="checkbox" checked={!!a.mirror} onChange={e => actions.appearance(e.target.checked ? {mirror: true, insideMm: margin + 6, outsideMm: margin} : {mirror: false})}/>
        <span>I'm printing this as a bound book<small>Adds extra room on the spine side so words don't disappear into the fold.</small></span></label>
      <label className="bd-check"><input type="checkbox" checked={!!a.recto} onChange={e => actions.appearance({recto: e.target.checked})}/>
        <span>Start every chapter on a right-hand page<small>Like most printed books. A blank page is added where needed.</small></span></label>
    </section>
    <section className="bd-section">
      <h3>Top and bottom of each page</h3>
      <Choice label="Top of the page" options={HEADERS} value={customHeader ? 'custom' : headerMode} onChange={v => {
        setCustomHeader(v === 'custom');
        if (v !== 'custom') actions.appearance({header: v});
        else if (headerMode !== 'custom') actions.appearance({header: book.title.slice(0, 150)});
      }}/>
      {(customHeader || headerMode === 'custom') && <label className="bd-text">Text at the top<input maxLength={150} value={a.header || ''} placeholder="e.g. your name" onChange={e => actions.appearance({header: e.target.value})}/></label>}
      <Choice label="Page numbers" options={footerKnown ? FOOTERS : [...FOOTERS, {value: a.footer ?? '', label: 'Current'}]} value={a.footer ?? ''} onChange={footer => actions.appearance({footer})}/>
    </section>
  </>;
}

function PageTab({book, chapter, scene, pageCount, actions}: {book: Book; chapter: Chapter; scene: Scene; pageCount: number; actions: DesignActions}) {
  const layout = normalizeLayout(scene.layout);
  const template: PageTemplate = scene.template || 'prose';
  const setLayout = (patch: Partial<PageLayout>) => actions.page(s => ({...s, layout: {...normalizeLayout(s.layout), ...patch}}));
  const hasTitle = template !== 'prose';
  const hasProse = ['prose', 'chapter-title', 'afterword', 'copyright', 'characters', 'back-cover'].includes(template);
  const isArt = template === 'color-art' || template === 'bnw-art';
  const [saving, setSaving] = useState(false), [name, setName] = useState('');
  const [personal, setPersonal] = useState<{name: string; template: PageTemplate; layout?: PageLayout}[]>(() => { try { return JSON.parse(localStorage.getItem('bibliarch-page-templates') || '[]'); } catch { return []; } });
  const savePersonal = (list: typeof personal) => { try { localStorage.setItem('bibliarch-page-templates', JSON.stringify(list)); setPersonal(list); } catch {} };
  return <>
    <section className="bd-section">
      <h3>{scene.title || 'Untitled page'}</h3>
      <label className="bd-text">Page name<input maxLength={300} value={scene.title} onChange={e => actions.page(s => ({...s, title: e.target.value}))}/></label>
    </section>
    <section className="bd-section">
      <h3>Kind of page</h3>
      <div className="bd-types" role="group" aria-label="Kind of page">
        {pageTemplates.map(t => <button key={t} type="button" aria-pressed={template === t} onClick={() => actions.page(s => applyTemplate(s, t, book))}>
          <PageThumbnail template={t} title={pageLabels[t]}/>
          <span>{pageLabels[t]}</span>
          {template === t && <span className="bd-check-badge" aria-hidden="true">✓</span>}
        </button>)}
      </div>
      <p className="bd-help">Changing the kind of page changes how it looks. Your words are never deleted.</p>
    </section>
    <section className="bd-section">
      <h3>Look of this page</h3>

      {<Choice label="Start the text lower on the page" help="Leaves space above the first line, like the opening page of a chapter." options={TITLE_SPACE} value={nearest(TITLE_SPACE, layout.chapterSpacing, 0)} onChange={chapterSpacing => setLayout({chapterSpacing})}/>}
      <Choice label="Border" value={layout.border} onChange={border => setLayout({border})} options={[
        {value: 'none', label: 'None', sample: <span className="bd-border none"/>},
        {value: 'solid', label: 'Thin line', sample: <span className="bd-border solid"/>},
        {value: 'double', label: 'Double line', sample: <span className="bd-border double"/>},
      ]}/>
      {hasProse && <Choice label="Ornament at the end" value={layout.divider} onChange={divider => setLayout({divider})} options={[
        {value: 'none', label: 'None'},
        ...(Object.keys(ORNAMENTS) as (keyof typeof ORNAMENTS)[]).map(k => ({value: k, label: ({stars: 'Stars', diamond: 'Diamond', leaves: 'Leaf'} as const)[k], sample: <span className="bd-ornament">{ORNAMENTS[k]}</span>})),
      ]}/>}
      {hasProse && <label className="bd-check"><input type="checkbox" checked={!!layout.dropCap} onChange={e => setLayout({dropCap: e.target.checked})}/>
        <span>Big first letter<small>Makes the first letter of the page large and fancy, like a fairy-tale book.</small></span></label>}
      {isArt && <button type="button" className="bd-wide" onClick={actions.openImage}>Picture settings…</button>}
    </section>
    <section className="bd-section">
      <h3>Move or remove</h3>
      <div className="bd-row">
        <button type="button" onClick={() => actions.movePage(-1)} disabled={chapter.scenes[0]?.id === scene.id}>↑ Move earlier</button>
        <button type="button" onClick={() => actions.movePage(1)} disabled={chapter.scenes[chapter.scenes.length - 1]?.id === scene.id}>↓ Move later</button>
      </div>
      {book.chapters.length > 1 && <label className="bd-text">Part of
        <select value={chapter.id} onChange={e => actions.moveToChapter(e.target.value)}>{book.chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>}
      <div className="bd-row">
        <button type="button" aria-pressed={!!scene.bookmark} onClick={() => actions.page(s => ({...s, bookmark: !s.bookmark}))}>{scene.bookmark ? '★ Bookmarked' : '☆ Bookmark'}</button>
        <button type="button" className="bd-danger" disabled={pageCount === 1} onClick={actions.removePage}>Delete page…</button>
      </div>
    </section>
    <section className="bd-section">
      <h3>My page styles</h3>
      <p className="bd-help">Like how this page looks? Save it and reuse the same look on other pages.</p>
      {saving ? <form className="bd-row" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; savePersonal([...personal, {name: name.trim().slice(0, 60), template, layout}]); setName(''); setSaving(false); }}>
        <input autoFocus aria-label="Style name" placeholder="Name this style" value={name} onChange={e => setName(e.target.value)}/>
        <button type="submit" className="bd-primary" disabled={!name.trim()}>Save</button>
        <button type="button" onClick={() => setSaving(false)}>Cancel</button>
      </form> : <button type="button" className="bd-wide" onClick={() => setSaving(true)}>Save this page's look…</button>}
      {personal.length > 0 && <ul className="bd-list">{personal.map((p, i) => <li key={i}><span>{p.name}<small> · {pageLabels[p.template] ?? p.template}</small></span>
        <span className="bd-row"><button type="button" onClick={() => actions.page(s => ({...s, template: p.template, ...(p.layout ? {layout: {...normalizeLayout(s.layout), ...p.layout}} : {})}))}>Use here</button>
        <button type="button" aria-label={`Delete style ${p.name}`} onClick={() => savePersonal(personal.filter((_, j) => j !== i))}>×</button></span></li>)}</ul>}
    </section>
  </>;
}
