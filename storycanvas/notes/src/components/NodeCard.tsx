"use client";

import { useRef, useState, type MouseEvent } from "react";
import {
  FileText,
  MapPin,
  Folder,
  BookOpen,
  Archive,
  Box,
  List as ListIcon,
  Image as ImageIcon,
  StickyNote,
  Flag,
  Users,
  ChevronRight,
  X,
  Plus,
  Lock,
  Upload,
  CornerRightDown,
  SlidersHorizontal,
} from "lucide-react";
import type { NodeType, StoryNode } from "@/lib/types";
import type { BoardActions, LockedNodeInfo } from "./CanvasView";
import RelationshipEditor from "./RelationshipEditor";
import TypeIcon from "./TypeIcon";
import CustomTypeIcon from "./CustomTypeIcon";
import { getImageUrl } from "@/lib/storage";

const FOLDER_ICONS = { folder: Folder, book: BookOpen, archive: Archive, box: Box } as const;

// A floor under rendered size for the types that carry real body content —
// found on Stella's own real board, where cards with a small stored height
// (some pre-existing data, some just dragged small) read as cramped
// fragments stacked edge to edge rather than normal-looking cards. Only
// clamps the on-screen size; the stored node.width/height are untouched.
const MIN_RENDER_SIZE: Partial<Record<NodeType, { w: number; h: number }>> = {
  text: { w: 240, h: 120 },
  event: { w: 240, h: 120 },
  // A relationship map needs real room — at the old 600×400 default it
  // could still read as a handful of overlapping "blobs" rather than a
  // legible mini canvas once there were more than a few characters.
  "relationship-canvas": { w: 480, h: 360 },
};

const TYPE_ADD_CHOICES: { type: NodeType; label: string }[] = [
  { type: "character", label: "Character" },
  { type: "location", label: "Location" },
  { type: "text", label: "Text card" },
  { type: "folder", label: "Folder" },
  { type: "list", label: "List" },
  { type: "compact-text", label: "Sticky note" },
];

