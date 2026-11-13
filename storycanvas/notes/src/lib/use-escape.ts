"use client";
import { useEffect, useRef } from "react";

/**
 * Esc closes the dialog or panel that calls this. Only the most recently opened one reacts, so
 * Esc in a dialog opened from a panel closes the dialog, not both. Disabled while `active` is false.
 */
const stack: symbol[] = [];

export function useEscape(onEscape: () => void, active = true) {
  const handler = useRef(onEscape);
  handler.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const id = Symbol("escape");
    stack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || stack[stack.length - 1] !== id) return;
      e.preventDefault();
      handler.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [active]);
}
