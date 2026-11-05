'use client';
import {PRINTERS, type Printer} from './print-check';

const ICONS: Record<Printer, React.ReactNode> = {
  kdp: <><path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h9"/><path d="M9 8h4"/></>,
  ingram: <><path d="M3 20V10l9-6 9 6v10"/><path d="M8 20v-6h8v6"/><path d="M3 20h18"/></>,
  home: <><path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="9" rx="2"/><path d="M7 14h10v7H7z"/></>,
};
/** The same printer picker in Book design → Paper and in Preview & export. */
export default function PrinterChoice({value, onChange}: {value: Printer; onChange: (p: Printer) => void}) {
  return <div className="printer-choice" role="radiogroup" aria-label="Printer">
    {(['kdp', 'ingram', 'home'] as Printer[]).map(p => <button key={p} type="button" role="radio" aria-checked={value === p} className={value === p ? 'on' : ''} onClick={() => onChange(p)}>
      <svg className="printer-icon" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[p]}</svg>
      <span className="printer-text"><strong>{PRINTERS[p].name}</strong><small>{PRINTERS[p].about}</small></span>
      {value === p && <span className="bd-check-badge" aria-hidden="true">✓</span>}
    </button>)}
  </div>;
}
