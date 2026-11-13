"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import SidebarToolButton from "./SidebarToolButton";

/**
 * A sidebar tool that opens a small menu beside the rail (shapes, templates).
 * Portalled to the body so the rail's scroll clipping can't cut it off.
 */
export default function ToolFlyout({ icon, title, color, children }: {
  icon: ReactNode;
  title: string;
  color?: string;
  children: (close: () => void) => ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !anchor.current?.contains(t)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPos(null); };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = anchor.current?.getBoundingClientRect();
    if (r) setPos({ left: r.right + 10, top: Math.max(12, Math.min(window.innerHeight - 320, r.top - 8)) });
  }

  return (
    <>
      <span ref={anchor} className="flex">
        <SidebarToolButton icon={icon} title={title} color={color} active={!!pos} onClick={toggle} />
      </span>
      {pos && createPortal(
        <div ref={panel} role="menu" aria-label={title}
          className="pop-in emboss fixed z-[150] w-60 rounded-2xl p-2 shadow-card"
          style={{ left: pos.left, top: pos.top, maxWidth: `calc(100vw - ${pos.left + 8}px)` }}>
          <p className="px-2 pb-1 pt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-500">{title}</p>
          {children(close)}
        </div>,
        document.body
      )}
    </>
  );
}

export function FlyoutItem({ icon, label, hint, onClick }: { icon: ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button role="menuitem" onClick={onClick} className="flex w-full items-start gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-ink-900/5">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-ink-900/5 text-ink-700">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold text-ink-900">{label}</span>
        {hint && <span className="block text-[11px] leading-snug text-ink-500">{hint}</span>}
      </span>
    </button>
  );
}
