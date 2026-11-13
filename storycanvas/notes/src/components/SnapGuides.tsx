"use client";

import type { Guide } from "@/lib/smart-snap";

/** Thin alignment lines drawn while a card is snapped to others (see lib/smart-snap.ts). */
export default function SnapGuides({ guides, zoom }: { guides: Guide[]; zoom: number }) {
  if (guides.length === 0) return null;
  const ext = 12 / zoom; // run a little past both boxes, like Figma
  return (
    <svg className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible" style={{ zIndex: 70 }} aria-hidden="true">
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <line key={i} x1={g.pos} x2={g.pos} y1={g.from - ext} y2={g.to + ext} stroke="#D6336C" strokeWidth={1 / zoom} />
        ) : (
          <line key={i} y1={g.pos} y2={g.pos} x1={g.from - ext} x2={g.to + ext} stroke="#D6336C" strokeWidth={1 / zoom} />
        )
      )}
    </svg>
  );
}
