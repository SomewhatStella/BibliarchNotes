"use client";

import { useEffect, useState } from "react";
import { History, RotateCcw, X } from "lucide-react";
import { listSnapshots, type SnapshotRecord } from "@/lib/safety-net";

// Earlier versions of the board you're on: one saved at most every 10
// minutes while anyone edits it, newest 20 kept. Restoring is one undoable
// step, and the current board is saved as a version first.
export default function VersionHistoryPanel({
  storyId,
  canvasType,
  boardLabel,
  readOnly,
  onRestore,
  onClose,
}: {
  storyId: string;
  canvasType: string;
  boardLabel: string;
  readOnly: boolean;
  onRestore: (snap: SnapshotRecord) => Promise<void>;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SnapshotRecord[] | null | "unavailable">(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listSnapshots(storyId, canvasType).then((rows) => setItems(rows ?? "unavailable"));
  }, [storyId, canvasType]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/15" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Version history" className="pop-in emboss flex max-h-[80vh] w-[26rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl p-5">
        <div className="mb-1 flex items-center justify-between">
          <p className="flex items-center gap-2 font-display text-[16px] font-semibold text-ink-900">
            <History size={15} className="text-ink-500" /> Version history
          </p>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>
        <p className="mb-3 text-[12px] text-ink-500">
          Earlier versions of <span className="font-semibold text-ink-700">{boardLabel}</span>, saved every 10 minutes or so while it&rsquo;s being edited.
        </p>

        <div className="scrollbar-thin -mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {items === null && <p className="py-6 text-center text-[12.5px] text-ink-500">Loading…</p>}
          {items === "unavailable" && <p className="py-6 text-center text-[12.5px] text-ink-500">Version history isn&rsquo;t available yet.</p>}
          {Array.isArray(items) && items.length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-ink-500">No earlier versions of this board yet. One is kept once it&rsquo;s been edited for a while.</p>
          )}
          {Array.isArray(items) &&
            items.map((snap) => (
              <div key={snap.id} className="mb-1.5 rounded-xl bg-ink-900/[0.03] px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink-900">
                      {new Date(snap.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      {snap.nodes?.length ?? 0} cards{snap.reason === "before restore" ? " · saved before a restore" : ""}
                    </p>
                  </div>
                  {!readOnly && confirming !== snap.id && (
                    <button onClick={() => setConfirming(snap.id)} className="flex flex-none items-center gap-1 rounded-full bg-ink-900/5 px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 hover:bg-ink-900/10">
                      <RotateCcw size={11} /> Restore this version
                    </button>
                  )}
                </div>
                {confirming === snap.id && (
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-ink-700">
                    <span className="flex-1">Replace this board with this version? You can undo it.</span>
                    <button
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        await onRestore(snap);
                        setBusy(false);
                      }}
                      className="rounded-full bg-bibliarch-blue px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Restoring…" : "Restore"}
                    </button>
                    <button onClick={() => setConfirming(null)} className="rounded-full px-2 py-1 text-[11.5px] text-ink-500">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
