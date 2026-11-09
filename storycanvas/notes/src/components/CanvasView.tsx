"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Trash2, Unlink } from "lucide-react";
import type { CanvasRow, ConnectionType, NodeType, StoryNode } from "@/lib/types";
import { CONNECTION_TYPES } from "@/lib/types";
import NodeCard from "./NodeCard";

export interface CanvasViewport { x: number; y: number; width: number; height: number }

export interface BoardActions {
  moveNode: (id: string, x: number, y: number) => void;
  resizeNode: (id: string, w: number, h: number) => void;
  editNode: (id: string, patch: Partial<StoryNode>) => void;
  deleteNode: (id: string) => void;
  openNode: (node: StoryNode) => void;
  addConnection: (from: string, to: string, type: ConnectionType) => void;
  deleteConnection: (id: string) => void;
  addMemberToList: (listId: string, type: NodeType) => void;
  addExistingCharacterToList: (listId: string, characterId: string, name: string, profileImageUrl?: string) => void;
  removeFromList: (childId: string) => void;
  /** Drop an existing card on the board into a list. */
  moveIntoList: (listId: string, nodeId: string) => void;
  /** Drop a card onto a folder or character: it moves onto that card's own board. */
  moveIntoBoard: (targetId: string, nodeId: string) => void;
  uploadNodeImage: (nodeId: string, file: File) => void;
  lockNode: (nodeId: string, field: string) => void;
  unlockNode: (nodeId: string) => void;
}

const WORLD_SIZE = 6000;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.2;

const CONN_COLOR: Record<string, string> = {
  "leads-to": "#2E5AAC",
  "conflicts-with": "#C76A82",
  "relates-to": "#8B8B8B",
};

function snapTo(v: number, grid: number, enabled: boolean) {
  if (!enabled || grid <= 0) return v;
  return Math.round(v / grid) * grid;
}

export interface LockedNodeInfo {
  nodeId: string;
  odataUserId: string;
  username: string;
  field: string;
}

