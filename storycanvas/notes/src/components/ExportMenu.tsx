"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileText, ImageDown, Loader2 } from "lucide-react";
import { useEscape } from "@/lib/use-escape";

/** The toolbar's Export button: a picture of this board (to post anywhere) or the whole story as text. */
export default function ExportMenu({ onPicture, onText }: { onPicture: () => Promise<string | null>; onText?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  // The menu is portaled to <body>: the toolbar's backdrop blur makes it its own layer, so a
  // dropdown inside it was drawn underneath the board.
  const [at, setAt] = useState<{ top: number; right: number } | null>(null);
  useEscape(() => setOpen(false), open);
  useLayoutEffect(() => {
    if (!open && !note) return;
    const place = () => {
      const r = root.current?.getBoundingClientRect();
      if (r) setAt({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, note]);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node) && !menu.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3500);
    return () => clearTimeout(t);
  }, [note]);

  async function picture() {
    setBusy(true);
    try {
      setNote(await onPicture());
      setOpen(false);
    } catch {
      setNote("Couldn't make the picture. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Export"
        aria-label="Export"
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900"
      >
        <Download size={16} />
      </button>
      {open && at && createPortal(
        <div ref={menu} role="menu" style={{ position: "fixed", top: at.top, right: at.right }} className="pop-in emboss z-[300] w-64 rounded-xl p-1.5">
          <button role="menuitem" disabled={busy} onClick={picture} className="export-item">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageDown size={16} />}
            <span>
              <strong>Save as a picture</strong>
              <small>This board as a PNG, ready to post or send</small>
            </span>
          </button>
          {onText && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onText();
              }}
              className="export-item"
            >
              <FileText size={16} />
              <span>
                <strong>Download as text</strong>
                <small>Every board in the story, as a .txt file</small>
              </span>
            </button>
          )}
        </div>,
        document.body,
      )}
      {note && at && createPortal(
        <p role="status" style={{ position: "fixed", top: at.top, right: at.right }} className="solid-chip z-[300] w-max max-w-[260px] rounded-lg px-3 py-2 text-[12px] shadow-card">
          {note}
        </p>,
        document.body,
      )}
    </div>
  );
}
