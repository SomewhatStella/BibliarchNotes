"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, PenLine, Undo2 } from "lucide-react";
import type { StoryNode } from "@/lib/types";
import { newNode, generateId } from "@/lib/node-factory";
import { boxesNear, hitsStroke, packDrawing, simplifyPoints, smoothPath, strokesBounds, unpackDrawing, type Pt, type WorldStroke } from "@/lib/drawing";
import type { BoardActions } from "./CanvasView";
import { PEN_COLORS, PEN_WIDTHS } from "./DrawingCard";

export interface PenSettings { tool: "pen" | "eraser"; color: string; width: number }
const PREFS_KEY = "bibliarch-notes:pen";
const JOIN_GAP = 48; // a new stroke this close to the doodle you're drawing joins it

function loadSettings(): PenSettings {
  const fallback: PenSettings = { tool: "pen", color: PEN_COLORS[0]!, width: PEN_WIDTHS[1]! };
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    if (p && PEN_COLORS.includes(p.color) && PEN_WIDTHS.includes(p.width)) return { ...fallback, color: p.color, width: p.width };
  } catch {
    /* private window or malformed prefs: defaults are fine */
  }
  return fallback;
}

/**
 * Pen-mode state and the edits it makes. Strokes drawn near each other in one
 * pen session become one `drawing` node (so a doodle moves as one piece);
 * a stroke somewhere else starts a new one. Leaving pen mode ends the session.
 */
