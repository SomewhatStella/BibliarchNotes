"use client";

import { Folder, LayoutTemplate, MapPin, Type, User } from "lucide-react";
import type { NodeType } from "@/lib/types";

/**
 * Shown on a board with no cards yet. A third of new writers never got past five cards;
 * a blank grid with a tool rail gave them nowhere obvious to start. One click here puts
 * the first card down (or fills the main board with the story planner).
 */
export default function EmptyBoardHint({
  onAdd,
  onPlanner,
}: {
  onAdd: (type: NodeType) => void;
  /** Only on a story's main board. */
  onPlanner?: () => void;
}) {
  const starters: { type: NodeType; label: string; icon: React.ReactNode }[] = [
    { type: "character", label: "A character", icon: <User size={16} /> },
    { type: "location", label: "A place", icon: <MapPin size={16} /> },
    { type: "text", label: "A note", icon: <Type size={16} /> },
    { type: "folder", label: "A folder", icon: <Folder size={16} /> },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
      <div className="empty-board pop-in emboss pointer-events-auto w-full max-w-[420px] rounded-2xl p-5 text-center">
        <p className="font-display text-[18px] font-semibold text-ink-900">This board is empty</p>
        <p className="mt-1 text-[13px] text-ink-500">What do you want to start with?</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {starters.map((s) => (
            <button key={s.type} type="button" onClick={() => onAdd(s.type)} className="empty-board-choice">
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
        {onPlanner && (
          <button type="button" onClick={onPlanner} className="empty-board-planner mt-2">
            <LayoutTemplate size={16} />
            <span>
              <strong>Fill it with the story planner</strong>
              <small>Folders for characters, plot and world, ready to fill in</small>
            </span>
          </button>
        )}
        <p className="mt-3 text-[11.5px] text-ink-500">Every other kind of card is in the tool rail on the left.</p>
      </div>
    </div>
  );
}
