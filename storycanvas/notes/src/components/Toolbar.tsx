"use client";
import WorkspaceLinks from "./WorkspaceLinks";
import ThemeToggle from "./ThemeToggle";
import ExportMenu from "./ExportMenu";

import { ChevronRight, Eye, Settings, Palette, UserPlus, MessageSquare, Undo2, Redo2, ArchiveRestore, History, CircleHelp } from "lucide-react";
import type { SaveStatus } from "@/lib/store";
import type { ConnectionStatus, PresenceState } from "@/lib/realtime";

// Share/palette/export/feedback/settings, presence, and save status live
// here now, top-right — utility chrome that belongs with the rest of the
// top bar, not buried at the bottom of the (now narrow, icon-only) sidebar.
export default function Toolbar({
  crumbs,
  onCrumb,
  readOnly = false,
  onOpenShare,
  onOpenPalette,
  onOpenFeedback,
  onExport,
  onExportPicture,
  onOpenSettings,
  saveStatus,
  connectionStatus,
  presence = [],
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onOpenTrash,
  onOpenHistory,
  onOpenTutorial,
}: {
  crumbs: { canvasType: string; label: string }[];
  onCrumb: (index: number) => void;
  readOnly?: boolean;
  onOpenShare: () => void;
  onOpenPalette: () => void;
  onOpenFeedback: () => void;
  onExport: () => void;
  /** Saves this board as a PNG; resolves to a short message for the user, or null. */
  onExportPicture: () => Promise<string | null>;
  onOpenSettings: () => void;
  saveStatus: SaveStatus;
  connectionStatus?: ConnectionStatus;
  presence?: PresenceState[];
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onOpenTrash?: () => void;
  onOpenHistory?: () => void;
  /** Replays the guided tour (TutorialTour). */
  onOpenTutorial?: () => void;
}) {
  const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = mac ? "⌘" : "Ctrl+";
  return (
    <div className="board-toolbar flex flex-wrap items-center gap-3 border-b border-ink-900/8 bg-parchment-50/95 px-4 py-2 backdrop-blur">
      <WorkspaceLinks guardSaves={!readOnly} />
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto font-mono text-[12px] text-ink-500">
        {crumbs.map((c, i) => (
          <span key={c.canvasType} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-ink-500/50" />}
            <button onClick={() => onCrumb(i)} className={i === crumbs.length - 1 ? "font-semibold text-ink-900" : "hover:text-ink-900"}>
              {c.label}
            </button>
          </span>
        ))}
        {readOnly && (
          <span className="ml-1 flex flex-none items-center gap-1 rounded-full bg-ink-900/6 px-2 py-0.5 text-[10.5px] text-ink-500">
            <Eye size={10} /> viewing
          </span>
        )}
      </div>

      <div className="flex flex-none items-center gap-2.5">
        <ThemeToggle />
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-500">
          <SaveLabel status={saveStatus} />
          {connectionStatus && connectionStatus !== "connected" && (
            <span className={connectionStatus === "disconnected" ? "text-bibliarch-rose" : ""}>
              {connectionStatus === "connecting" ? "connecting…" : "offline"}
            </span>
          )}
        </div>

        {presence.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {presence.slice(0, 5).map((p) => (
                <span
                  key={p.odataUserId}
                  title={p.username}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[9.5px] font-semibold text-white ring-2 ring-parchment-50"
                  style={{ background: p.color }}
                >
                  {p.username.slice(0, 2).toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {!readOnly && onUndo && onRedo && (
          <div className="flex items-center gap-0.5" aria-label="Undo and redo" data-tour="undo">
            <IconButton icon={<Undo2 size={16} />} title={`Undo (${mod}Z)`} onClick={onUndo} disabled={!canUndo} />
            <IconButton icon={<Redo2 size={16} />} title={`Redo (${mac ? "⌘⇧Z" : "Ctrl+Y"})`} onClick={onRedo} disabled={!canRedo} />
          </div>
        )}

        <div className="flex items-center gap-1">
          {onOpenTrash && <IconButton icon={<ArchiveRestore size={16} />} title="Recently deleted" onClick={onOpenTrash} />}
          {onOpenHistory && <IconButton icon={<History size={16} />} title="Version history" onClick={onOpenHistory} />}
          <IconButton icon={<UserPlus size={16} />} title="Share" onClick={onOpenShare} tour="share" />
          <IconButton icon={<Palette size={16} />} title="Color palette" onClick={onOpenPalette} tour="palette" />
          <ExportMenu onPicture={onExportPicture} onText={onExport} />
          <IconButton icon={<MessageSquare size={16} />} title="Send feedback" onClick={onOpenFeedback} />
          <IconButton icon={<Settings size={16} />} title="Canvas settings" onClick={onOpenSettings} />
          {onOpenTutorial && <IconButton icon={<CircleHelp size={16} />} title="Tutorial" onClick={onOpenTutorial} tour="tutorial" />}
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon, title, onClick, disabled = false, tour }: { icon: React.ReactNode; title: string; onClick: () => void; disabled?: boolean; tour?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      data-tour={tour}
      disabled={disabled}
      className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-ink-500"
    >
      {icon}
    </button>
  );
}

function SaveLabel({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const text = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Couldn't save";
  const cls = status === "error" ? "text-bibliarch-rose" : status === "saving" ? "" : "text-bibliarch-blue";
  return <span className={cls}>{text}</span>;
}