export function usePenTool(active: boolean, nodes: StoryNode[], actions: BoardActions) {
  const [settings, setSettings] = useState<PenSettings>(() => (typeof window === "undefined" ? { tool: "pen", color: PEN_COLORS[0]!, width: PEN_WIDTHS[1]! } : loadSettings()));
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const session = useRef<{ drawings: string[]; history: { nodeId: string; strokeId: string }[] }>({ drawings: [], history: [] });
  const [historySize, setHistorySize] = useState(0);

  useEffect(() => {
    if (!active) {
      session.current = { drawings: [], history: [] };
      setHistorySize(0);
    }
  }, [active]);

  const update = useCallback((patch: Partial<PenSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ color: next.color, width: next.width }));
      } catch {
        /* per-viewer convenience only */
      }
      return next;
    });
  }, []);

  const find = (id: string) => nodesRef.current.find((n) => n.id === id && n.type === "drawing");
  // Several edits can land before the next render (one eraser swipe can hit
  // many strokes), so each one is mirrored here; otherwise the second edit
  // would start from stale strokes and bring the first one's back.
  const apply = (id: string, patch: Partial<StoryNode> | null) => {
    if (patch) {
      actions.editNode(id, patch);
      nodesRef.current = nodesRef.current.map((n) => (n.id === id ? { ...n, ...patch } : n));
    } else {
      actions.deleteNode(id);
      nodesRef.current = nodesRef.current.filter((n) => n.id !== id);
    }
  };

  const commitStroke = useCallback((raw: Pt[], zoom: number) => {
    if (raw.length === 0) return;
    const stroke: WorldStroke = { id: generateId("stroke").slice(0, 20), points: simplifyPoints(raw, 0.6 / zoom), color: settings.color, width: settings.width };
    const box = strokesBounds([stroke])!;
    for (const id of [...session.current.drawings].reverse()) {
      const node = find(id);
      if (!node || node.settings?.locked) continue;
      if (!boxesNear({ x: node.x, y: node.y, w: node.width, h: node.height }, box, JOIN_GAP)) continue;
      const packed = packDrawing([...unpackDrawing(node), stroke]);
      if (packed) apply(id, packed);
      session.current.history.push({ nodeId: id, strokeId: stroke.id });
      setHistorySize(session.current.history.length);
      return;
    }
    const packed = packDrawing([stroke]);
    if (!packed || !actions.addNode) return;
    const node = newNode("drawing", { ...packed, text: "Drawing" });
    actions.addNode(node);
    nodesRef.current = [...nodesRef.current, node];
    session.current.drawings.push(node.id);
    session.current.history.push({ nodeId: node.id, strokeId: stroke.id });
    setHistorySize(session.current.history.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.color, settings.width, actions]);

  /** Remove (or shrink) whichever drawings the eraser at `p` touches. */
  const eraseAt = useCallback((p: Pt, radius: number) => {
    for (const node of nodesRef.current) {
      if (node.type !== "drawing" || node.parentId || node.settings?.locked) continue;
      if (!boxesNear({ x: node.x, y: node.y, w: node.width, h: node.height }, { x: p.x, y: p.y, w: 0, h: 0 }, radius)) continue;
      const strokes = unpackDrawing(node);
      const kept = strokes.filter((s) => !hitsStroke(s, p, radius));
      if (kept.length === strokes.length) continue;
      apply(node.id, packDrawing(kept));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  const undo = useCallback(() => {
    const h = session.current.history;
    while (h.length) {
      const last = h.pop()!;
      const node = find(last.nodeId);
      if (!node) continue;
      const strokes = unpackDrawing(node);
      const kept = strokes.filter((s) => s.id !== last.strokeId);
      if (kept.length === strokes.length) continue; // already erased by hand
      apply(node.id, packDrawing(kept));
      break;
    }
    setHistorySize(h.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  return { settings, update, commitStroke, eraseAt, undo, canUndo: historySize > 0 };
}

export type PenTool = ReturnType<typeof usePenTool>;

/**
 * Sits over the whole board while pen mode is on and turns pointer drags into
 * strokes. Pointer events cover mouse, touch and stylus alike; a second
 * finger cancels the stroke so pinch-zoom still works.
 */
export function PenOverlay({ pen, toWorld, zoom }: { pen: PenTool; toWorld: (x: number, y: number) => Pt; zoom: number }) {
  const active = useRef<{ pointerId: number; points: Pt[] } | null>(null);
  const pointers = useRef(new Set<number>());
  const [live, setLive] = useState<Pt[] | null>(null);
  const [hover, setHover] = useState<Pt | null>(null);
  const eraseRadius = 10 / zoom;
  const erasing = pen.settings.tool === "eraser";

  function eraseAlong(from: Pt, to: Pt) {
    // Sample the segment so a fast swipe can't skip over a thin stroke.
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (eraseRadius / 2)));
    for (let i = 1; i <= steps; i++) pen.eraseAt({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }, eraseRadius);
  }

  function onDown(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.add(e.pointerId);
    if (pointers.current.size > 1) {
      active.current = null;
      setLive(null);
      return;
    }
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toWorld(e.clientX, e.clientY);
    active.current = { pointerId: e.pointerId, points: [p] };
    if (erasing) pen.eraseAt(p, eraseRadius);
    else setLive([p]);
  }

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const p = toWorld(e.clientX, e.clientY);
    if (erasing && e.pointerType !== "touch") setHover(p);
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [];
    const samples = events.length ? events.map((ev) => toWorld(ev.clientX, ev.clientY)) : [p];
    for (const s of samples) {
      const last = a.points[a.points.length - 1]!;
      if (Math.hypot(s.x - last.x, s.y - last.y) < 1 / zoom) continue;
      if (erasing) eraseAlong(last, s);
      a.points.push(s);
    }
    if (!erasing) setLive(a.points.slice());
  }

  function onUp(e: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    const a = active.current;
    if (!a || a.pointerId !== e.pointerId) return;
    active.current = null;
    setLive(null);
    if (!erasing && e.type === "pointerup") pen.commitStroke(a.points, zoom);
  }

  return (
    <div
      className="absolute inset-0"
      style={{ zIndex: 80, touchAction: "none", cursor: erasing ? "none" : "crosshair" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={() => setHover(null)}
      aria-label={erasing ? "Eraser: drag over a drawing to rub it out" : "Pen: drag to draw"}
    >
      <svg className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible">
        {live && <path d={smoothPath(live)} fill="none" stroke={pen.settings.color} strokeWidth={pen.settings.width} strokeLinecap="round" strokeLinejoin="round" />}
        {erasing && hover && <circle cx={hover.x} cy={hover.y} r={eraseRadius} fill="rgba(255,255,255,.5)" stroke="#1f2633" strokeWidth={1 / zoom} strokeDasharray={`${3 / zoom} ${2 / zoom}`} />}
      </svg>
    </div>
  );
}

/** Floating pen controls over the board: pen/eraser, colour, weight, undo, done. Esc also exits. */
export function PenToolbar({ pen, onExit }: { pen: PenTool; onExit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const { tool, color, width } = pen.settings;
  const seg = (on: boolean) => `flex h-7 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-semibold ${on ? "bg-bibliarch-blue text-white" : "text-ink-700 hover:bg-ink-900/5"}`;
  return (
    <div role="toolbar" aria-label="Pen" className="pop-in emboss absolute left-1/2 top-3 z-30 flex max-w-[calc(100%-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-2xl px-2 py-1.5 shadow-card">
      <button className={seg(tool === "pen")} onClick={() => pen.update({ tool: "pen" })} aria-pressed={tool === "pen"}><PenLine size={13} /> Pen</button>
      <button className={seg(tool === "eraser")} onClick={() => pen.update({ tool: "eraser" })} aria-pressed={tool === "eraser"}><Eraser size={13} /> Eraser</button>
      <span className="mx-1 h-5 w-px bg-ink-900/10" />
      {PEN_COLORS.map((c) => (
        <button key={c} aria-label={`Ink ${c}`} aria-pressed={color === c && tool === "pen"} onClick={() => pen.update({ color: c, tool: "pen" })}
          className={`h-5 w-5 rounded-full border-2 transition-transform ${color === c && tool === "pen" ? "scale-110 border-gold-500" : "border-white shadow-card"}`} style={{ background: c }} />
      ))}
      <span className="mx-1 h-5 w-px bg-ink-900/10" />
      {PEN_WIDTHS.map((w) => (
        <button key={w} aria-label={`Line weight ${w}`} aria-pressed={width === w && tool === "pen"} onClick={() => pen.update({ width: w, tool: "pen" })}
          className={`flex h-7 w-7 items-center justify-center rounded-full ${width === w && tool === "pen" ? "bg-ink-900/10" : "hover:bg-ink-900/5"}`}>
          <span className="rounded-full" style={{ width: w + 2, height: w + 2, background: color }} />
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-ink-900/10" />
      <button aria-label="Undo last stroke" title="Undo last stroke" disabled={!pen.canUndo} onClick={pen.undo} className="flex h-7 w-7 items-center justify-center rounded-full text-ink-700 hover:bg-ink-900/5 disabled:opacity-30"><Undo2 size={14} /></button>
      <button onClick={onExit} title="Finish drawing (Esc)" className="ml-1 rounded-full bg-ink-900 px-3 py-1 text-[11.5px] font-semibold text-white">Done</button>
    </div>
  );
}