export default function NodeCard({
  node,
  allNodes,
  allCharacters,
  selected,
  actions,
  onMouseDownMove,
  onMouseDownResize,
  onSelect,
  onStartConnect,
  onOpenInspector,
  readOnly = false,
  lockedBy,
}: {
  node: StoryNode;
  allNodes: StoryNode[];
  allCharacters: { id: string; name: string; profileImageUrl?: string }[];
  selected: boolean;
  actions: BoardActions;
  onMouseDownMove: (e: MouseEvent) => void;
  onMouseDownResize: (e: MouseEvent) => void;
  onSelect: () => void;
  onStartConnect: (e: MouseEvent) => void;
  onOpenInspector: (anchor: { x: number; y: number }) => void;
  readOnly?: boolean;
  lockedBy?: LockedNodeInfo;
}) {
  const [editing, setEditing] = useState<"text" | "content" | "title" | "summary" | "durationText" | null>(null);
  const [draft, setDraft] = useState("");

  // Two-tier coloring: a node's own "sub color" (node.color, set from the
  // inspector) wins when set; otherwise every card falls back to the
  // story's "main color" (the --color-node-default custom property the
  // palette system writes — see lib/color-palette.ts).
  const accent = node.color || "var(--color-node-default)";
  const type = node.type ?? "text";
  const isOpenable = type === "folder" || type === "location" || type === "character" || (type === "event" && !!node.linkedCanvasId);
  const pinnedLocked = node.settings?.locked;
  // Three distinct reasons editing can't start here: this card is pinned
  // locked by its owner, someone else is editing it right now (field lock
  // broadcast), or this viewer has read-only access to the whole story.
  const editBlocked = pinnedLocked || readOnly || !!lockedBy;

  function startEdit(field: typeof editing) {
    if (editBlocked || !field) return;
    setDraft((node[field as keyof StoryNode] as string) ?? "");
    setEditing(field);
    actions.lockNode(node.id, field);
  }
  function commitEdit() {
    if (editing) actions.editNode(node.id, { [editing]: draft } as Partial<StoryNode>);
    setEditing(null);
    actions.unlockNode(node.id);
  }

  const edit = { editing, draft, setDraft, startEdit, commitEdit };
  const minSize = MIN_RENDER_SIZE[type];
  const renderWidth = minSize ? Math.max(node.width, minSize.w) : node.width;
  const renderHeight = minSize ? Math.max(node.height, minSize.h) : node.height;

  return (
    <div
      data-node-id={node.id}
      onMouseDown={(e) => {
        if (editing || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('input, textarea, select, button, [contenteditable="true"]')) return;
        // A move gesture must not also start the browser's native text selection.
        e.preventDefault();
        onMouseDownMove(e);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`${type === "table" ? "table-node" : "rounded-2xl emboss"} absolute flex flex-col transition-shadow ${
        selected ? (type === "table" ? "outline outline-2 outline-gold-500" : "shadow-card-hover ring-2 ring-gold-500") : ""
      }`}
      style={{
        left: node.x,
        top: node.y,
        width: renderWidth,
        height: renderHeight,
        zIndex: selected ? 50 : node.zIndex ?? 1,
        cursor: editBlocked ? "default" : "var(--cursor-grab)",
      }}
    >
      {/* Clips body content (image corners, long text) to the card's rounded
          shape — kept separate from the outer div so badges/handles that
          deliberately sit partway outside the card (the lock badge, the
          connector dot) aren't clipped along with it. Found by actually
          looking at a locked-node screenshot: the badge was cut in half. */}
      <div className={`flex h-full min-h-0 flex-1 flex-col ${type === "table" ? "" : "overflow-hidden rounded-2xl"}`}>
        {/* Image and table nodes ARE their content — no accent bar, no
            title chrome, full bleed. Everything else keeps the header
            strip (a table's own header row already carries the color). */}
        {type !== "image" && type !== "table" && <div className="h-[3px] w-full flex-none" style={{ background: accent }} />}

        {selected && !readOnly && (
          <div className="absolute right-0 bottom-full mb-1 z-10 flex items-center gap-1" data-node-controls>
            {pinnedLocked && <Lock size={11} className="text-ink-500" />}
            {/* The explicit, deliberate trigger for the style panel — it
                used to open the instant ANY card was selected (including
                mid-drag), popping up far from wherever you'd clicked.
                Found by actually using it: it felt random and unwanted. */}
            <button
              title="Style this card"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                const r = e.currentTarget.getBoundingClientRect();
                onOpenInspector({ x: r.left, y: r.bottom + 6 });
              }}
              className="rounded-full bg-editor-raised/80 p-1 text-ink-500 hover:bg-bibliarch-blue/15 hover:text-bibliarch-blue"
            >
              <SlidersHorizontal size={12} />
            </button>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                actions.deleteNode(node.id);
              }}
              className="rounded-full bg-editor-raised/80 p-1 text-ink-500 hover:bg-bibliarch-rose/15 hover:text-bibliarch-rose"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Navigation shares the body row; never add height or rewrite saved sizes for it. */}
        <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {type === "character" || type === "location" ? (
            <NameRow node={node} typeColor={accent} {...edit} />
          ) : type === "folder" ? (
            <FolderBody node={node} {...edit} />
          ) : type === "list" ? (
            <ListBody node={node} allNodes={allNodes} actions={actions} {...edit} />
          ) : type === "table" ? (
            <TableBody node={node} actions={actions} showControls={selected && !editBlocked} />
          ) : type === "relationship-canvas" ? (
            <>
              <TitleRow icon={<Users size={13} />} node={node} {...edit} />
              <RelationshipEditor node={node} allCharacters={allCharacters} onChange={(patch) => actions.editNode(node.id, patch)} />
            </>
          ) : type === "image" ? (
            <ImageBody node={node} actions={actions} />
          ) : type === "compact-text" ? (
            <StickyBody node={node} {...edit} />
          ) : type === "event" ? (
            <EventBody node={node} {...edit} />
          ) : (
            <TextBody node={node} {...edit} />
          )}
        </div>

        {isOpenable && (
          <button
            aria-label={`Open ${node.text || node.title || "Untitled"}`}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              actions.openNode(node);
            }}
            className="mr-2.5 flex flex-none self-center items-center justify-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-bibliarch-blue hover:bg-ink-900/5"
          >
            Open <ChevronRight size={16} />
          </button>
        )}
        </div>
      </div>

      {lockedBy && (
        <div className="pop-in absolute -top-2.5 left-2 z-10 flex items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-[10px] text-white shadow-card">
          <Lock size={9} />
          {lockedBy.username} is editing
        </div>
      )}

      {selected && type !== "line" && !readOnly && (
        <>
          <div
            onMouseDown={onStartConnect}
            title="Drag this gold dot onto another card to link them"
            className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-gold-500"
          />
          <div title="Resize card" onMouseDown={onMouseDownResize} className="absolute -bottom-3 -right-3 h-3 w-3 cursor-nwse-resize rounded-sm border-b-2 border-r-2 border-ink-500/40" />
        </>
      )}
    </div>
  );
}

