"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, MapPin, Search, User, X } from "lucide-react";
import { linkableCards } from "@/lib/character-links";
import { getImageUrl } from "@/lib/storage";
import type { CanvasRow, StoryNode } from "@/lib/types";

/*
 * "Link existing character/place": pick someone who already exists anywhere in the story and
 * put a linked card for them on this board, instead of making a second copy of them.
 */
export default function LinkCharacterDialog({
  canvases,
  currentCanvasType,
  onPick,
  onClose,
}: {
  canvases: Record<string, CanvasRow>;
  currentCanvasType: string;
  onPick: (original: StoryNode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "character" | "location">("all");
  const input = useRef<HTMLInputElement>(null);
  // Kept in a ref so a board re-render (a new onClose) doesn't re-run the focus effect.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const all = useMemo(() => linkableCards(canvases), [canvases]);
  const here = canvases[currentCanvasType]?.nodes ?? [];
  const q = query.trim().toLowerCase();
  const shown = all.filter((c) => (kind === "all" || c.node.type === kind) && (!q || (c.node.text || "").toLowerCase().includes(q)));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/20 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="link-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="pop-in emboss flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-900/8 px-5 py-4">
          <div>
            <p id="link-dialog-title" className="flex items-center gap-1.5 font-display text-[17px] font-semibold text-ink-900">
              <Link2 size={16} /> Link an existing card
            </p>
            <p className="text-[12px] text-ink-500">Shows the same character or place here. No copy: edit it anywhere and it changes everywhere.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex-none rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2 border-b border-ink-900/8 px-5 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-ink-900/12 bg-editor-raised px-3 py-2 focus-within:border-bibliarch-blue">
            <Search size={14} className="flex-none text-ink-500" />
            <input
              ref={input}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                const first = shown.find((c) => !here.some((n) => n.id === c.node.id || n.refNodeId === c.node.id));
                if (e.key === "Enter" && first) onPick(first.node);
              }}
              placeholder="Search by name…"
              aria-label="Search by name"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-900 outline-none"
            />
          </label>
          <div className="flex gap-1.5" role="group" aria-label="Show">
            {(["all", "character", "location"] as const).map((k) => (
              <button
                key={k}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 text-[12px] font-semibold ${kind === k ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}
              >
                {k === "all" ? "All" : k === "character" ? "Characters" : "Places"}
              </button>
            ))}
          </div>
        </div>

        <ul className="scrollbar-thin flex-1 overflow-auto p-2">
          {all.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-ink-500">No characters or places in this story yet. Add one with the sidebar first.</li>}
          {all.length > 0 && shown.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-ink-500">Nobody matches “{query}”.</li>}
          {shown.map(({ node, board }) => {
            const onThisBoard = here.some((n) => n.id === node.id);
            const linkedHere = here.some((n) => n.refNodeId === node.id);
            const disabled = onThisBoard || linkedHere;
            const portrait = getImageUrl(node.profileImageUrl);
            return (
              <li key={node.id}>
                <button
                  disabled={disabled}
                  onClick={() => onPick(node)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-ink-900/5 disabled:opacity-45 disabled:hover:bg-transparent"
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white" style={{ background: node.color || "var(--color-node-default)" }}>
                    {portrait ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={portrait} alt="" className="h-full w-full object-cover" />
                    ) : node.type === "location" ? (
                      node.locationIcon || <MapPin size={15} />
                    ) : (
                      (node.text || "?").slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[13.5px] font-semibold text-ink-900">{node.text || "Untitled"}</span>
                    <span className="flex items-center gap-1 truncate text-[11px] text-ink-500">
                      {node.type === "location" ? <MapPin size={10} /> : <User size={10} />}
                      {onThisBoard ? "Already on this board" : linkedHere ? "Already linked here" : `on ${board}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
