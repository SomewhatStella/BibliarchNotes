"use client";

import {
  ArrowLeft,
  ArrowRight,
  FileText,
  User,
  MapPin,
  Folder,
  List as ListIcon,
  StickyNote,
  Table2,
  Flag,
  Users,
  Image as ImageIcon,
  PanelLeftOpen,
  Spline,
} from "lucide-react";
import type { NodeType } from "@/lib/types";
import SidebarToolButton from "./SidebarToolButton";
import { LayoutTemplate } from "lucide-react";


// Every tool is its own always-visible button — the original app never
// buried these behind an "Add" dropdown, so neither does this one. "Arrow"
// isn't a node type at all: it toggles click-to-connect mode on the canvas.
const TOOLS: { type: NodeType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <FileText size={16} /> },
  { type: "character", label: "Character", icon: <User size={16} /> },
  { type: "location", label: "Location", icon: <MapPin size={16} /> },
  { type: "folder", label: "Folder", icon: <Folder size={16} /> },
  { type: "list", label: "List", icon: <ListIcon size={16} /> },
  { type: "table", label: "Table", icon: <Table2 size={16} /> },
  { type: "event", label: "Event", icon: <Flag size={16} /> },
  { type: "relationship-canvas", label: "Rel. map", icon: <Users size={16} /> },
  { type: "compact-text", label: "Sticky", icon: <StickyNote size={16} /> },
  { type: "image", label: "Image", icon: <ImageIcon size={16} /> },
  { type: "line", label: "Line", icon: <Spline size={16} /> },
];

// A slim icon rail, not a text sidebar — every button here is a 36px
// square (bg-white, border, shadow-card), the width of the rail itself
// sized to exactly fit them (w-14 = 56px, minus 2x10px padding = 36px).
// Share/palette/export/feedback/settings, presence, and save status all
// moved to the Toolbar's top-right — utility chrome that belongs with the
// rest of the top bar, not buried at the bottom of a narrow rail.
export default function Sidebar({
  onManageTypes,
  onAddNode,
  connectMode,
  onToggleConnectMode,
  onBackToDashboard,
  readOnly = false,
  collapsed,
  onToggleCollapsed,
}: {
  onManageTypes: () => void;
  onAddNode: (type: NodeType) => void;
  connectMode: boolean;
  onToggleConnectMode: () => void;
  onBackToDashboard: () => void;
  readOnly?: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  if (collapsed) {
    return (
      <div className="relative z-[100] flex w-12 flex-none flex-col items-center gap-3 border-r border-ink-900/8 bg-parchment-50/95 py-3">
        <IconButton icon={<PanelLeftOpen size={18} />} title="Show sidebar" onClick={onToggleCollapsed} />
        <div className="h-px w-6 bg-ink-900/8" />
        <IconButton icon={<ArrowLeft size={16} />} title="Back" onClick={onBackToDashboard} />
        {!readOnly && <IconButton icon={<FileText size={16} />} title="Show tools" onClick={onToggleCollapsed} />}
      </div>
    );
  }

  return (
    <div className="relative z-[100] flex w-14 flex-none flex-col items-center border-r border-ink-900/8 bg-parchment-50/95 px-2.5 py-3">
      <SquareButton icon={<ArrowLeft size={16} />} title="Back to dashboard" onClick={onBackToDashboard} />

      {/* One scrollbar for everything that can grow (tools + board list),
          not two nested ones competing for the mouse wheel depending on
          exactly where the cursor sits — that was swallowing wheel input
          that was meant to pan the canvas. */}
      <div className="scrollbar-thin mt-3 flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overflow-x-hidden">
        {!readOnly && (
          <>
            {TOOLS.map((t) => (
              <SquareButton key={t.type} icon={t.icon} title={t.label} onClick={() => onAddNode(t.type)} />
            ))}
            <SquareButton
              icon={<ArrowRight size={16} />}
              title={connectMode ? "Connecting…" : "Arrow — draw a connection"}
              onClick={onToggleConnectMode}
              active={connectMode}
            />
          </>
        )}

        {!readOnly && <SidebarToolButton icon={<LayoutTemplate size={16} />} title="Custom folder types" color="#8056a3" onClick={onManageTypes} />}
      </div>
    </div>
  );
}

const SquareButton = SidebarToolButton;

function IconButton(props: { icon: React.ReactNode; title: string; onClick: () => void }) {
  return <SidebarToolButton {...props} compact />;
}