type EditProps = {
  editing: "text" | "content" | "title" | "summary" | "durationText" | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (f: "text" | "content" | "title" | "summary" | "durationText") => void;
  commitEdit: () => void;
};

function EditableField({
  node,
  field,
  editing,
  draft,
  setDraft,
  startEdit,
  commitEdit,
  as = "input",
  className = "",
  placeholder = "",
}: EditProps & { node: StoryNode; field: "text" | "content" | "title" | "summary" | "durationText"; as?: "input" | "textarea"; className?: string; placeholder?: string }) {
  const value = (node[field] as string) ?? "";
  if (editing === field) {
    return as === "textarea" ? (
      <textarea
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full resize-none border-none bg-transparent text-[12.5px] leading-snug text-ink-700 outline-none ${className}`}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitEdit}
        onKeyDown={(e) => e.key === "Enter" && commitEdit()}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full border-none bg-transparent outline-none ${className}`}
      />
    );
  }
  const Tag = as === "textarea" ? "p" : "span";
  return (
    <Tag
      onDoubleClick={(e) => {
        e.stopPropagation();
        startEdit(field);
      }}
      className={`${className} ${value ? "" : "text-ink-500/50"}`}
    >
      {value || placeholder}
    </Tag>
  );
}

function TitleRow({ icon, node, ...edit }: { icon: React.ReactNode; node: StoryNode } & EditProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-2.5">
      <span className="text-ink-500/70">{icon}</span>
      <EditableField node={node} field="text" {...edit} className="truncate font-display text-[13.5px] font-semibold text-ink-900" placeholder="Untitled" />
    </div>
  );
}

function TextBody({ node, ...edit }: { node: StoryNode } & EditProps) {
  return (
    <>
      <TitleRow icon={<FileText size={13} />} node={node} {...edit} />
      <EditableField node={node} field="content" as="textarea" {...edit} className="flex-1 px-3 pb-2.5" placeholder="Double-click to write…" />
    </>
  );
}

function FolderBody({ node, ...edit }: { node: StoryNode } & EditProps) {
  const Icon = FOLDER_ICONS[(node.settings?.icon ?? "folder") as keyof typeof FOLDER_ICONS] ?? Folder;
  return (
    <>
      <TitleRow icon={node.customTemplateId ? <CustomTypeIcon displayType="folder" size={15} /> : <Icon size={13} />} node={node} {...edit} />
      <EditableField node={node} field="content" as="textarea" {...edit} className="flex-1 px-3 pb-2.5" placeholder="What belongs in here…" />
    </>
  );
}

function StickyBody({ node, ...edit }: { node: StoryNode } & EditProps) {
  return (
    <div className="flex h-full items-center gap-1.5 px-3">
      <StickyNote size={12} className="flex-none text-ink-500/60" />
      <EditableField node={node} field="text" {...edit} className="truncate text-[12.5px] font-semibold text-ink-900" placeholder="Untitled" />
    </div>
  );
}

function EventBody({ node, ...edit }: { node: StoryNode } & EditProps) {
  return (
    <>
      <div className="flex items-center gap-1.5 px-3 pt-2.5">
        <Flag size={13} className="text-ink-500/70" />
        <EditableField node={node} field="title" {...edit} className="truncate font-display text-[13.5px] font-semibold text-ink-900" placeholder="Untitled event" />
      </div>
      {node.durationText !== undefined && (
        <EditableField node={node} field="durationText" {...edit} className="mx-3 mt-0.5 font-mono text-[10.5px] text-ink-500" placeholder="when…" />
      )}
      <EditableField node={node} field="summary" as="textarea" {...edit} className="flex-1 px-3 pb-2.5 text-[12.5px] leading-snug text-ink-700" placeholder="What happens…" />
    </>
  );
}

