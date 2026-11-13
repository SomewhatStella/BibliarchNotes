"use client";

import { X } from "lucide-react";
import { useEscape } from "@/lib/use-escape";

const GRID_SIZES = [10, 20, 40];

export default function SettingsPopup({
  gridSize,
  setGridSize,
  snap,
  setSnap,
  onClose,
}: {
  gridSize: number;
  setGridSize: (n: number) => void;
  snap: boolean;
  setSnap: (b: boolean) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/15" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop-in emboss w-80 rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-[16px] font-semibold text-ink-900">Canvas settings</p>
          <button onClick={onClose} className="rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>

        <Section title="Grid size">
          <div className="flex gap-1.5">
            {GRID_SIZES.map((g) => (
              <button key={g} onClick={() => setGridSize(g)} className={`flex-1 rounded-lg py-1.5 text-[12.5px] font-semibold ${gridSize === g ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}>
                {g}pt
              </button>
            ))}
          </div>
        </Section>

        <Section title="Snap to grid">
          <button onClick={() => setSnap(!snap)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12.5px] ${snap ? "bg-bibliarch-blue/10 text-bibliarch-blue" : "bg-ink-900/5 text-ink-700"}`}>
            {snap ? "On — cards land on the grid" : "Off — free placement"}
            <span className={`h-5 w-9 rounded-full p-0.5 ${snap ? "bg-bibliarch-blue" : "bg-ink-900/15"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${snap ? "translate-x-4" : ""}`} />
            </span>
          </button>
        </Section>

        <p className="text-[11.5px] text-ink-500">Card colors live in the palette picker up top now — one main color for the whole board, with a per-card override on each card&rsquo;s own inspector.</p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">{title}</p>
      {children}
    </div>
  );
}
