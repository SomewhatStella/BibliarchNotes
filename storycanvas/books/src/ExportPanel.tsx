'use client';
import {useMemo} from 'react';
import {printCheck, PRINTERS, type Printer, type PrintIssue} from './print-check';
import type {Appearance, Book} from './model';
import PrinterChoice from './PrinterChoice';
import {OutlineCover} from './CoverDesigner';
import {coverGeometry, defaultCover} from './cover';

const ICON: Record<PrintIssue['level'], string> = {problem: '!', warning: '!', tip: 'i'};

/** Preview & export, with a plain-language "ready to print?" check up front. */
export default function ExportPanel({book, pages, busy, onPrinter, onFix, onGoTo, onPreview, onPdf, onEpub, onClose, onCover, onCoverPdf}: {
  book: Book; pages: number; busy: boolean;
  onPrinter: (p: Printer) => void; onFix: (patch: Partial<Appearance>) => void; onGoTo: (sceneId: string) => void;
  onPreview: () => void; onPdf: () => void; onEpub: () => void; onClose: () => void;
  onCover: () => void; onCoverPdf: () => void;
}) {
  const printer = book.appearance.printer ?? 'home';
  const issues = useMemo(() => printCheck(book, pages, printer), [book, pages, printer]);
  const problems = issues.filter(i => i.level === 'problem').length, warnings = issues.filter(i => i.level === 'warning').length;
  return <>
    <div className="panel-heading"><h2>Preview &amp; export</h2><button aria-label="Close" onClick={onClose}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <h3 className="export-step">Where will it be printed?</h3>
    <PrinterChoice value={printer} onChange={onPrinter}/>
    <div className={`export-summary ${problems ? 'bad' : warnings ? 'meh' : 'good'}`} role="status">
      <span className="export-badge" aria-hidden="true">{problems || warnings ? '!' : '✓'}</span>
      <div><strong>{problems ? `${problems} ${problems === 1 ? 'thing needs' : 'things need'} fixing before printing` : warnings ? 'Almost ready to print' : 'Ready to print'}</strong>
        <small>{pages} pages · {PRINTERS[printer].name}{warnings ? ` · ${warnings} ${warnings === 1 ? 'thing' : 'things'} worth a look` : ''}</small></div>
    </div>
    {issues.length > 0 && <ul className="export-issues">
      {issues.map((i, n) => <li key={n} className={`issue-${i.level}`}>
        <span className="issue-icon" aria-hidden="true">{ICON[i.level]}</span>
        <div><strong>{i.title}</strong><p>{i.detail}</p>
          {(i.fix || i.sceneId) && <div className="issue-actions">
            {i.fix && <button className="primary" onClick={() => onFix(i.fix!.patch)}>{i.fix.label}</button>}
            {i.sceneId && <button onClick={() => onGoTo(i.sceneId!)}>Go to page</button>}
          </div>}
        </div>
      </li>)}
    </ul>}
    {<div className="export-cover">
      <OutlineCover book={book} pages={pages}/>
      <div><strong>{book.cover ? 'Cover' : printer === 'home' ? 'Cover' : 'You’ll also need a cover'}</strong>
        <small>{printer === 'home' ? 'Binding it at a print shop? They’ll want the cover as its own file: back, spine and front on one sheet.' : `${PRINTERS[printer].name} asks for the cover as a separate file: back, spine and front on one sheet.`} Spine {coverGeometry(book, pages, book.cover ?? defaultCover(book)).spineIn.toFixed(3)} in.</small></div>
      <div className="export-cover-actions">
        <button onClick={onCover}>{book.cover ? 'Edit cover' : 'Design cover'}</button>
        {book.cover && <button disabled={busy} onClick={onCoverPdf}>Download cover PDF</button>}
      </div>
    </div>}
    <div className="dialog-actions export-actions">
      <button disabled={busy} className="export-preview" onClick={onPreview}>Preview first</button>
      <button disabled={busy} onClick={onEpub}>Download e-book</button>
      <button disabled={busy} className="primary" onClick={onPdf}>{busy ? 'Working…' : 'Download print-ready PDF'}</button>
    </div>
  </>;
}
