"use client";
// Keyboard shortcuts and step grouping for board undo/redo.
import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/lib/store";

/** True when the browser's own text undo should handle Ctrl+Z (typing in a field). */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(type);
}

export function useBoardHistory(enabled: boolean, onUndo: () => void, onRedo: () => void) {
  const handlers = useRef({ onUndo, onRedo });
  handlers.current = { onUndo, onRedo };

  useEffect(() => {
    if (!enabled) return;
    const store = useCanvasStore.getState;
    // One pointer gesture = one step: a whole drag, or a drag that ends by dropping into a folder.
    // The end is deferred a tick so the drop handler (also on mouseup) still lands in the same step.
    const down = () => store().beginGesture();
    const up = () => setTimeout(() => store().endGesture(), 0);
    // Leaving a text field ends a typing run, so the next edit is its own step.
    // Bubble phase on purpose: React's onBlur (which commits the field) runs on
    // the root first, so the commit is sealed into its own step and a click
    // that caused the blur (say, Delete on another card) doesn't join it.
    const focusOut = () => store().sealHistory();
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      const isUndo = k === "z" && !e.shiftKey;
      const isRedo = k === "y" || (k === "z" && e.shiftKey);
      if (!isUndo && !isRedo) return;
      if (isTextEditingTarget(e.target)) return; // the field's own undo
      e.preventDefault();
      if (isUndo) handlers.current.onUndo();
      else handlers.current.onRedo();
    };
    window.addEventListener("mousedown", down, true);
    window.addEventListener("mouseup", up, true);
    window.addEventListener("focusout", focusOut);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down, true);
      window.removeEventListener("mouseup", up, true);
      window.removeEventListener("focusout", focusOut);
      window.removeEventListener("keydown", key);
    };
  }, [enabled]);
}
