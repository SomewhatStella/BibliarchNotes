// Undo/redo for board edits (feedback items 5 + 14).
//
// Each step remembers, per board it touched, the board before and after.
// Undo doesn't paste the old board back wholesale: it works out which cards
// that step changed and reverts only those on the CURRENT board, so a
// collaborator's edit to some other card made in the meantime survives.
//
// Grouping: everything during one mouse gesture (a whole drag, a drag that
// ends in a drop) is one step; repeated edits to the same card(s) with no
// pause longer than COALESCE_MS (typing in a table cell) are one step.
//
// Pure and import-free on purpose so `node --test` can load it directly.
import type { BoardState } from "./node-merge";

export const COALESCE_MS = 3000;
export const MAX_STEPS = 200;

export interface HistoryStep {
  id: number;
  key: string;
  at: number;
  gesture: number | null;
  sealed: boolean;
  boards: Record<string, { before: BoardState; after: BoardState }>;
}

export class History {
  undoStack: HistoryStep[] = [];
  redoStack: HistoryStep[] = [];
  private nextId = 1;
  private gesture: number | null = null;
  private gestureCount = 0;

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  get topId(): number | null { return this.undoStack[this.undoStack.length - 1]?.id ?? null; }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.gesture = null;
  }

  /** Pointer went down: whatever comes next starts a fresh step and stays one step until the pointer is released. */
  beginGesture() {
    this.seal();
    this.gesture = ++this.gestureCount;
  }
  endGesture() {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top && this.gesture !== null && top.gesture === this.gesture) top.sealed = true;
    this.gesture = null;
  }
  /** Ends coalescing (an input lost focus, a dialog closed…). */
  seal() {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top) top.sealed = true;
  }

  record(canvasType: string, before: BoardState, after: BoardState, key: string, now: number) {
    const top = this.undoStack[this.undoStack.length - 1];
    const sameGesture = this.gesture !== null && top?.gesture === this.gesture;
    const sameRun = !!top && top.key === key && now - top.at < COALESCE_MS && top.gesture === null && this.gesture === null;
    if (top && !top.sealed && (sameGesture || sameRun)) {
      const board = top.boards[canvasType];
      if (board) board.after = after;
      else top.boards[canvasType] = { before, after };
      top.at = now;
    } else {
      this.undoStack.push({ id: this.nextId++, key, at: now, gesture: this.gesture, sealed: false, boards: { [canvasType]: { before, after } } });
      if (this.undoStack.length > MAX_STEPS) this.undoStack.shift();
    }
    this.redoStack = [];
  }

  popUndo(): HistoryStep | null {
    const step = this.undoStack.pop() ?? null;
    if (step) {
      step.sealed = true;
      this.redoStack.push(step);
    }
    return step;
  }
  popRedo(): HistoryStep | null {
    const step = this.redoStack.pop() ?? null;
    if (step) this.undoStack.push(step);
    return step;
  }
}

function revertList<T extends { id: string }>(current: T[], from: T[], to: T[]): T[] {
  if (from === to) return current;
  const fromMap = new Map(from.map((x) => [x.id, x]));
  const toMap = new Map(to.map((x) => [x.id, x]));
  const touched = new Set<string>();
  for (const [id, x] of fromMap) if (toMap.get(id) !== x) touched.add(id);
  for (const [id, x] of toMap) if (fromMap.get(id) !== x) touched.add(id);
  if (!touched.size) return current;

  // Replace or drop the touched ids where they sit now…
  const out: T[] = [];
  const present = new Set<string>();
  for (const x of current) {
    if (!touched.has(x.id)) { out.push(x); present.add(x.id); continue; }
    const target = toMap.get(x.id);
    if (target) { out.push(target); present.add(x.id); }
  }
  // …and put back the ones that come back, next to the card they used to follow.
  to.forEach((x, i) => {
    if (!touched.has(x.id) || present.has(x.id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = out.findIndex((y) => y.id === to[j]!.id);
      if (k >= 0) { at = k + 1; break; }
    }
    out.splice(at, 0, x);
    present.add(x.id);
  });
  return out;
}

/** Moves the cards a step changed from their `from` version to their `to` version on the current board. */
export function revertStep(current: BoardState, from: BoardState, to: BoardState): BoardState {
  return {
    nodes: revertList(current.nodes, from.nodes, to.nodes),
    connections: revertList(current.connections, from.connections, to.connections),
    palette: from.palette !== to.palette ? to.palette : current.palette,
  };
}