function NameRow({ node, typeColor, ...edit }: { node: StoryNode; typeColor: string } & EditProps) {
  const shape = node.settings?.picture_shape === "square" ? "rounded-md" : node.settings?.picture_shape === "rounded" ? "rounded-xl" : "rounded-full";
  const portrait = getImageUrl(node.profileImageUrl);
  return (
    <div className="flex h-full items-center gap-2.5 px-2.5">
      <div className={`flex h-10 w-10 flex-none items-center justify-center ${shape} text-[11px] font-semibold text-white`} style={{ background: typeColor }}>
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait} alt="" className={`h-full w-full object-cover ${shape}`} />
        ) : node.type === "location" ? (
          node.locationIcon || <MapPin size={16} />
        ) : (
          (node.text || "?").slice(0, 2).toUpperCase()
        )}
      </div>
      <EditableField node={node} field="text" {...edit} className="truncate font-display text-[13.5px] font-semibold text-ink-900" placeholder="Untitled" />
    </div>
  );
}

// The image IS the node — no header, no padding, no background box. Fills
// the card exactly, edge to edge, clipped to its rounded corners by the
// parent wrapper. A caption, if there is one, sits as a small legible
// overlay at the bottom rather than a separate chrome row.
function ImageBody({ node, actions }: { node: StoryNode; actions: BoardActions }) {
  const url = getImageUrl(node.imageUrl);
  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) actions.uploadNodeImage(node.id, file);
  }
  // The image IS the node — no caption, no fade, nothing drawn over it.
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-full w-full" style={{ objectFit: node.settings?.image_fit || "cover" }} />
    );
  }
  return (
    <label onMouseDown={(e) => e.stopPropagation()} className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 bg-ink-900/4 text-ink-500">
      <ImageIcon size={18} />
      <span className="flex items-center gap-1 text-[11.5px]">
        <Upload size={12} /> Click to add an image
      </span>
      <input type="file" accept="image/*" className="hidden" onChange={onPick} />
    </label>
  );
}

