"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Immediate, keyboard-accessible label outside the sidebar's clipping scroll rail. */
export default function SidebarToolButton({ icon, title, onClick, active = false, className = "", compact = false, color = "#356eaa", tour }: {
  icon: ReactNode; title: string; onClick: () => void; active?: boolean;
  className?: string; compact?: boolean; color?: string;
  /** data-tour target for the guided tour (TutorialTour). */
  tour?: string;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  function show() {
    const rect = button.current?.getBoundingClientRect();
    if (rect) setPosition({ left: rect.right + 10, top: Math.max(24, Math.min(window.innerHeight - 24, rect.top + rect.height / 2)) });
  }
  function hideUnlessActive() { if (!hovered.current && !focused.current) setPosition(null); }
  const open = position !== null;
  useEffect(() => {
    if (!open) return;
    const dismiss = () => setPosition(null);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <>
    <button ref={button} type="button" aria-label={title} aria-describedby={open ? id : undefined} data-tour={tour}
      aria-pressed={active || undefined}
      onMouseEnter={() => { hovered.current = true; show(); }}
      onMouseLeave={() => { hovered.current = false; hideUnlessActive(); }}
      onFocus={() => { focused.current = true; show(); }}
      onBlur={() => { focused.current = false; hideUnlessActive(); }}
      onClick={() => { setPosition(null); onClick(); }}
      className={`${compact ? "rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5" : `flex h-9 w-9 flex-none items-center justify-center rounded-xl border shadow-card ${active ? "border-transparent bg-bibliarch-blue text-white" : "border-ink-900/8 bg-editor-raised text-ink-700 hover:border-ink-900/15 hover:shadow-card-hover"}`} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bibliarch-blue ${className}`}>
      {icon}
    </button>
    {position && createPortal(<div id={id} role="tooltip" className="pointer-events-none fixed z-[1000] rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-lg"
      style={{ left: position.left, top: position.top, transform: "translateY(-50%)", backgroundColor: color, maxWidth: `calc(100vw - ${position.left + 8}px)` }}>
      <span aria-hidden="true" className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45" style={{ backgroundColor: color }} />
      {title}
    </div>, document.body)}
  </>;
}
