"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- "/" is the Bibliarch home site, outside this app's /notes basePath */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, Sparkles } from "lucide-react";
import { useCanvasStore } from "@/lib/store";
import { applyPaletteToDOM, normalizePalette } from "@/lib/color-palette";
import { boardPicture, downloadBlob, safeFileName } from "@/lib/board-image";
import type { PublicStory } from "@/lib/public-links";
import type { CanvasRow, StoryNode } from "@/lib/types";
import CanvasView, { type BoardActions } from "./CanvasView";
import ThemeToggle from "./ThemeToggle";
import ExportMenu from "./ExportMenu";

type Crumb = { canvasType: string; label: string };
const empty = (storyId: string, canvasType: string): CanvasRow => ({ id: canvasType, story_id: storyId, canvas_type: canvasType, nodes: [], connections: [], palette: null, updated_at: "" });

/**
 * A story opened from its public link: the real board, read-only, with no account.
 * Every visitor also sees who made it and a way to make their own. This page is the
 * share-to-grow loop: someone posts the link, their followers look around, some sign up.
 */
export default function PublicBoard({ story }: { story: PublicStory }) {
  const [ready, setReady] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ canvasType: "main", label: story.title }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvases = useMemo(() => Object.fromEntries(story.canvases.map((c) => [c.canvas_type, c])) as Record<string, CanvasRow>, [story]);

  // Cards that read other boards (linked characters, shared relationships) read the store, so fill it.
  useEffect(() => {
    useCanvasStore.setState({ storyId: story.id, canvases: { main: empty(story.id, "main"), ...canvases }, loading: false, loadError: null });
    setReady(true);
  }, [story.id, canvases]);

  useEffect(() => {
    applyPaletteToDOM(normalizePalette(canvases["main"]?.palette));
  }, [canvases]);

  const current = crumbs[crumbs.length - 1]!;
  const canvas = canvases[current.canvasType] ?? empty(story.id, current.canvasType);
  const allCharacters = useMemo(
    () =>
      story.canvases
        .flatMap((c) => c.nodes)
        .filter((n) => n.type === "character" && !n.refNodeId)
        .map((n) => ({ id: n.id, name: n.text || "Unnamed", profileImageUrl: n.profileImageUrl })),
    [story],
  );

  const nothing = () => {};
  const actionsRef = useRef<BoardActions | null>(null);
  if (!actionsRef.current) {
    const openNode = (node: StoryNode) => {
      if (node.type !== "folder" && node.type !== "character" && node.type !== "location" && !(node.type === "event" && node.linkedCanvasId)) return;
      const canvasType = node.linkedCanvasId || `${node.type}-canvas-${node.id}`;
      setCrumbs((cr) => [...cr, { canvasType, label: node.text || node.title || "Untitled" }]);
      setSelectedId(null);
    };
    // A viewer can only look and open things; every editing action does nothing.
    actionsRef.current = new Proxy({ openNode } as Partial<BoardActions>, {
      get: (target, key: string) => target[key as keyof BoardActions] ?? nothing,
    }) as BoardActions;
  }

  async function picture() {
    setSelectedId(null);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const title = crumbs.length > 1 ? `${story.title} · ${current.label}` : story.title;
    const blob = await boardPicture(canvas, title);
    if (!blob) return "This board is empty.";
    const name = `${safeFileName(title)}.png`;
    downloadBlob(name, blob);
    return `Saved “${name}” to your downloads.`;
  }

  if (!ready) return <div className="flex h-screen items-center justify-center text-ink-500">Opening the board…</div>;

  return (
    <div className="notes-board-shell public-board flex h-screen flex-col bg-parchment-50">
      <header className="board-toolbar flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-900/8 bg-parchment-50/95 px-4 py-2 backdrop-blur">
        <a href="/" className="public-brand" aria-label="Bibliarch home">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 5.5c3-1.3 6-1.3 9 .5 3-1.8 6-1.8 9-.5V19c-3-1.3-6-1.3-9 .5-3-1.8-6-1.8-9-.5z" />
            <path d="M12 6v13.5" />
          </svg>
          <span>Bibliarch</span>
        </a>
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto font-mono text-[12px] text-ink-500" aria-label="Where you are">
          {crumbs.map((c, i) => (
            <span key={c.canvasType} className="flex flex-none items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="text-ink-500/50" />}
              <button
                onClick={() => {
                  setCrumbs((cr) => cr.slice(0, i + 1));
                  setSelectedId(null);
                }}
                className={i === crumbs.length - 1 ? "font-semibold text-ink-900" : "hover:text-ink-900"}
              >
                {c.label}
              </button>
            </span>
          ))}
          <span className="ml-1 flex flex-none items-center gap-1 rounded-full bg-ink-900/6 px-2 py-0.5 text-[10.5px] text-ink-500">
            <Eye size={10} /> view only
          </span>
        </nav>
        <div className="flex flex-none items-center gap-2">
          <ThemeToggle />
          <ExportMenu onPicture={picture} />
          <Link href="/signup?from=shared" className="public-cta">
            <Sparkles size={14} /> Make your own, free
          </Link>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <CanvasView
          key={current.canvasType}
          canvas={canvas}
          allCharacters={allCharacters}
          selectedId={selectedId}
          onSelect={setSelectedId}
          selectedConnId={null}
          onSelectConnection={nothing}
          actions={actionsRef.current}
          gridSize={20}
          snap={false}
          readOnly
          onOpenInspector={nothing}
        />
        {canvas.nodes.length === 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-[14px] text-ink-500">Nothing on this board yet.</p>
        )}
        <p className="public-credit">
          {story.author ? (
            <>
              Made by <strong>{story.author}</strong> with{" "}
            </>
          ) : (
            "Made with "
          )}
          <a href="/">Bibliarch</a>
        </p>
      </div>
    </div>
  );
}
