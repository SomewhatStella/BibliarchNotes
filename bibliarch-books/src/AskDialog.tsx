'use client';
import {useEffect, useRef, useState} from 'react';

/*
 * In-app replacement for window.confirm / window.prompt, so the site never shows
 * the browser's own "127.0.0.1 says…" popups. Call askConfirm / askText anywhere;
 * <AskHost/> (mounted once in the layout) renders the dialog.
 */
type Request =
  | {kind: 'confirm'; title: string; message?: string; confirmLabel?: string; danger?: boolean; resolve: (v: boolean) => void}
  | {kind: 'text'; title: string; label?: string; value?: string; confirmLabel?: string; resolve: (v: string | null) => void};

let push: ((r: Request) => void) | null = null;
const waiting: Request[] = [];
function open(r: Request) { if (push) push(r); else waiting.push(r); }

export function askConfirm(o: {title: string; message?: string; confirmLabel?: string; danger?: boolean}) {
  return new Promise<boolean>(resolve => open({kind: 'confirm', ...o, resolve}));
}
export function askText(o: {title: string; label?: string; value?: string; confirmLabel?: string}) {
  return new Promise<string | null>(resolve => open({kind: 'text', ...o, resolve}));
}

export default function AskHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const current = queue[0];
  useEffect(() => { push = r => setQueue(q => [...q, r]); if (waiting.length) setQueue(q => [...q, ...waiting.splice(0)]); return () => { push = null; }; }, []);
  useEffect(() => {
    const d = ref.current; if (!d || !current) return;
    if (current.kind === 'text') setText(current.value ?? '');
    if (!d.open) d.showModal();
    requestAnimationFrame(() => { if (current.kind === 'text') { field.current?.focus(); field.current?.select(); } });
  }, [current]);
  function finish(ok: boolean) {
    if (!current) return;
    if (current.kind === 'confirm') current.resolve(ok);
    else current.resolve(ok && text.trim() ? text.trim() : null);
    if (queue.length === 1) ref.current?.close();
    setQueue(q => q.slice(1));
  }
  return <dialog ref={ref} className="ask-dialog" aria-labelledby="ask-title" onCancel={e => { e.preventDefault(); finish(false); }}
    onClick={e => { if (e.target === ref.current) finish(false); }}>
    {current && <form method="dialog" onSubmit={e => { e.preventDefault(); finish(true); }}>
      <h2 id="ask-title">{current.title}</h2>
      {current.kind === 'confirm' && current.message && <p>{current.message}</p>}
      {current.kind === 'text' && <label>{current.label && <span>{current.label}</span>}<input ref={field} value={text} maxLength={300} onChange={e => setText(e.target.value)}/></label>}
      <div className="ask-actions">
        <button type="button" className="ask-cancel" onClick={() => finish(false)}>Cancel</button>
        <button type="submit" autoFocus={current.kind === 'confirm'} className={current.kind === 'confirm' && current.danger ? 'ask-danger' : 'ask-ok'}
          disabled={current.kind === 'text' && !text.trim()}>{current.confirmLabel || (current.kind === 'text' ? 'Save' : 'OK')}</button>
      </div>
    </form>}
  </dialog>;
}
