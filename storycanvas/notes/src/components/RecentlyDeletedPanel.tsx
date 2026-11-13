"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Trash2, X } from "lucide-react";
import { listDeletedNodes, DELETED_KEEP_DAYS, type DeletedRecord } from "@/lib/safety-net";
import type { CanvasRow } from "@/lib/types";
import TypeIcon from "./TypeIcon";
import { useEscape } from "@/lib/use-escape";

/** Human name for a board key: "Main board", or the card that opens it. */
export function boardName(canvasType: string, canvases: Record<string, CanvasRow>): string {
  if (canvasType === "main") return "Main board";
  for (const c of Object.values(canvases)) {
    const owner = c.nodes.find((n) => n.linkedCanvasId === canvasType || `${n.type}-canvas-${n.id}` === canvasType);
    if (owner) return owner.text || owner.title || "Untitled";
  }
  return "A board inside this story";
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

// Deleted cards from the last 30 days, kept in Supabase so they follow the
// story to any device. Restore puts the card back on its own board.
export default function RecentlyDeletedPanel({
  storyId,
  canvases,
  readOnly,
  onRestore,
  onClose,
}: {
  storyId: string;
  canvases: Record<string, CanvasRow>;
  readOnly: boolean;
  onRestore: (rec: DeletedRecord) => Promise<boolean>;
  onClose: () => void;
}) {
  useEscape(onClose);
  const [items, setItems] = useState<DeletedRecord[] | null | "unavailable">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    listDeletedNodes(storyId).then((rows) => setItems(rows ?? "unavailable"));
  }, [storyId]);

  async function restore(rec: DeletedRecord) {
    setBusy(rec.id);
    const ok = await onRestore(rec);
    setBusy(null);
    setItems((prev) => (Array.isArray(prev) ? prev.filter((r) => r.id !== rec.id) : prev));
    const name = rec.node.text || rec.node.title || "Card";
    setMessage(ok ? `“${name}” is back on ${boardName(rec.canvas_type, canvases)}.` : `“${name}” was already back on its board.`);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/15" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Recently deleted" className="pop-in emboss flex max-h-[80vh] w-[26rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink-900">
            <Trash2 size={15} className="text-ink-500" /> Recently deleted
          </p>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[12px] text-ink-500">Cards deleted from this story in the last {DELETED_KEEP_DAYS} days.</p>
        {message && <p role="status" className="mb-3 rounded-lg bg-bibliarch-blue/10 px-3 py-2 text-[12.5px] text-bibliarch-blue">{message}</p>}

        <div className="scrollbar-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {items === null && <p className="py-6 text-center text-[12.5px] text-ink-500">Loading…</p>}
          {items === "unavailable" && (
            <p className="py-6 text-center text-[12.5px] text-ink-500">Deleted-card history isn&rsquo;t available yet. Undo (Ctrl+Z) still works for this session.</p>
          )}
          {Array.isArray(items) && items.length === 0 && <p className="py-6 text-center text-[12.5px] text-ink-500">Nothing deleted recently.</p>}
          {Array.isArray(items) &&
            items.map((rec) => (
              <div key={rec.id} className="mb-1.5 flex items-center gap-2.5 rounded-xl bg-ink-900/[0.03] px-3 py-2">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-ink-900/5 text-ink-500">
                  <TypeIcon type={rec.node.type} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-ink-900">{rec.node.text || rec.node.title || "Untitled"}</p>
                  <p className="truncate text-[11px] text-ink-500">
                    {boardName(rec.canvas_type, canvases)} · {ago(rec.deleted_at)}
                    {rec.members?.length ? ` · ${rec.members.length} in list` : ""}
                  </p>
                </div>
                {!readOnly && (
                  <button
                    onClick={() => restore(rec)}
                    disabled={busy !== null}
                    className="flex flex-none items-center gap-1 rounded-full bg-bibliarch-blue px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-50"
                  >
                    <RotateCcw size={11} /> {busy === rec.id ? "Restoring…" : "Restore"}
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
