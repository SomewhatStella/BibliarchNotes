"use client";

import { useState } from "react";
import type { ShapeData, ShapeKind, StoryNode } from "@/lib/types";
import { SHAPE_LABELS, shapeDefaults, shapeZIndex, withOrientation } from "@/lib/shapes";
import { DeleteButton, ResizeHandle, StyleButton, type OwnChromeCardProps } from "./DrawingCard";

const BOARD_COLOR = "var(--color-node-default, #2E5AAC)";

function look(s: ShapeData) {
  const stroke = s.stroke || BOARD_COLOR;
  const sw = s.strokeWidth ?? 2;
  const fill = s.fill || (s.kind === "frame" ? stroke : "none");
  const fillOpacity = s.fill ? s.fillOpacity ?? 0.18 : s.kind === "frame" ? 0.05 : 0;
  const dash = s.strokeStyle === "dashed" ? `${sw * 4} ${sw * 3}` : undefined;
  return { stroke, sw, fill, fillOpacity, dash, filled: fill !== "none" };
}

/**
 * Rectangles, ellipses, dividers and section frames. Like drawings, only the
 * painted parts are click targets (outline, fill if any, a frame's label), so
 * a big frame never swallows clicks meant for the board or the cards on it.
 */
export default function ShapeCard({ node, selected, actions, onMouseDownMove, onMouseDownResize, onSelect, onOpenInspector, readOnly = false, lockedBy }: OwnChromeCardProps) {
  const s: ShapeData = node.shape ?? { kind: "rect" };
  const { stroke, sw, fill, fillOpacity, dash, filled } = look(s);
  const w = node.width, h = node.height;
  const blocked = readOnly || !!node.settings?.locked || !!lockedBy;
  const [editingLabel, setEditingLabel] = useState(false);
  const [draft, setDraft] = useState("");

  const grab = {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      onMouseDownMove(e);
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect();
    },
    style: { pointerEvents: "auto" as const, cursor: blocked ? "pointer" : "var(--cursor-grab, grab)" },
  };

  const inset = sw / 2;
  const geometry = (extra: React.SVGProps<SVGElement>) => {
    switch (s.kind) {
      case "ellipse":
        return <ellipse cx={w / 2} cy={h / 2} rx={Math.max(1, w / 2 - inset)} ry={Math.max(1, h / 2 - inset)} {...(extra as React.SVGProps<SVGEllipseElement>)} />;
      case "divider":
        return s.orientation === "vertical"
          ? <line x1={w / 2} y1={inset} x2={w / 2} y2={h - inset} {...(extra as React.SVGProps<SVGLineElement>)} />
          : <line x1={inset} y1={h / 2} x2={w - inset} y2={h / 2} {...(extra as React.SVGProps<SVGLineElement>)} />;
      default: {
        const rx = s.kind === "rect" ? 0 : Math.min(s.kind === "frame" ? 16 : 22, w / 4, h / 4);
        return <rect x={inset} y={inset} width={Math.max(1, w - sw)} height={Math.max(1, h - sw)} rx={rx} {...(extra as React.SVGProps<SVGRectElement>)} />;
      }
    }
  };

  function startLabelEdit() {
    if (blocked) return;
    setDraft(node.text ?? "");
    setEditingLabel(true);
    actions.lockNode(node.id, "text");
  }
  function commitLabel() {
    actions.editNode(node.id, { text: draft });
    setEditingLabel(false);
    actions.unlockNode(node.id);
  }

  const isDivider = s.kind === "divider";
  const vertical = isDivider && s.orientation === "vertical";

  return (
    <div
      data-node-id={node.id}
      data-selected={selected || undefined}
      className="absolute"
      style={{ left: node.x, top: node.y, width: w, height: h, zIndex: selected && node.shape?.layer === "front" ? 50 : shapeZIndex(node), pointerEvents: "none" }}
    >
      <svg width={w} height={h} className="absolute left-0 top-0 overflow-visible">
        {geometry({ style: { fill, fillOpacity, stroke, pointerEvents: "none" }, strokeWidth: sw, strokeDasharray: dash, strokeLinecap: "round" })}
        {/* Fat invisible outline: the reliable thing to grab. */}
        {geometry({ style: { fill: "none", stroke: "transparent", ...grab.style, pointerEvents: "stroke" }, strokeWidth: sw + 14, onMouseDown: grab.onMouseDown, onClick: grab.onClick })}
        {filled && !isDivider && geometry({ style: { fill: "transparent", stroke: "none", ...grab.style, pointerEvents: "fill" }, onMouseDown: grab.onMouseDown, onClick: grab.onClick })}
      </svg>

      {s.kind === "frame" && (
        <div
          className="absolute left-3 top-2.5 max-w-[calc(100%-24px)] rounded-md border bg-editor-raised px-2 py-0.5 shadow-card"
          style={{ ...grab.style, borderColor: stroke }}
          onMouseDown={(e) => { if (!editingLabel) grab.onMouseDown(e); }}
          onClick={grab.onClick}
          onDoubleClick={(e) => { e.stopPropagation(); startLabelEdit(); }}
        >
          {editingLabel ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") commitLabel(); }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-40 border-none bg-transparent font-display text-[13px] font-semibold text-ink-900 outline-none"
            />
          ) : (
            <span className="block truncate font-display text-[13px] font-semibold" style={{ color: stroke }} title={blocked ? undefined : "Double-click to rename"}>
              {node.text || "Section"}
            </span>
          )}
        </div>
      )}

      {selected && <div className={`pointer-events-none absolute -inset-1 border-[1.5px] border-dashed border-gold-500 ${s.kind === "ellipse" ? "rounded-[50%]" : "rounded-lg"}`} />}
      {selected && !readOnly && (
        <>
          <div className="pointer-events-auto absolute bottom-full right-0 mb-1 flex items-center gap-1" data-node-controls>
            <StyleButton onOpenInspector={onOpenInspector} />
            <DeleteButton label={`Delete ${SHAPE_LABELS[s.kind].toLowerCase()}`} onDelete={() => actions.deleteNode(node.id)} />
          </div>
          {!blocked && (
            <ResizeHandle
              onMouseDown={onMouseDownResize}
              className={vertical ? "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize border-b-2" : isDivider ? "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize border-r-2" : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}

const STROKES = ["", "#1f2633", "#2E5AAC", "#C76A82", "#3E9B5C", "#E8A61C", "#8A5BB8", "#8B8B8B"];
const KINDS: ShapeKind[] = ["rect", "rounded", "ellipse", "divider", "frame"];

/** Inspector controls for a shape: kind, outline colour and style, fill, layer. */
export function ShapeStyleSection({ node, onChange }: { node: StoryNode; onChange: (patch: Partial<StoryNode>) => void }) {
  const s: ShapeData = node.shape ?? { kind: "rect" };
  const set = (p: Partial<ShapeData>) => onChange({ shape: { ...s, ...p } });
  function setKind(kind: ShapeKind) {
    if (kind === s.kind) return;
    // Into or out of a divider the box has to change shape too.
    if (kind === "divider" || s.kind === "divider") {
      const d = shapeDefaults(kind, s.orientation);
      onChange({ width: d.width, height: d.height, shape: { ...s, kind, orientation: kind === "divider" ? s.orientation ?? "horizontal" : undefined } });
    } else {
      onChange({ shape: { ...s, kind }, ...(kind === "frame" && !node.text ? { text: "Section" } : {}) });
    }
  }
  return (
    <>
      <Row label="Shape">
        <Pills options={KINDS.map((k) => [k, k === "rect" ? "Rect" : k === "rounded" ? "Rounded" : k === "ellipse" ? "Ellipse" : k === "divider" ? "Divider" : "Frame"])} value={s.kind} onChange={(v) => setKind(v as ShapeKind)} />
      </Row>
      {s.kind === "divider" && (
        <Row label="Direction">
          <Pills options={[["horizontal", "Horizontal"], ["vertical", "Vertical"]]} value={s.orientation ?? "horizontal"} onChange={(v) => onChange(withOrientation(node, v as "horizontal" | "vertical"))} />
        </Row>
      )}
      <Row label="Outline">
        <Swatches value={s.stroke ?? ""} onChange={(c) => set({ stroke: c || undefined })} />
        <div className="mt-2">
          <Pills options={[["solid", "Solid"], ["dashed", "Dashed"]]} value={s.strokeStyle ?? "solid"} onChange={(v) => set({ strokeStyle: v as "solid" | "dashed" })} />
        </div>
        <div className="mt-2">
          <Pills options={[["1", "Thin"], ["2", "Medium"], ["4", "Thick"]]} value={String(s.strokeWidth ?? 2)} onChange={(v) => set({ strokeWidth: Number(v) })} />
        </div>
      </Row>
      {s.kind !== "divider" && (
        <Row label="Fill">
          <Swatches value={s.fill ?? ""} none onChange={(c) => set({ fill: c || undefined })} />
          {s.fill && (
            <div className="mt-2">
              <Pills options={[["0.18", "Soft"], ["0.5", "Medium"], ["1", "Solid"]]} value={String(s.fillOpacity ?? 0.18)} onChange={(v) => set({ fillOpacity: Number(v) })} />
            </div>
          )}
        </Row>
      )}
      {s.kind !== "frame" && (
        <Row label="Layer">
          <Pills options={[["back", "Behind cards"], ["front", "In front"]]} value={s.layer ?? "back"} onChange={(v) => set({ layer: v as "back" | "front" })} />
        </Row>
      )}
      {s.kind === "frame" && <p className="mb-3.5 text-[11px] text-ink-500">Frames always sit behind cards. Double-click the label to rename it.</p>}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3.5">
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-500">{label}</p>
      {children}
    </div>
  );
}

function Pills({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-2.5 py-1 text-[11.5px] ${value === v ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Swatches({ value, onChange, none = false }: { value: string; onChange: (c: string) => void; none?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {STROKES.map((c) => {
        const isBoard = c === "";
        if (isBoard && none) {
          return (
            <button key="none" title="No fill" aria-label="No fill" onClick={() => onChange("")}
              className={`relative h-6 w-6 overflow-hidden rounded-full border-2 bg-white ${value === "" ? "border-gold-500" : "border-ink-900/15"}`}>
              <span className="absolute left-1/2 top-[-2px] h-7 w-[2px] -translate-x-1/2 rotate-45 bg-bibliarch-rose" />
            </button>
          );
        }
        return (
          <button key={c || "board"} title={isBoard ? "Board's main colour" : c} aria-label={isBoard ? "Board's main colour" : `Colour ${c}`} onClick={() => onChange(c)}
            className={`h-6 w-6 rounded-full border-2 ${value === c ? "border-gold-500" : "border-white shadow-card"}`}
            style={{ background: isBoard ? BOARD_COLOR : c }} />
        );
      })}
      {!none && <span className="text-[11px] text-ink-500">{value === "" ? "board colour" : ""}</span>}
      {none && (
        <button key="board-fill" title="Board's main colour" aria-label="Fill with the board's main colour" onClick={() => onChange(BOARD_COLOR)}
          className={`h-6 w-6 rounded-full border-2 ${value === BOARD_COLOR ? "border-gold-500" : "border-white shadow-card"}`} style={{ background: BOARD_COLOR }} />
      )}
    </div>
  );
}