export default function CanvasView({
  canvas,
  allCharacters,
  selectedId,
  onSelect,
  selectedConnId,
  onSelectConnection,
  actions,
  gridSize,
  snap,
  readOnly = false,
  lockedNodes = {},
  connectMode = false,
  onExitConnectMode,
  onOpenInspector,
  onViewportChange,
}: {
  onViewportChange?: (viewport: CanvasViewport) => void;
  canvas: CanvasRow;
  allCharacters: { id: string; name: string; profileImageUrl?: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selectedConnId: string | null;
  onSelectConnection: (id: string | null) => void;
  actions: BoardActions;
  gridSize: number;
  snap: boolean;
  readOnly?: boolean;
  lockedNodes?: Record<string, LockedNodeInfo>;
  connectMode?: boolean;
  onExitConnectMode?: () => void;
  onOpenInspector: (nodeId: string, anchor: { x: number; y: number }) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  // Cards are wider than a phone screen at full size, so phones start zoomed out.
  const [zoom, setZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth <= 700 ? 0.6 : 1));
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const reportViewport = useCallback(() => {
    const vp = viewportRef.current;
    if (vp) onViewportChange?.({x: vp.scrollLeft / zoom, y: vp.scrollTop / zoom, width: vp.clientWidth / zoom, height: vp.clientHeight / zoom});
  }, [zoom, onViewportChange]);
  useEffect(() => {
    reportViewport();
    const vp = viewportRef.current;
    if (!vp) return;
    const observer = new ResizeObserver(reportViewport);
    observer.observe(vp);
    return () => observer.disconnect();
  }, [reportViewport]);
  const dragState = useRef<{
    id: string;
    kind: "move" | "resize";
    startX: number;
    startY: number;
    nodeStartX: number;
    nodeStartY: number;
    nodeStartW: number;
    nodeStartH: number;
  } | null>(null);
  const [pendingConn, setPendingConn] = useState<{ from: string; x: number; y: number } | null>(null);
  const [connPrompt, setConnPrompt] = useState<{ from: string; to: string } | null>(null);
  // The Arrow tool's click-to-connect path — an alternative to dragging from
  // a card's gold connector dot, for the sidebar's "just the tools" request.
  const [clickConnectFrom, setClickConnectFrom] = useState<string | null>(null);

  useEffect(() => {
    if (!connectMode) setClickConnectFrom(null);
  }, [connectMode]);

  const handleToolClick = useCallback(
    (id: string) => {
      if (!clickConnectFrom) {
        setClickConnectFrom(id);
      } else if (clickConnectFrom === id) {
        setClickConnectFrom(null);
      } else {
        setConnPrompt({ from: clickConnectFrom, to: id });
        setClickConnectFrom(null);
      }
    },
    [clickConnectFrom]
  );

  const topLevelNodes = canvas.nodes.filter((n) => !n.parentId && n.type !== "line");
  const lineNodes = canvas.nodes.filter((n) => n.type === "line" && n.linePoints && !n.parentId);
  // While dragging a card: the list or folder/character it would drop into, outlined on the board.
  const [dropTarget, setDropTarget] = useState<{ id: string; kind: "list" | "board" } | null>(null);

  // Clicking a line only changed its stroke weight slightly — no visible
  // way to tell "this unlinks it" without already knowing the Delete-key
  // shortcut. A floating button at the midpoint makes unlinking an actual
  // click target instead of a secret.
  const selectedConn = selectedConnId ? canvas.connections.find((c) => c.id === selectedConnId) : undefined;
  const selectedConnMid = (() => {
    if (!selectedConn) return null;
    const from = canvas.nodes.find((n) => n.id === selectedConn.from);
    const to = canvas.nodes.find((n) => n.id === selectedConn.to);
    if (!from || !to) return null;
    return {
      x: (from.x + from.width / 2 + to.x + to.width / 2) / 2,
      y: (from.y + from.height / 2 + to.y + to.height / 2) / 2,
    };
  })();

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const vp = viewportRef.current;
      if (!vp) return { x: 0, y: 0 };
      const rect = vp.getBoundingClientRect();
      return { x: (clientX - rect.left + vp.scrollLeft) / zoom, y: (clientY - rect.top + vp.scrollTop) / zoom };
    },
    [zoom]
  );

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return; // plain wheel/trackpad = native scroll-pan
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX - rect.left + vp.scrollLeft;
      const cursorY = e.clientY - rect.top + vp.scrollTop;
      const worldX = cursorX / zoom;
      const worldY = cursorY / zoom;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 - e.deltaY * 0.0012)));
      setZoom(next);
      requestAnimationFrame(() => {
        if (!vp) return;
        vp.scrollLeft = worldX * next - (e.clientX - rect.left);
        vp.scrollTop = worldY * next - (e.clientY - rect.top);
      });
    },
    [zoom]
  );

  // Touch. One finger scrolls the board natively. Pinch zooms. A finger on a selected card
  // (or a line handle) feeds the same mouse handlers the desktop drag uses. A plain tap
  // is left alone so the browser's own click still selects and opens things.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const fire = (type: string, target: EventTarget, x: number, y: number) =>
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, view: window }));
    let pinch: { dist: number; zoom: number; worldX: number; worldY: number } | null = null;
    let drag: { target: HTMLElement; x: number; y: number; active: boolean } | null = null;
    const middle = (e: TouchEvent) => {
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2, dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) };
    };
    const start = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        if (drag?.active) fire("mouseup", window, drag.x, drag.y);
        drag = null;
        const m = middle(e), r = vp.getBoundingClientRect(), z = zoomRef.current;
        pinch = { dist: m.dist, zoom: z, worldX: (m.x - r.left + vp.scrollLeft) / z, worldY: (m.y - r.top + vp.scrollTop) / z };
        return;
      }
      if (e.touches.length !== 1) return;
      const el = e.target as Element;
      if (el.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      if (el.closest("[data-node-id][data-selected], [data-touch-drag]")) drag = { target: el as HTMLElement, x: e.touches[0]!.clientX, y: e.touches[0]!.clientY, active: false };
    };
    const move = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const m = middle(e), r = vp.getBoundingClientRect(), p = pinch;
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (p.zoom * m.dist) / p.dist));
        setZoom(next);
        requestAnimationFrame(() => {
          vp.scrollLeft = p.worldX * next - (m.x - r.left);
          vp.scrollTop = p.worldY * next - (m.y - r.top);
        });
        return;
      }
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      if (!drag.active) {
        if (Math.hypot(t.clientX - drag.x, t.clientY - drag.y) < 6) return;
        drag.active = true;
        fire("mousedown", drag.target, drag.x, drag.y);
      }
      e.preventDefault();
      fire("mousemove", window, t.clientX, t.clientY);
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
      if (drag?.active && e.touches.length === 0) {
        const t = e.changedTouches[0]!;
        e.preventDefault();
        fire("mouseup", window, t.clientX, t.clientY);
      }
      if (e.touches.length === 0) drag = null;
    };
    // iPhones send their own pinch gesture, which would zoom the whole page.
    const block = (e: Event) => e.preventDefault();
    vp.addEventListener("touchstart", start, { passive: true });
    vp.addEventListener("touchmove", move, { passive: false });
    vp.addEventListener("touchend", end, { passive: false });
    vp.addEventListener("touchcancel", end, { passive: false });
    vp.addEventListener("gesturestart", block);
    return () => {
      vp.removeEventListener("touchstart", start);
      vp.removeEventListener("touchmove", move);
      vp.removeEventListener("touchend", end);
      vp.removeEventListener("touchcancel", end);
      vp.removeEventListener("gesturestart", block);
    };
  }, []);

  const dropRef = useRef<{ id: string; kind: "list" | "board" } | null>(null);
  // Same rules as storycanvas: the dragged card's CENTER must land on the target (brushing an
  // edge never swallows it), and anything that sat under the card when the drag began is ignored.
  const findDropTarget = useCallback(
    (node: StoryNode, x: number, y: number): { id: string; kind: "list" | "board" } | null => {
      if (node.parentId || node.type === "line") return null;
      const cx = x + node.width / 2, cy = y + node.height / 2;
      const under = (t: StoryNode) => !(t.x + t.width < node.x || t.x > node.x + node.width || t.y + t.height < node.y || t.y > node.y + node.height);
      const hit = (t: StoryNode) => cx > t.x && cx < t.x + t.width && cy > t.y && cy < t.y + t.height;
      const others = canvas.nodes.filter((t) => t.id !== node.id && !t.parentId && t.type !== "line" && !under(t) && hit(t));
      const listable = node.type === "folder" || node.type === "character" || node.type === "location" || node.type === "event";
      const list = listable ? others.find((t) => t.type === "list") : undefined;
      if (list) return { id: list.id, kind: "list" };
      const board = others.find((t) => t.type === "folder" || t.type === "character" || t.type === "location");
      return board ? { id: board.id, kind: "board" } : null;
    },
    [canvas.nodes]
  );

  // Lines: drag a handle to bend or aim it, or drag the line itself to move it.
  const beginLineDrag = useCallback(
    (node: StoryNode, handle: "start" | "middle" | "end" | "all", clientX: number, clientY: number) => {
      onSelect(node.id);
      onSelectConnection(null);
      if (readOnly || node.settings?.locked || !node.linePoints) return;
      const startPts = node.linePoints, start = toWorld(clientX, clientY);
      const onMove = (ev: MouseEvent) => {
        const p = toWorld(ev.clientX, ev.clientY);
        const clamp = (v: number) => Math.max(0, Math.min(WORLD_SIZE, v));
        let pts = startPts;
        if (handle === "all") {
          const dx = p.x - start.x, dy = p.y - start.y;
          const shift = (q: { x: number; y: number }) => ({ x: clamp(q.x + dx), y: clamp(q.y + dy) });
          pts = { start: shift(startPts.start), middle: shift(startPts.middle), end: shift(startPts.end) };
        } else {
          pts = { ...startPts, [handle]: { x: clamp(snapTo(p.x, gridSize, snap)), y: clamp(snapTo(p.y, gridSize, snap)) } };
        }
        actions.editNode(node.id, { linePoints: pts, x: pts.middle.x, y: pts.middle.y });
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [actions, gridSize, snap, toWorld, onSelect, onSelectConnection, readOnly]
  );

  const beginDrag = useCallback(
    (id: string, kind: "move" | "resize", clientX: number, clientY: number) => {
      if (readOnly || lockedNodes[id]) return;
      const node = canvas.nodes.find((n) => n.id === id);
      if (!node || node.settings?.locked) return;
      dragState.current = {
        id,
        kind,
        startX: clientX,
        startY: clientY,
        nodeStartX: node.x,
        nodeStartY: node.y,
        nodeStartW: node.width,
        nodeStartH: node.height,
      };
      onSelect(id);

      const onMove = (ev: MouseEvent) => {
        const ds = dragState.current;
        if (!ds) return;
        const dx = (ev.clientX - ds.startX) / zoom;
        const dy = (ev.clientY - ds.startY) / zoom;
        if (ds.kind === "move") {
          const nx = snapTo(ds.nodeStartX + dx, gridSize, snap), ny = snapTo(ds.nodeStartY + dy, gridSize, snap);
          actions.moveNode(ds.id, nx, ny);
          dropRef.current = Math.hypot(ev.clientX - ds.startX, ev.clientY - ds.startY) > 6 ? findDropTarget(node, nx, ny) : null;
          setDropTarget(dropRef.current);
        } else {
          actions.resizeNode(
            ds.id,
            Math.max(120, snapTo(ds.nodeStartW + dx, gridSize, snap)),
            Math.max(40, snapTo(ds.nodeStartH + dy, gridSize, snap))
          );
        }
      };
      const onUp = () => {
        const target = dropRef.current;
        dropRef.current = null;
        setDropTarget(null);
        if (target && dragState.current?.kind === "move") {
          if (target.kind === "list") actions.moveIntoList(target.id, id);
          else actions.moveIntoBoard(target.id, id);
        }
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [actions, canvas.nodes, gridSize, snap, zoom, onSelect, readOnly, lockedNodes, findDropTarget]
  );

  const beginConnectDrag = useCallback(
    (fromId: string, clientX: number, clientY: number) => {
      if (readOnly) return;
      const startClient = { x: clientX, y: clientY };
      let dragged = false;
      const onMove = (ev: MouseEvent) => {
        // A real drag only starts past a small threshold — found by
        // actually clicking the dot: a plain click (near-zero but nonzero
        // mouse jitter) could land on a card placed right next to it and
        // pop the "connect these cards" dialog over a darkened screen for
        // something that was never meant to be a drag.
        if (!dragged) {
          const d = Math.hypot(ev.clientX - startClient.x, ev.clientY - startClient.y);
          if (d < 6) return;
          dragged = true;
          const start = toWorld(startClient.x, startClient.y);
          setPendingConn({ from: fromId, x: start.x, y: start.y });
        }
        const p = toWorld(ev.clientX, ev.clientY);
        setPendingConn((cur) => (cur ? { ...cur, x: p.x, y: p.y } : cur));
      };
      const onUp = (ev: MouseEvent) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        setPendingConn(null);
        if (!dragged) return;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const targetEl = el?.closest<HTMLElement>("[data-node-id]");
        const toId = targetEl?.dataset.nodeId;
        if (toId && toId !== fromId) setConnPrompt({ from: fromId, to: toId });
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [toWorld, readOnly]
  );

  return (
    // h-full, not flex-1 — this div's parent (StoryBoard's "relative
    // min-h-0 flex-1" wrapper) isn't itself a flex container, so flex-1
    // here was a no-op and this div silently sized to its own 6000px
    // content instead of the viewport, leaving nothing to actually scroll.
    // Found by driving it for real: the canvas had no vertical scroll at
    // all once the whole-document-scroll bug (that had been masking this)
    // got fixed.
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <div
        ref={viewportRef}
        onWheel={onWheel}
        onScroll={reportViewport}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasGround) {
            onSelect(null);
            onSelectConnection(null);
            setClickConnectFrom(null);
          }
        }}
        className="scrollbar-thin canvas-ground min-h-0 w-full flex-1 overflow-auto"
        style={{ backgroundSize: `${18 * zoom}px ${18 * zoom}px`, backgroundAttachment: "local" }}
      >
        <div data-canvas-ground style={{ width: WORLD_SIZE, height: WORLD_SIZE, transform: `scale(${zoom})`, transformOrigin: "0 0", position: "relative" }}>
          <svg width={WORLD_SIZE} height={WORLD_SIZE} className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 0 }}>
            <defs>
              {Object.entries(CONN_COLOR).map(([key, color]) => (
                <marker key={key} id={`arrow-${key}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M0 0 L10 5 L0 10 z" fill={color} />
                </marker>
              ))}
            </defs>
            {canvas.connections.map((c) => {
              const from = canvas.nodes.find((n) => n.id === c.from);
              const to = canvas.nodes.find((n) => n.id === c.to);
              if (!from || !to) return null;
              const fx = from.x + from.width / 2;
              const fy = from.y + from.height / 2;
              const tx = to.x + to.width / 2;
              const ty = to.y + to.height / 2;
              const color = CONN_COLOR[c.type ?? "relates-to"] ?? "#8B8B8B";
              const selected = c.id === selectedConnId;
              const onClickLine = (e: ReactMouseEvent) => {
                e.stopPropagation();
                onSelectConnection(c.id);
                onSelect(null);
              };
              return (
                <g key={c.id} className="pointer-events-auto" style={{ cursor: "var(--cursor-pointer)" }}>
                  {/* An invisible fat stroke under the visible thin one —
                      the real 1.6px line was too thin a target to reliably
                      click, which made selecting a connection (the only
                      path to the Unlink button) hit-or-miss. Found by
                      actually trying to click one. */}
                  <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="transparent" strokeWidth={16} onClick={onClickLine} />
                  <line
                    x1={fx}
                    y1={fy}
                    x2={tx}
                    y2={ty}
                    stroke={color}
                    strokeWidth={selected ? 3 : 1.6}
                    strokeOpacity={selected ? 1 : 0.55}
                    markerEnd={`url(#arrow-${c.type && c.type in CONN_COLOR ? c.type : "relates-to"})`}
                    onClick={onClickLine}
                  />
                </g>
              );
            })}
            {pendingConn &&
              (() => {
                const from = canvas.nodes.find((n) => n.id === pendingConn.from);
                if (!from) return null;
                return (
                  <line
                    x1={from.x + from.width / 2}
                    y1={from.y + from.height / 2}
                    x2={pendingConn.x}
                    y2={pendingConn.y}
                    stroke="#A87E28"
                    strokeWidth={1.6}
                    strokeDasharray="5 4"
                  />
                );
              })()}
          </svg>

          {topLevelNodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              allNodes={canvas.nodes}
              allCharacters={allCharacters}
              selected={node.id === selectedId || node.id === clickConnectFrom}
              actions={actions}
              onMouseDownMove={(e) => {
                if (connectMode) return;
                beginDrag(node.id, "move", e.clientX, e.clientY);
              }}
              onMouseDownResize={(e) => {
                e.stopPropagation();
                if (connectMode) return;
                beginDrag(node.id, "resize", e.clientX, e.clientY);
              }}
              onSelect={() => (connectMode ? handleToolClick(node.id) : onSelect(node.id))}
              onStartConnect={(e) => {
                e.stopPropagation();
                beginConnectDrag(node.id, e.clientX, e.clientY);
              }}
              onOpenInspector={(anchor) => onOpenInspector(node.id, anchor)}
              readOnly={readOnly || connectMode}
              lockedBy={lockedNodes[node.id]}
            />
          ))}

          {lineNodes.length > 0 && (
            <svg width={WORLD_SIZE} height={WORLD_SIZE} className="pointer-events-none absolute left-0 top-0" style={{ zIndex: 45, overflow: "visible" }}>
              {lineNodes.map((node) => {
                const { start, middle, end } = node.linePoints!;
                // Quadratic curve that passes through the middle handle (same maths as storycanvas).
                const qx = 2 * middle.x - 0.5 * start.x - 0.5 * end.x, qy = 2 * middle.y - 0.5 * start.y - 0.5 * end.y;
                const d = `M ${start.x} ${start.y} Q ${qx} ${qy}, ${end.x} ${end.y}`;
                const color = node.color || "var(--color-connection-default, #2E5AAC)";
                const selected = node.id === selectedId;
                return (
                  <g key={node.id} data-line-id={node.id}>
                    <defs>
                      <marker id={`line-head-${node.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0 0 L10 5 L0 10 z" style={{ fill: color }} />
                      </marker>
                    </defs>
                    <path d={d} stroke="transparent" strokeWidth={18 / zoom} fill="none" className="pointer-events-auto" style={{ cursor: readOnly ? "pointer" : "move" }}
                      onMouseDown={(e) => { e.stopPropagation(); beginLineDrag(node, "all", e.clientX, e.clientY); }} />
                    <path d={d} style={{ stroke: color }} strokeWidth={(node.lineStyle?.width || 2) + (selected ? 1 : 0)} fill="none" strokeLinecap="round" markerEnd={`url(#line-head-${node.id})`} />
                    {selected && !readOnly && (["start", "middle", "end"] as const).map((h) => (
                      <circle key={h} cx={node.linePoints![h].x} cy={node.linePoints![h].y} r={7 / zoom} fill="#fff" style={{ stroke: color, cursor: "grab" }} strokeWidth={2 / zoom}
                        className="pointer-events-auto" data-touch-drag aria-label={`Drag the ${h} of the line`}
                        onMouseDown={(e) => { e.stopPropagation(); beginLineDrag(node, h, e.clientX, e.clientY); }} />
                    ))}
                  </g>
                );
              })}
            </svg>
          )}

          {(() => {
            const sel = lineNodes.find((n) => n.id === selectedId);
            if (!sel || readOnly) return null;
            const m = sel.linePoints!.middle;
            return (
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); actions.deleteNode(sel.id); }}
                title="Delete this line"
                className="pop-in board-pill absolute flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-card"
                style={{ left: m.x, top: m.y - 34 / zoom, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
              >
                <Trash2 size={13} /> Delete line
              </button>
            );
          })()}

          {dropTarget && (() => {
            const t = canvas.nodes.find((n) => n.id === dropTarget.id);
            if (!t) return null;
            return (
              <div className="pointer-events-none absolute rounded-2xl" style={{ zIndex: 60, left: t.x - 6, top: t.y - 6, width: t.width + 12, height: t.height + 12, boxShadow: "0 0 0 3px #2E5AAC, 0 0 0 8px rgba(46,90,172,.18)" }}>
                <span className="absolute -top-7 left-1/2 whitespace-nowrap rounded-full bg-bibliarch-blue px-2.5 py-0.5 text-[11.5px] font-semibold text-white" style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}>
                  {dropTarget.kind === "list" ? "Drop to add to this list" : `Drop to move inside ${t.text || t.title || "this card"}`}
                </span>
              </div>
            );
          })()}

          {selectedConnMid && !readOnly && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                actions.deleteConnection(selectedConnId!);
                onSelectConnection(null);
              }}
              title="Remove this connection"
              className="pop-in board-pill absolute flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold shadow-card"
              style={{ left: selectedConnMid.x, top: selectedConnMid.y, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
            >
              <Unlink size={13} /> Unlink
            </button>
          )}
        </div>
      </div>

      {connPrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink-900/20">
          <div className="pop-in emboss w-72 rounded-2xl p-5">
            <p className="font-display text-[15px] font-semibold text-ink-900">Connect these cards</p>
            <p className="mt-1 text-[12.5px] text-ink-500">What kind of link is this?</p>
            <div className="mt-3 flex flex-col gap-1.5">
              {CONNECTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    actions.addConnection(connPrompt.from, connPrompt.to, t);
                    setConnPrompt(null);
                  }}
                  className="emboss flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:emboss-pressed"
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: CONN_COLOR[t] }} />
                  {t.replace(/-/g, " ")}
                </button>
              ))}
            </div>
            <button onClick={() => setConnPrompt(null)} className="mt-3 w-full rounded-lg px-3 py-1.5 text-[12.5px] text-ink-500">
              Cancel
            </button>
          </div>
        </div>
      )}

      {connectMode && (
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 rounded-full bg-bibliarch-blue px-4 py-1.5 text-[12.5px] font-semibold text-white shadow-card">
          {clickConnectFrom ? "Now click the card to connect it to" : "Click a card to start a connection"}
          <button onClick={onExitConnectMode} className="ml-3 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
            done
          </button>
        </div>
      )}

      <div className="flex flex-none items-center justify-end gap-1.5 border-t border-ink-900/10 bg-editor-raised/90 px-3 py-1 font-mono text-[11px] text-ink-500">
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))} className="rounded-full px-2 hover:bg-ink-900/5">−</button>
        {Math.round(zoom * 100)}%
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))} className="rounded-full px-2 hover:bg-ink-900/5">+</button>
        <button onClick={() => setZoom(1)} className="ml-1 rounded-full px-2 hover:bg-ink-900/5">reset</button>
      </div>
    </div>
  );
}