// A real table: ruled cells on every side, a shaded header row tinted from
// the node's own color, zebra striping, and row/column delete affordances
// — not the bare borderless input grid this used to be.
function TableBody({ node, actions, showControls }: { node: StoryNode; actions: BoardActions; showControls: boolean }) {
  const rows = node.tableData && node.tableData.length > 0 ? node.tableData : [{ "Column A": "", "Column B": "" }];
  const columns = Object.keys(rows[0] ?? {});
  const accent = node.color || "var(--color-node-default)";

  function commit(nextRows: Record<string, string>[]) {
    actions.editNode(node.id, { tableData: nextRows });
  }
  function setCell(r: number, col: string, value: string) {
    const next = rows.map((row, i) => (i === r ? { ...row, [col]: value } : row));
    commit(next);
  }
  function addRow() {
    const blank = Object.fromEntries(columns.map((c) => [c, ""]));
    commit([...rows, blank]);
  }
  function removeRow(r: number) {
    commit(rows.filter((_, i) => i !== r));
  }
  function addColumn() {
    const nextCol = `Column ${String.fromCharCode(65 + columns.length)}`;
    commit(rows.map((row) => ({ ...row, [nextCol]: "" })));
  }
  function removeColumn(col: string) {
    if (columns.length <= 1) return;
    commit(rows.map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== col))));
  }
  function renameColumn(oldName: string, newName: string) {
    if (!newName || newName === oldName) return;
    commit(
      rows.map((row) => {
        const entries = Object.entries(row).map(([k, v]) => (k === oldName ? [newName, v] : [k, v]));
        return Object.fromEntries(entries) as Record<string, string>;
      })
    );
  }

  // The table IS the node — no title bar, no margin around it, matching
  // the image treatment. Its own header row carries the "this is a table"
  // signal already; nothing else needs to.
  return (
    <div className="relative flex h-full flex-col">
      <div className="scrollbar-thin flex-1 overflow-auto">
        <table className="h-full w-full flex-none border-collapse text-[11.5px]" style={node.columnWidths ? { tableLayout: "fixed" } : undefined}>
        {/* Saved column widths (percent, as storycanvas stored them); the last col is the row-delete control. */}
        {node.columnWidths && (
          <colgroup>
            {columns.map((c) => <col key={c} style={{ width: `${node.columnWidths![c] ?? 100 / columns.length}%` }} />)}
            <col style={{ width: 24 }} />
          </colgroup>
        )}
        {/* Template tables (e.g. a character's details) use internal names like col1/col2; storycanvas never showed those as headings. */}
        {(showControls || !columns.every((c) => /^col\d+$/.test(c))) && node.settings?.show_header_row !== false && (
        <thead className="h-7">
          <tr>
            {columns.map((col) => (
              <ColumnHeader key={col} name={col} accent={accent} onRename={(n) => renameColumn(col, n)} onRemove={() => removeColumn(col)} canRemove={columns.length > 1} />
            ))}
            <th className="w-6 border-b" style={{ borderColor: accent, background: `color-mix(in oklab, ${accent} 16%, var(--editor-card-bg, white))` }} />
          </tr>
        </thead>
        )}
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="group" style={{ background: r % 2 ? "rgba(0,0,0,0.018)" : "transparent" }}>
              {columns.map((col, c) => (
                <td
                  key={col}
                  className="px-2 py-1 text-ink-700"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", borderRight: c < columns.length - 1 ? "1px solid rgba(0,0,0,0.08)" : undefined }}
                >
                  <input
                    value={row[col] ?? ""}
                    onChange={(e) => setCell(r, col, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full bg-transparent outline-none"
                  />
                </td>
              ))}
              <td className="border-b border-l border-ink-900/8 text-center">
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => removeRow(r)}
                  className="text-ink-500/0 hover:text-bibliarch-rose group-hover:text-ink-500/60"
                >
                  <X size={11} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
      {showControls && <TableGrowHandle accent={accent} onAddRow={addRow} onAddColumn={addColumn} />}
    </div>
  );
}

