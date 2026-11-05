/* eslint-disable @next/next/no-html-link-for-pages -- Cross-zone links must perform a full navigation; Next Link would prepend /notes. */
"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Home, BookOpen, StickyNote } from "lucide-react";
import { useCanvasStore } from "@/lib/store";
import { saveBeforeLeaving } from "@/lib/workspace-navigation";

export default function WorkspaceLinks({ guardSaves = false }: { guardSaves?: boolean }) {
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  async function leave(event: MouseEvent<HTMLAnchorElement>) {
    // New-tab links leave the current document alive; normal departures must await saves.
    if (!guardSaves || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (busy.current) return;
    const href = event.currentTarget.href;
    busy.current = true;
    setSaving(true);
    setError(false);
    const ok = await saveBeforeLeaving(() => useCanvasStore.getState().flushAll(), () => useCanvasStore.getState().saveStatus);
    if (ok) window.location.assign(href);
    else { setError(true); setSaving(false); busy.current = false; }
  }
  return (
    <nav aria-label="Storycanvas workspaces" className="flex flex-wrap items-center gap-1 text-[12px] text-ink-500">
      <a href="/" onClick={leave} aria-label="Storycanvas home" className="flex items-center gap-1 rounded-full px-2 py-1.5 hover:bg-ink-900/5"><Home size={14} /> Home</a>
      <a href="/books" onClick={leave} className="flex items-center gap-1 rounded-full px-2 py-1.5 hover:bg-ink-900/5"><BookOpen size={14} /> Books</a>
      <a href="/notes/dashboard" onClick={leave} className="flex items-center gap-1 rounded-full px-2 py-1.5 hover:bg-ink-900/5"><StickyNote size={14} /> Notes</a>
      {saving && <span role="status">Saving before leaving…</span>}
      {error && <span role="alert" className="text-bibliarch-rose">Couldn’t save. Stay here and retry when online.</span>}
    </nav>
  );
}
