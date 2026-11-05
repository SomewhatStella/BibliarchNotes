"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCanvasStore } from "@/lib/store";
import { newNode } from "@/lib/node-factory";
import { uploadNodeImage } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { getStoryAccess, type StoryRole } from "@/lib/collaboration";
import { useRealtimeCanvas, useStoryCoordination, usePresence, type LockedNode } from "@/lib/realtime";
import { exportStoryAsText, downloadText } from "@/lib/export";
import { migrateLegacyImages } from "@/lib/migrate-images";
import { applyPaletteToDOM, DEFAULT_PALETTE, normalizePalette, type ColorPalette } from "@/lib/color-palette";
import type { ConnectionType, NodeType, StoryConnection, StoryNode } from "@/lib/types";
import CanvasView, { type CanvasViewport, type BoardActions } from "./CanvasView";
import Toolbar from "./Toolbar";
import Sidebar from "./Sidebar";
import SettingsPopup from "./SettingsPopup";
import NodeInspector from "./NodeInspector";
import ShareDialog from "./ShareDialog";
import FeedbackModal from "./FeedbackModal";
import PaletteEditor from "./PaletteEditor";
import CustomTypesDialog from "./CustomTypesDialog";
import { instantiateTemplate, snapshotInteriors, type CustomTemplate } from "@/lib/custom-templates";

type Crumb = { canvasType: string; label: string };



