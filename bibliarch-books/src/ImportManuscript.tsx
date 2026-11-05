'use client';
import {useRef, useState} from 'react';
import ToolDialog from './ToolDialog';
import {readManuscript, bookFromManuscript, type Manuscript} from './manuscript-import';
import {bookPresets, createPresetBook} from './templates';
import MiniPage from './MiniPage';
import {useEffect, useMemo} from 'react';
import type {Book} from './model';

/** Bring an existing manuscript in: pick a file, check what was found, choose a look, done. */
const words = (c: {title: string; blocks: {runs: any[]}[]}) => c.blocks.reduce((n, b) => n + (b.runs.map((r: any) => r.text || ' ').join('').match(/[\p{L}\p{N}’']+/gu) || []).length, 0);
export default function ImportManuscript({onClose, onImport, initialFile}: {onClose: () => void; onImport: (book: Book) => void; initialFile?: File}) {
  const input = useRef<HTMLInputElement>(null);
  const [m, setM] = useState<Manuscript | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [over, setOver] = useState(false);
  const samples = useMemo(() => Object.fromEntries(bookPresets.filter(p => p.id !== 'blank').map(p => [p.id, createPresetBook(p.id)])), []);
  const [title, setTitle] = useState(''), [author, setAuthor] = useState(''), [look, setLook] = useState('novel');
  async function read(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try {
      const found = await readManuscript(file);
      setM(found); setTitle(found.title); setAuthor(found.author || '');
    } catch (e) { setError((e as Error).message || 'That file couldn’t be read.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (initialFile) void read(initialFile); }, [initialFile]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = () => {
    if (!m) return;
    onImport(bookFromManuscript({...m, title: title.trim() || m.title, author: author.trim() || undefined}, look));
  };
  return <ToolDialog name="Import a manuscript" onClose={onClose} className="import-dialog">
    <div className="panel-heading"><div><small className="step-cue">Step {m ? 2 : 1} of 2</small><h2>{m ? 'Check your book' : 'Import a manuscript'}</h2></div><button aria-label="Close" onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    {!m ? <>
      <div className={`import-drop${over ? ' over' : ''}`} onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); void read(e.dataTransfer.files?.[0]); }}>
        <svg className="import-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3-3 3 3"/></svg>
        <strong>{busy ? 'Reading your manuscript…' : 'Drop your manuscript here'}</strong>
        <span>A Word document, a Google Doc saved as Word, or a plain text file</span>
        <button className="primary" disabled={busy} onClick={() => input.current?.click()}>Choose a file</button>
        <input ref={input} hidden type="file" accept=".docx,.txt,.md,.markdown,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Manuscript file" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }}/>
      </div>
      <p className="muted">Writing in Google Docs? Choose <b>File → Download → Microsoft Word</b>, then pick that file here. We split it into chapters using your headings or lines like “Chapter One”, and keep your bold, italics and indents.</p>
      {error && <p className="import-error" role="alert">{error}</p>}
    </> : <>
      <div className="import-summary">
        <label>Book title<input value={title} maxLength={300} onChange={e => setTitle(e.target.value)}/></label>
        <label>Author<input value={author} maxLength={120} placeholder="Your name" onChange={e => setAuthor(e.target.value)}/></label>
      </div>
      <p className="import-count"><b>{m.chapters.length}</b> {m.chapters.length === 1 ? 'chapter' : 'chapters'} · <b>{m.words.toLocaleString()}</b> words of story{m.front.length ? ' · plus an opening section' : ''}</p>
      <ul className="import-chapters">{m.chapters.slice(0, 60).map((c, i) => { const w = words(c); return <li key={i}><div>{c.label && <small>{c.label}</small>}<span>{c.title}</span></div><em>{w.toLocaleString()} {w === 1 ? 'word' : 'words'}</em></li>; })}{m.chapters.length > 60 && <li className="more">…and {m.chapters.length - 60} more chapters</li>}</ul>
      {m.chapters.length === 1 && <p className="muted">We couldn’t find separate chapters, so everything is in one. You can split it later by adding chapters, or give your chapters headings (Heading 1) in Word and import again.</p>}
      <h3 className="import-look-title">Choose a look</h3>
      <div className="import-looks" role="radiogroup" aria-label="Book look">
        {bookPresets.map(p => <button key={p.id} role="radio" aria-checked={look === p.id} className={look === p.id ? 'on' : ''} title={p.description} onClick={() => setLook(p.id)}>
          <span className="look-stage">{p.id === 'blank' ? <span className="look-blank" aria-hidden="true"/> : <MiniPage scene={samples[p.id].chapters[0].scenes[0]} appearance={samples[p.id].appearance} width={54} boost={1.85}/>}</span>
          <strong>{p.name}</strong>{look === p.id && <span className="look-check" aria-hidden="true">✓</span>}</button>)}
      </div>
      <div className="dialog-actions"><button onClick={() => { setM(null); setError(''); }}>Pick a different file</button><button className="primary" onClick={create}>Create book</button></div>
    </>}
  </ToolDialog>;
}