// A spreadsheet-style fill handle, replacing separate "+row"/"+column"
// buttons — drag down for a row, right for a column, diagonally for both,
// one add per ~28/90px crossed.
function TableGrowHandle({ accent, onAddRow, onAddColumn }: { accent: string; onAddRow: () => void; onAddColumn: () => void }) {
  const dragRef = useRef<{ x: number; y: number; rows: number; cols: number } | null>(null);

  function onMouseDown(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { x: e.clientX, y: e.clientY, rows: 0, cols: 0 };
    function onMove(ev: globalThis.MouseEvent) {
      const d = dragRef.current;
      if (!d) return;
      const wantRows = Math.max(0, Math.floor((ev.clientY - d.y) / 28));
      const wantCols = Math.max(0, Math.floor((ev.clientX - d.x) / 90));
      while (d.rows < wantRows) {
        onAddRow();
        d.rows++;
      }
      while (d.cols < wantCols) {
        onAddColumn();
        d.cols++;
      }
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Bottom-LEFT, not bottom-right — every card already has its own
  // whole-card resize handle in that corner (NodeCard.tsx), which sits on
  // top in DOM stacking order and silently ate every drag meant for this
  // one when both lived in the same spot. Found by actually dragging it.
  return (
    <div
      onMouseDown={onMouseDown}
      title="Drag down for a row, right for a column"
      className="absolute -bottom-6 left-0 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-md text-white shadow-card"
      style={{ background: accent }}
    >
      <CornerRightDown size={12} />
    </div>
  );
}

function ColumnHeader({
  name,
  accent,
  onRename,
  onRemove,
  canRemove,
}: {
  name: string;
  accent: string;
  onRename: (n: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <th
      className="group border-b px-2 py-1 text-left font-semibold text-ink-900"
      style={{ borderColor: accent, background: `color-mix(in oklab, ${accent} 16%, var(--editor-card-bg, white))` }}
    >
      <div className="flex items-center gap-1">
        <input
          ref={ref}
          defaultValue={name}
          onBlur={(e) => onRename(e.target.value.trim())}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full min-w-0 flex-1 bg-transparent outline-none"
        />
        {canRemove && (
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onRemove}
            className="flex-none text-ink-500/0 hover:text-bibliarch-rose group-hover:text-ink-500/60"
          >
            <X size={10} />
          </button>
        )}
      </div>
    </th>
  );
}

function ListBody({
  node,
  allNodes,
  actions,
  ...edit
}: { node: StoryNode; allNodes: StoryNode[]; actions: BoardActions } & EditProps) {
  const [addingMember, setAddingMember] = useState(false);
  const children = (node.childIds ?? []).map((id) => allNodes.find((n) => n.id === id)).filter(Boolean) as StoryNode[];
  const grid = node.layoutMode === "grid" || node.layoutMode === "two-columns";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div className="flex items-center gap-1.5">
          <ListIcon size={13} className="text-ink-500/70" />
          <EditableField node={node} field="text" {...edit} className="truncate font-display text-[13.5px] font-semibold text-ink-900" placeholder="Untitled" />
        </div>
        <button
          title="Add list member"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setAddingMember(!addingMember);
          }}
          className="mr-6 flex-none rounded-full p-0.5 text-ink-500 hover:bg-ink-900/5"
        >
          <Plus size={14} />
        </button>
      </div>
      {addingMember && (
        <div onMouseDown={(e) => e.stopPropagation()} className="mx-3 mt-1 flex flex-wrap gap-1">
          {TYPE_ADD_CHOICES.map((c) => (
            <button
              key={c.type}
              onClick={() => {
                actions.addMemberToList(node.id, c.type);
                setAddingMember(false);
              }}
              className="rounded-md bg-ink-900/5 px-1.5 py-0.5 text-[10.5px] text-ink-700 hover:bg-ink-900/10"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      <div className={`scrollbar-thin mt-1.5 flex-1 overflow-auto px-2 pb-2 ${grid ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1"}`}>
        {children.map((child) => (
          <ListMemberRow key={child.id} child={child} actions={actions} />
        ))}
        {children.length === 0 && !addingMember && <p className="px-1 text-[11.5px] text-ink-500/60">Empty — + to add someone.</p>}
      </div>
    </div>
  );
}

const LIST_OPENABLE = new Set<NodeType>(["folder", "location", "character"]);

// A member reads as its own small node — the type's real icon in a colored
// badge, not a generic bullet — and openable types (folder/location/
// character) actually open on click, the same as their full-size cousins.
function ListMemberRow({ child, actions }: { child: StoryNode; actions: BoardActions }) {
  const [renaming, setRenaming] = useState(false);
  const [val, setVal] = useState(child.text);
  const portrait = getImageUrl(child.profileImageUrl);
  const accent = child.color || "var(--color-node-default)";
  const openable = LIST_OPENABLE.has(child.type ?? "text");

  return (
    <div
      className={`group flex flex-none items-center gap-2.5 rounded-xl border border-ink-900/8 bg-editor-raised px-3 py-3 shadow-card ${openable ? "cursor-pointer hover:border-ink-900/20 hover:shadow-card-hover" : ""}`}
      onClick={() => openable && actions.openNode(child)}
    >
      <div className="flex h-9 w-9 flex-none items-center justify-center overflow-hidden rounded-lg text-white" style={{ background: accent }}>
        {child.type === "character" && portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait} alt="" className="h-full w-full object-cover" />
        ) : (
          <TypeIcon type={child.type} size={18} />
        )}
      </div>
      {renaming ? (
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={() => {
            actions.editNode(child.id, { text: val });
            setRenaming(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 truncate bg-transparent text-[13.5px] outline-none"
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation();
            setRenaming(true);
          }}
          className="flex-1 truncate font-display text-[13.5px] font-semibold text-ink-900"
        >
          {child.text || "Untitled"}
        </span>
      )}
      {openable && <ChevronRight size={15} className="flex-none text-ink-500/40" />}
      <button
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          actions.removeFromList(child.id);
        }}
        className="flex-none text-ink-500/0 group-hover:text-ink-500/60 hover:!text-bibliarch-rose"
      >
        <X size={12} />
      </button>
    </div>
  );
}