export default function StoryBoard({ storyId, storyTitle, userId }: { storyId: string; storyTitle: string; userId: string }) {
  const router = useRouter();
  const store = useCanvasStore();
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ canvasType: "main", label: storyTitle }]);
  const viewport = useRef<CanvasViewport>({x:0,y:0,width:800,height:600});
  const onViewportChange = useCallback((next: CanvasViewport) => { viewport.current = next; }, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  // Decoupled from selectedId on purpose — the inspector used to pop open
  // the instant any card was selected (even mid-drag), landing somewhere
  // unrelated to what was clicked. It now opens only from a card's own
  // explicit "style" button, anchored to that button's screen position.
  const [inspectorAnchor, setInspectorAnchor] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  // "Moved X into Y" with Undo, after dropping a card onto a folder or character.
  const [dropNotice, setDropNotice] = useState<{ text: string; undo: () => void } | null>(null);
  useEffect(() => {
    if (!dropNotice) return;
    const t = setTimeout(() => setDropNotice(null), 6000);
    return () => clearTimeout(t);
  }, [dropNotice]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [snap, setSnap] = useState(true);

  const [access, setAccess] = useState<{ isOwner: boolean; role: StoryRole } | null>(null);
  const [username, setUsername] = useState("");
  const [lockedNodes, setLockedNodes] = useState<Record<string, LockedNode>>({});
  const [kicked, setKicked] = useState(false);

  useEffect(() => {
    store.loadStory(storyId).then(() => {
      // Legacy nodes carrying a base64 image instead of a storage path blow
      // past the Realtime broadcast cap on every unrelated edit — found on
      // a real board with manga-panel moodboard images. Self-heals quietly,
      // once, in the background.
      const canvases = useCanvasStore.getState().canvases;
      migrateLegacyImages(canvases, (canvasType, nodeId, field, path) => {
        store.updateNode(canvasType, nodeId, { [field]: path });
      });
    });
    getStoryAccess(storyId).then(setAccess);
    createClient()
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single()
      .then(({ data }) => setUsername(data?.username ?? "Someone"));

    const prefs = localStorage.getItem("bibliarch-notes:prefs");
    if (prefs) {
      try {
        const p = JSON.parse(prefs);
        if (p.gridSize) setGridSize(p.gridSize);
        if (typeof p.snap === "boolean") setSnap(p.snap);
        if (typeof p.sidebarCollapsed === "boolean") setSidebarCollapsed(p.sidebarCollapsed);
      } catch {
        /* ignore malformed local prefs */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  useEffect(() => {
    localStorage.setItem("bibliarch-notes:prefs", JSON.stringify({ gridSize, snap, sidebarCollapsed }));
  }, [gridSize, snap, sidebarCollapsed]);

  // Flush any pending save when leaving the page/tab — the live app's own
  // bug history has a navigation-vs-autosave data-loss entry; don't repeat it.
  useEffect(() => {
    function onBeforeUnload() {
      store.flushAll();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      store.flushAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCanvasType = crumbs[crumbs.length - 1]!.canvasType;
  const currentCanvas = store.canvases[currentCanvasType];
  // Cheap scan over a handful of boards' worth of nodes — not worth fighting
  // exhaustive-deps over a memo whose only input is the store itself.
  const allCharacters = store.getAllCharacters();
  const saveStatus = store.saveStatus[currentCanvasType] ?? "idle";
  const readOnly = access?.role === "viewer";
  const isOwner = access?.isOwner ?? false;

  // The story's palette lives on the main canvas row, shared with every
  // collaborator. Applied as CSS custom properties — see lib/color-palette.ts.
  const rawPalette = store.canvases["main"]?.palette;
  const palette = useMemo(() => normalizePalette(rawPalette), [rawPalette]);
  const defaultPalette = palette.id === "default" && JSON.stringify(palette.colors) === JSON.stringify(DEFAULT_PALETTE.colors);
  useEffect(() => {
    applyPaletteToDOM(palette);
    // Normalization is display-only. Viewing or changing Appearance must
    // never rewrite a collaborator's legacy or custom palette.
  }, [palette]);

  // ── live collaboration ────────────────────────────────────────────────
  const currentCanvasTypeRef = useRef(currentCanvasType);
  currentCanvasTypeRef.current = currentCanvasType;

  const { broadcastChange, broadcastNodeLock, broadcastNodeUnlock, connectionStatus } = useRealtimeCanvas(
    storyId,
    currentCanvasType,
    (data) => store.applyRemoteCanvas(currentCanvasTypeRef.current, data.nodes, data.connections),
    (lock) => setLockedNodes((prev) => ({ ...prev, [lock.nodeId]: lock })),
    ({ nodeId }) =>
      setLockedNodes((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      }),
    // Fires on every successful subscribe, not just a genuine reconnect
    // after a drop — including the very first connect right after a local
    // add. A bare loadStory() here would replace the whole in-memory store
    // from the database before that add's debounced save had landed,
    // silently deleting it (found by actually driving the app: a just-added
    // card vanished a moment later). Flushing first means the reload can
    // never observe a state older than what's already on screen.
    async () => {
      await store.flushAll();
      store.loadStory(storyId);
    }
  );

  useStoryCoordination(
    storyId,
    () => store.flushAll(),
    () => getStoryAccess(storyId).then(setAccess),
    () => setKicked(true),
    undefined
  );

  const { presenceState } = usePresence(storyId, currentCanvasType, username);

  function broadcastCurrent(canvasType: string) {
    const live = useCanvasStore.getState().canvases[canvasType];
    if (live) broadcastChange(live.nodes, live.connections);
  }

  function findOwningCanvasType(nodeId: string): string | undefined {
    return Object.values(store.canvases).find((c) => c.nodes.some((n) => n.id === nodeId))?.canvas_type;
  }

  const actions: BoardActions = {
    moveNode(id, x, y) {
      if (readOnly) return;
      const ct = findOwningCanvasType(id);
      if (ct) {
        store.updateNode(ct, id, { x, y });
        broadcastCurrent(ct);
      }
    },
    resizeNode(id, w, h) {
      if (readOnly) return;
      const ct = findOwningCanvasType(id);
      if (ct) {
        store.updateNode(ct, id, { width: w, height: h });
        broadcastCurrent(ct);
      }
    },
    editNode(id, patch) {
      if (readOnly) return;
      const ct = findOwningCanvasType(id);
      if (ct) {
        store.updateNode(ct, id, patch);
        broadcastCurrent(ct);
      }
    },
    deleteNode(id) {
      if (readOnly) return;
      const ct = findOwningCanvasType(id);
      if (ct) {
        store.deleteNode(ct, id);
        broadcastCurrent(ct);
      }
      setSelectedId((s) => (s === id ? null : s));
      setInspectorAnchor((a) => (a?.nodeId === id ? null : a));
    },
    openNode(node: StoryNode) {
      if (node.type !== "folder" && node.type !== "character" && node.type !== "location" && !(node.type === "event" && node.linkedCanvasId)) return;
      // Legacy Storycanvas uses stable type-canvas-node IDs without links.
      const canvasType = node.linkedCanvasId || `${node.type}-canvas-${node.id}`;
      store.ensureCanvas(canvasType);
      setCrumbs((cr) => [...cr, { canvasType, label: node.text || node.title || "Untitled" }]);
      setSelectedId(null);
      setSelectedConnId(null);
      setInspectorAnchor(null);
    },
    addConnection(from, to, type: ConnectionType) {
      if (readOnly) return;
      const conn: StoryConnection = { id: `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, from, to, type };
      store.addConnection(currentCanvasType, conn);
      broadcastCurrent(currentCanvasType);
    },
    deleteConnection(id) {
      if (readOnly) return;
      store.deleteConnection(currentCanvasType, id);
      broadcastCurrent(currentCanvasType);
      setSelectedConnId((s) => (s === id ? null : s));
    },
    addMemberToList(listId, type) {
      if (readOnly) return;
      const child = newNode(type, { parentId: listId });
      store.addNode(currentCanvasType, child);
      store.updateNode(currentCanvasType, listId, {
        childIds: [...(currentCanvas?.nodes.find((n) => n.id === listId)?.childIds ?? []), child.id],
      });
      broadcastCurrent(currentCanvasType);
    },
    addExistingCharacterToList() {
      // storycanvas has no separate character roster — a "character" only
      // exists as a node, so this is intentionally unused here. Kept on the
      // interface for BoardActions parity; NodeCard's list "+" only offers
      // "new card" choices in this app.
    },
    removeFromList(childId) {
      if (readOnly) return;
      const ct = findOwningCanvasType(childId);
      if (!ct) return;
      const canvas = store.canvases[ct]!;
      store.updateNode(ct, childId, { parentId: "" });
      const parent = canvas.nodes.find((n) => n.childIds?.includes(childId));
      if (parent) store.updateNode(ct, parent.id, { childIds: parent.childIds!.filter((id) => id !== childId) });
      broadcastCurrent(ct);
    },
    moveIntoList(listId, nodeId) {
      if (readOnly) return;
      const ct = findOwningCanvasType(nodeId);
      if (!ct) return;
      const list = store.canvases[ct]!.nodes.find((n) => n.id === listId);
      if (!list || list.childIds?.includes(nodeId)) return;
      store.updateNode(ct, nodeId, { parentId: listId });
      store.updateNode(ct, listId, { childIds: [...(list.childIds ?? []), nodeId] });
      broadcastCurrent(ct);
      setSelectedId(null);
    },
    moveIntoBoard(targetId, nodeId) {
      if (readOnly) return;
      const ct = findOwningCanvasType(nodeId);
      if (!ct) return;
      const canvas = store.canvases[ct]!;
      const target = canvas.nodes.find((n) => n.id === targetId);
      const node = canvas.nodes.find((n) => n.id === nodeId);
      if (!target || !node) return;
      // Same board key the Open button uses, so the card shows up where the user will look.
      const boardKey = target.linkedCanvasId || `${target.type}-canvas-${target.id}`;
      const board = store.ensureCanvas(boardKey);
      const below = board.nodes.filter((n) => !n.parentId).reduce((m, n) => Math.max(m, n.y + n.height), 40);
      // A list travels with its members.
      const members = (node.childIds ?? []).map((id) => canvas.nodes.find((n) => n.id === id)).filter(Boolean) as StoryNode[];
      store.addNode(boardKey, { ...node, x: 80, y: below + 40 });
      members.forEach((m) => store.addNode(boardKey, m));
      members.forEach((m) => store.deleteNode(ct, m.id));
      store.deleteNode(ct, nodeId);
      broadcastCurrent(ct);
      setSelectedId(null);
      const moved = { ...node, x: 80, y: below + 40 };
      setDropNotice({
        text: `Moved “${node.text || node.title || "card"}” into ${target.text || target.title || "that card"}`,
        undo: () => {
          store.deleteNode(boardKey, moved.id);
          members.forEach((m) => store.deleteNode(boardKey, m.id));
          store.addNode(ct, node);
          members.forEach((m) => store.addNode(ct, m));
          broadcastCurrent(ct);
        },
      });
    },
    async uploadNodeImage(nodeId, file) {
      if (readOnly) return;
      const path = await uploadNodeImage(file, nodeId);
      if (path) actions.editNode(nodeId, { imageUrl: path });
    },
    lockNode(nodeId, field) {
      if (readOnly) return;
      broadcastNodeLock(nodeId, field, username);
    },
    unlockNode(nodeId) {
      broadcastNodeUnlock(nodeId);
    },
  };

  // Insert in the visible camera area, not below distant/offscreen content.
  function insertionPosition(node: StoryNode) {
    const vp = viewport.current;
    const left = Math.max(0, vp.x + 16);
    const top = Math.max(0, vp.y + 16);
    const right = Math.max(left, vp.x + vp.width - node.width - 16);
    const bottom = Math.max(top, vp.y + vp.height - node.height - 16);
    const center = {x: (left + right) / 2, y: (top + bottom) / 2};
    const visible = (currentCanvas?.nodes ?? []).filter(n => !n.parentId && n.x < vp.x + vp.width && n.y < vp.y + vp.height && n.x + n.width > vp.x && n.y + n.height > vp.y);
    const free = (x: number, y: number) => !visible.some(n => x < n.x + n.width + 12 && x + node.width + 12 > n.x && y < n.y + n.height + 12 && y + node.height + 12 > n.y);
    if (free(center.x, center.y)) return center;
    for (let y = top; y <= bottom; y += 32) {
      for (let x = left; x <= right; x += 32) if (free(x, y)) return {x, y};
    }
    // A packed viewport may overlap, but never silently add an invisible card.
    const offset = (visible.length % 5) * 16;
    return {x: Math.min(right, center.x + offset), y: Math.min(bottom, center.y + offset)};
  }
  function addNode(type: NodeType) {
    if (!currentCanvas || readOnly) return;
    const node = newNode(type);
    Object.assign(node, insertionPosition(node));
    if (type === "line") {
      // A 200px arrow across the middle of the view; drag its three handles to bend and aim it.
      const vp = viewport.current;
      const cx = Math.max(110, Math.round(vp.x + vp.width / 2)), cy = Math.max(10, Math.round(vp.y + vp.height / 2));
      Object.assign(node, { x: cx, y: cy, linePoints: { start: { x: cx - 100, y: cy }, middle: { x: cx, y: cy }, end: { x: cx + 100, y: cy } }, lineStyle: { color: "#000000", width: 2 } });
    }
    setConnectMode(false);
    setInspectorAnchor(null);
    store.addNode(currentCanvasType, node);
    broadcastCurrent(currentCanvasType);
    setSelectedId(node.id);
  }

  function createTypeInstance(template: CustomTemplate) {
    if (readOnly || !currentCanvas) return;
    const instance = instantiateTemplate({...template, interiors: template.interiors ?? snapshotInteriors(template.nodes, store.canvases)});
    for (const [key, board] of Object.entries(instance.interiors)) {
      store.ensureCanvas(key);
      board.nodes.forEach(n => store.addNode(key, n));
      board.connections.forEach(c => store.addConnection(key, c));
    }
    const node = newNode(template.displayType, {text:template.name,content:template.bio||'',title:template.name,summary:template.bio||'',profileImageUrl:template.profileImageUrl,locationIcon:template.customIcon,linkedCanvasId:instance.canvasType,customTemplateId:template.id});
    Object.assign(node, insertionPosition(node));
    setConnectMode(false);
    setInspectorAnchor(null);
    store.addNode(currentCanvasType,node);
    broadcastCurrent(currentCanvasType);
    setSelectedId(node.id);
    setTypesOpen(false);
  }

  async function handleExport() {
    const text = await exportStoryAsText(storyId, storyTitle);
    downloadText(`${storyTitle.replace(/[^\w\- ]/g, "")}.txt`, text);
  }

  function handleSetPalette(next: ColorPalette) {
    store.setPalette(next);
    broadcastCurrent("main");
  }

  function goToCrumb(index: number) {
    setCrumbs((cr) => cr.slice(0, index + 1));
    setSelectedId(null);
    setSelectedConnId(null);
    setInspectorAnchor(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) actions.deleteNode(selectedId);
        else if (selectedConnId) actions.deleteConnection(selectedConnId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedConnId, currentCanvasType, readOnly]);

  if (kicked) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-parchment-50 text-center">
        <p className="font-display text-[16px] font-semibold text-ink-900">Your access to this project ended</p>
        <button onClick={() => router.push("/dashboard")} className="mt-2 text-[13px] text-bibliarch-blue">
          Back to your stories
        </button>
      </div>
    );
  }

  if (store.loading || !currentCanvas) {
    return <div className="flex h-screen items-center justify-center text-ink-500">Opening the board…</div>;
  }
  if (store.loadError) {
    return <div className="flex h-screen items-center justify-center text-bibliarch-rose">{store.loadError}</div>;
  }

  const inspectorNode = inspectorAnchor ? currentCanvas.nodes.find((n) => n.id === inspectorAnchor.nodeId) : undefined;


  return (
    <div className="notes-board-shell flex h-screen bg-parchment-50" data-default-palette={defaultPalette}>
      <Sidebar
        onManageTypes={() => setTypesOpen(true)}
        onAddNode={addNode}
        connectMode={connectMode}
        onToggleConnectMode={() => setConnectMode((v) => !v)}
        onBackToDashboard={() => router.push("/dashboard")}
        readOnly={readOnly}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Toolbar
          crumbs={crumbs}
          onCrumb={goToCrumb}
          readOnly={readOnly}
          onOpenShare={() => setShareOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenFeedback={() => setFeedbackOpen(true)}
          onExport={handleExport}
          onOpenSettings={() => setSettingsOpen(true)}
          saveStatus={saveStatus}
          connectionStatus={connectionStatus}
          presence={Object.values(presenceState)}
        />
        <div className="editor-workspace relative min-h-0 flex-1">
          <div className="editor-canvas">
          <CanvasView
            key={currentCanvasType}
            canvas={currentCanvas}
            onViewportChange={onViewportChange}
            allCharacters={allCharacters}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (!id) setInspectorAnchor(null);
            }}
            selectedConnId={selectedConnId}
            onSelectConnection={setSelectedConnId}
            actions={actions}
            gridSize={gridSize}
            snap={snap}
            readOnly={readOnly}
            lockedNodes={lockedNodes}
            connectMode={connectMode}
            onExitConnectMode={() => setConnectMode(false)}
            onOpenInspector={(nodeId, anchor) => setInspectorAnchor({ nodeId, ...anchor })}
          />
          </div>
          {dropNotice && (
            <div role="status" className="pop-in absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ink-900 px-4 py-2 text-[12.5px] text-white shadow-card">
              {dropNotice.text}
              <button onClick={() => { dropNotice.undo(); setDropNotice(null); }} className="rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-semibold">Undo</button>
            </div>
          )}
          {inspectorNode && !readOnly && (
            <NodeInspector
              node={inspectorNode}
              anchor={inspectorAnchor!}
              onChange={(patch) => actions.editNode(inspectorNode.id, patch)}
              onClose={() => setInspectorAnchor(null)}
            />
          )}
        </div>
      </div>
      {settingsOpen && <SettingsPopup gridSize={gridSize} setGridSize={setGridSize} snap={snap} setSnap={setSnap} onClose={() => setSettingsOpen(false)} />}
      {typesOpen && !readOnly && <CustomTypesDialog canvas={currentCanvas} canvases={store.canvases} onCreate={createTypeInstance} onClose={() => setTypesOpen(false)} />}
      {paletteOpen && <PaletteEditor palette={palette} onChange={handleSetPalette} onClose={() => setPaletteOpen(false)} />}
      {shareOpen && (
        <ShareDialog
          storyId={storyId}
          storyTitle={storyTitle}
          isOwner={isOwner}
          onClose={() => setShareOpen(false)}
          onLeave={() => router.push("/dashboard")}
        />
      )}
      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  );
}
