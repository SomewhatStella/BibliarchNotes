"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/*
 * First-run guided tour of the board. Each step points a spotlight at an element marked
 * data-tour="…" (sidebar, toolbar, a card); a step whose element isn't on screen (a viewer
 * has no tools, an empty board has no card to open) is shown centred instead, or skipped.
 * Skipping or finishing both count as "seen"; the "?" button in the toolbar replays it.
 */
export const TOUR_DONE_KEY = "bibliarch-notes:tutorial-done:v1";

export function tourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return true; // storage blocked: don't pop the tour open on every visit
  }
}
function markSeen() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, "1");
  } catch {
    /* storage blocked: nothing to remember */
  }
}

interface Step {
  target?: string;
  title: string;
  body: string;
  /** Leave the step out entirely when its element isn't there (editor-only tools). */
  needsTarget?: boolean;
}

const STEPS: Step[] = [
  { title: "Welcome to your story board", body: "A quick tour of the basics: about a minute. Use the arrow keys or the buttons, and Esc to leave at any time." },
  { target: "sidebar-tools", needsTarget: true, title: "Your tools", body: "Every kind of card lives in this rail: text, characters, places, folders, lists, tables, events, relationship maps and more. Hover a tool to see its name." },
  { target: "tool-character", needsTarget: true, title: "Add a card", body: "Click Character to drop a new character card right where you're looking. Drag a card to move it; drag its corner to resize." },
  { target: "open-card", title: "Open a character", body: "Characters, places and folders each have their own board inside. Double-click the card, or press its Open button, to step in. The path at the top takes you back out." },
  { target: "connect-tool", needsTarget: true, title: "Connect cards", body: "Click the Arrow, then one card and then another, to draw a link between them. Or select a card and drag its gold dot onto another card." },
  { target: "link-existing", needsTarget: true, title: "Reuse a character", body: "Need someone who already lives in another folder? Link them here instead of making a copy. A link shows their live name and picture and opens their board." },
  { target: "palette", title: "Colours", body: "Pick a palette for the whole story, or choose your own colours. The board changes as you try them." },
  { target: "share", title: "Share", body: "Invite someone by username or email, or make a link, as an editor or a viewer. You'll see each other's changes live." },
  { target: "undo", title: "Undo", body: "Made a mistake? Press Ctrl+Z (⌘Z on a Mac) to undo it. Moving a card into a folder also shows an Undo button." },
  { target: "tutorial", title: "That's it!", body: "You can replay this tour any time from the ? button up here. Have fun writing." },
];

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;

function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  // The first match that is actually visible (a card off-screen still counts; it's scrolled to).
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find((el) => el.getClientRects().length > 0) ?? null;
}

export default function TutorialTour({ onClose }: { onClose: () => void }) {
  // Decide once which steps apply here, so the counter doesn't jump around mid-tour.
  const [steps] = useState(() => STEPS.filter((s) => !s.needsTarget || findTarget(s.target)));
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const card = useRef<HTMLDivElement>(null);
  const step = steps[index]!;
  const last = index === steps.length - 1;

  const close = useCallback(() => {
    markSeen();
    onClose();
  }, [onClose]);

  const measure = useCallback(() => {
    const el = findTarget(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step.target]);

  useLayoutEffect(() => {
    findTarget(step.target)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
  }, [measure, step.target]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  // Focus moves into the tour, and goes back where it was when the tour ends.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    return () => previous?.focus?.();
  }, []);
  useEffect(() => {
    card.current?.focus();
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Nothing reaches the board's own shortcuts (Delete, Enter) while the tour is up;
      // default actions (Enter/Space on a focused button) still happen.
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === "ArrowRight" && !last) {
        e.stopPropagation();
        setIndex((i) => i + 1);
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.stopPropagation();
        setIndex((i) => i - 1);
      } else if (e.key === "Tab" && card.current) {
        // Keep Tab inside the tour card while it's open.
        const items = Array.from(card.current.querySelectorAll<HTMLElement>("button"));
        const first = items[0], lastItem = items[items.length - 1];
        if (!first || !lastItem) return;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === card.current)) {
          e.preventDefault();
          lastItem.focus();
        } else if (!e.shiftKey && document.activeElement === lastItem) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    // Capture phase, so the board's own shortcuts (Delete, Enter) don't fire underneath.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [close, index, last]);

  if (typeof document === "undefined") return null;

  // Beside the spotlight when there's room (right, then below, then above), else centred.
  const W = Math.min(340, window.innerWidth - 32);
  let pos: { left: number; top: number };
  if (!rect) pos = { left: (window.innerWidth - W) / 2, top: Math.max(16, window.innerHeight / 2 - 120) };
  else if (rect.left + rect.width + 16 + W < window.innerWidth) pos = { left: rect.left + rect.width + 16, top: rect.top };
  else if (rect.top + rect.height + 220 < window.innerHeight) pos = { left: rect.left + rect.width - W, top: rect.top + rect.height + 12 };
  else pos = { left: rect.left + rect.width - W, top: rect.top - 232 };
  pos = { left: Math.max(16, Math.min(window.innerWidth - W - 16, pos.left)), top: Math.max(16, Math.min(window.innerHeight - 240, pos.top)) };

  return createPortal(
    <div className="fixed inset-0 z-[1100]">
      {/* Blocks the board while touring; the spotlight's own shadow is the dimming. */}
      <div className="absolute inset-0" onClick={close} style={rect ? undefined : { background: "rgba(20, 24, 33, 0.55)" }} />
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-gold-500 motion-safe:transition-all motion-safe:duration-200"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(20, 24, 33, 0.55)" }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
        className="pop-in emboss absolute rounded-2xl p-5 outline-none"
        style={{ left: pos.left, top: pos.top, width: W }}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <p className="font-mono text-[10.5px] uppercase tracking-wide text-ink-500">
            Step {index + 1} of {steps.length}
          </p>
          <button onClick={close} aria-label="Close the tour" className="-m-1 rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
            <X size={14} />
          </button>
        </div>
        <h2 id="tour-title" className="font-display text-[17px] font-semibold text-ink-900">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
          {step.body}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button onClick={close} className="rounded-lg px-2 py-1.5 text-[12.5px] text-ink-500 hover:text-ink-900">
              Skip tour
            </button>
          )}
          <span className="flex-1" />
          {index > 0 && (
            <button onClick={() => setIndex((i) => i - 1)} className="rounded-lg bg-ink-900/5 px-3 py-1.5 text-[12.5px] font-semibold text-ink-700 hover:bg-ink-900/10">
              Back
            </button>
          )}
          <button
            onClick={() => (last ? close() : setIndex((i) => i + 1))}
            className="rounded-lg bg-bibliarch-blue px-4 py-1.5 text-[12.5px] font-semibold text-white hover:bg-blue-700"
          >
            {last ? "Done" : index === 0 ? "Show me" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
