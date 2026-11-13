"use client";
import WorkspaceLinks from "./WorkspaceLinks";
import ThemeToggle from "./ThemeToggle";

import { ChevronRight, Eye, Settings, Palette, UserPlus, MessageSquare, Download, CircleHelp } from "lucide-react";
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
  onOpenSettings,
  saveStatus,
  connectionStatus,
  presence = [],
  onOpenTutorial,
}: {
  crumbs: { canvasType: string; label: string }[];
  onCrumb: (index: number) => void;
  readOnly?: boolean;
  onOpenShare: () => void;
  onOpenPalette: () => void;
  onOpenFeedback: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  saveStatus: SaveStatus;
  connectionStatus?: ConnectionStatus;
  presence?: PresenceState[];
  /** Replays the guided tour (TutorialTour). */
  onOpenTutorial?: () => void;
}) {
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

        <div className="flex items-center gap-1">
          <IconButton icon={<UserPlus size={16} />} title="Share" onClick={onOpenShare} tour="share" />
          <IconButton icon={<Palette size={16} />} title="Color palette" onClick={onOpenPalette} tour="palette" />
          <IconButton icon={<Download size={16} />} title="Export" onClick={onExport} />
          <IconButton icon={<MessageSquare size={16} />} title="Send feedback" onClick={onOpenFeedback} />
          <IconButton icon={<Settings size={16} />} title="Canvas settings" onClick={onOpenSettings} />
          {onOpenTutorial && <IconButton icon={<CircleHelp size={16} />} title="Tutorial" onClick={onOpenTutorial} tour="tutorial" />}
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon, title, onClick, tour }: { icon: React.ReactNode; title: string; onClick: () => void; tour?: string }) {
  return (
    <button onClick={onClick} title={title} aria-label={title} data-tour={tour} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900">
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
