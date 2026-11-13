"use client";

import { useMemo, type MouseEvent } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { StoryNode } from "@/lib/types";
import { flatToPoints, smoothPath } from "@/lib/drawing";
import type { BoardActions, LockedNodeInfo } from "./CanvasView";

/** What NodeCard hands to the card types that draw their own chrome (drawings, shapes). */
export interface OwnChromeCardProps {
  node: StoryNode;
  selected: boolean;
  actions: BoardActions;
  onMouseDownMove: (e: MouseEvent) => void;
  onMouseDownResize: (e: MouseEvent) => void;
  onSelect: () => void;
  onOpenInspector: (anchor: { x: number; y: number }) => void;
  readOnly?: boolean;
  lockedBy?: LockedNodeInfo;
}

export const PEN_COLORS = ["#1f2633", "#2E5AAC", "#C76A82", "#3E9B5C", "#E8A61C", "#8A5BB8"];
export const PEN_WIDTHS = [2, 4, 8];

/**
 * A pen doodle. The box itself is click-through — only the ink is a target —
 * so a big loose sketch never blocks clicks on the cards it was drawn around.
 */
export default function DrawingCard({ node, selected, actions, onMouseDownMove, onMouseDownResize, onSelect, onOpenInspector, readOnly = false, lockedBy }: OwnChromeCardProps) {
  const d = node.drawing;
  // Points live in the drawing's own w×h space; scaling them here (not with an
  // SVG viewBox) keeps the line weight even after a lopsided resize.
  const paths = useMemo(() => {
    if (!d) return [];
    const sx = d.w > 0 ? node.width / d.w : 1, sy = d.h > 0 ? node.height / d.h : 1;
    return d.strokes.map((s) => ({ ...s, d: smoothPath(flatToPoints(s.points).map((p) => ({ x: p.x * sx, y: p.y * sy }))) }));
  }, [d, node.width, node.height]);
  const blocked = readOnly || !!node.settings?.locked || !!lockedBy;

  return (
    <div
      data-node-id={node.id}
      data-selected={selected || undefined}
      className="absolute"
      style={{ left: node.x, top: node.y, width: node.width, height: node.height, zIndex: selected ? 50 : node.zIndex ?? 1, pointerEvents: "none" }}
    >
      <svg width={node.width} height={node.height} className="absolute left-0 top-0 overflow-visible">
        {paths.map((s) => (
          <g key={s.id}>
            <path
              d={s.d}
              fill="none"
              stroke="transparent"
              strokeWidth={s.width + 14}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ pointerEvents: "stroke", cursor: blocked ? "pointer" : "var(--cursor-grab, grab)" }}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                onMouseDownMove(e);
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            />
            <path d={s.d} fill="none" stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </svg>

      {selected && (
        <div className="pointer-events-none absolute -inset-1 rounded-lg border-[1.5px] border-dashed border-gold-500" />
      )}
      {selected && !readOnly && (
        <>
          <div className="pointer-events-auto absolute bottom-full right-0 mb-1 flex items-center gap-1" data-node-controls>
            <StyleButton onOpenInspector={onOpenInspector} />
            <DeleteButton label="Delete drawing" onDelete={() => actions.deleteNode(node.id)} />
          </div>
          {!blocked && <ResizeHandle onMouseDown={onMouseDownResize} />}
        </>
      )}
    </div>
  );
}

export function StyleButton({ onOpenInspector }: { onOpenInspector: (anchor: { x: number; y: number }) => void }) {
  return (
    <button
      title="Style"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        onOpenInspector({ x: r.left, y: r.bottom + 6 });
      }}
      className="rounded-full bg-editor-raised/90 p-1 text-ink-500 shadow-card hover:bg-bibliarch-blue/15 hover:text-bibliarch-blue"
    >
      <SlidersHorizontal size={12} />
    </button>
  );
}

export function DeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <button
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="rounded-full bg-editor-raised/90 p-1 text-ink-500 shadow-card hover:bg-bibliarch-rose/15 hover:text-bibliarch-rose"
    >
      <X size={12} />
    </button>
  );
}

export function ResizeHandle({ onMouseDown, className = "-bottom-3 -right-3 cursor-nwse-resize border-b-2 border-r-2" }: { onMouseDown: (e: MouseEvent) => void; className?: string }) {
  return (
    <div
      title="Resize"
      data-touch-drag
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onMouseDown(e);
      }}
      className={`pointer-events-auto absolute h-3 w-3 rounded-sm border-ink-500/50 ${className}`}
    />
  );
}

/** Inspector section for a drawing: recolour or re-weight every stroke at once. */
export function DrawingStyleSection({ node, onChange }: { node: StoryNode; onChange: (patch: Partial<StoryNode>) => void }) {
  const d = node.drawing;
  if (!d) return null;
  const set = (patch: { color?: string; width?: number }) => onChange({ drawing: { ...d, strokes: d.strokes.map((s) => ({ ...s, ...patch })) } });
  const colors = new Set(d.strokes.map((s) => s.color));
  const widths = new Set(d.strokes.map((s) => s.width));
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-500">Ink</p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {PEN_COLORS.map((c) => (
          <button key={c} title={c} aria-label={`Ink colour ${c}`} onClick={() => set({ color: c })}
            className={`h-6 w-6 rounded-full border-2 ${colors.size === 1 && colors.has(c) ? "border-gold-500" : "border-white shadow-card"}`} style={{ background: c }} />
        ))}
      </div>
      <div className="flex gap-1">
        {PEN_WIDTHS.map((w) => (
          <button key={w} onClick={() => set({ width: w })} aria-label={`Line weight ${w}`}
            className={`flex h-7 w-10 items-center justify-center rounded-full ${widths.size === 1 && widths.has(w) ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"}`}>
            <span className="rounded-full bg-current" style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{d.strokes.length} stroke{d.strokes.length === 1 ? "" : "s"}</p>
    </div>
  );
}
