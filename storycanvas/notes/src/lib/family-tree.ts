// The "Family tree" starting layout: four generations of character cards in
// labelled section frames. Each couple is joined through a small "Couple"
// sticky between them, and their children hang off that sticky — the usual
// family-tree drawing, and it keeps arrows from crossing (two parents linked
// straight to two children always cross). Pure; ids come from the caller so
// tests can run it without the app.
import type { StoryConnection, StoryNode } from "./types";

export const TREE = { cardW: 260, cardH: 72, hubW: 100, hubH: 40, gap: 12, coupleGap: 64, row: 168, frameLabel: 44, framePad: 32 } as const;

type MakeId = (prefix: string) => string;

export interface TemplateResult { nodes: StoryNode[]; connections: StoryConnection[] }

export function buildFamilyTree(makeId: MakeId, origin: { x: number; y: number } = { x: 0, y: 0 }): TemplateResult {
  const { cardW, cardH, hubW, hubH, gap, coupleGap, row, frameLabel, framePad } = TREE;
  const nodes: StoryNode[] = [];
  const connections: StoryConnection[] = [];
  const cardY = (r: number) => r * row + frameLabel;

  const person = (name: string, r: number, x: number): StoryNode => {
    const n: StoryNode = { id: makeId("character"), type: "character", x, y: cardY(r), width: cardW, height: cardH, text: name, content: "", linkedCanvasId: makeId("canvas"), zIndex: 2 };
    nodes.push(n);
    return n;
  };
  const link = (from: StoryNode, to: StoryNode, type: StoryConnection["type"]) => connections.push({ id: makeId("conn"), from: from.id, to: to.id, type });
  /** Two partners with the "Couple" sticky between them; returns the sticky's centre x. */
  const couple = (a: string, b: string, r: number, left: number) => {
    const pa = person(a, r, left);
    const hub: StoryNode = { id: makeId("compact-text"), type: "compact-text", x: left + cardW + gap, y: cardY(r) + (cardH - hubH) / 2, width: hubW, height: hubH, text: "Couple", content: "", zIndex: 2 };
    nodes.push(hub);
    const pb = person(b, r, left + cardW + gap + hubW + gap);
    link(pa, hub, "relates-to");
    link(pb, hub, "relates-to");
    return { a: pa, b: pb, hub, center: hub.x + hubW / 2 };
  };
  const coupleWidth = cardW * 2 + hubW + gap * 2;

  // Generation 1: both sets of grandparents.
  const dadSide = couple("Grandfather", "Grandmother", 0, 0);
  const mumSide = couple("Grandfather", "Grandmother", 0, coupleWidth + coupleGap);
  // Generation 2: each parent centred under their own parents' couple sticky.
  const father = person("Father", 1, dadSide.center - cardW / 2);
  const mother = person("Mother", 1, mumSide.center - cardW / 2);
  link(dadSide.hub, father, "leads-to");
  link(mumSide.hub, mother, "leads-to");
  const parentsHub: StoryNode = {
    id: makeId("compact-text"), type: "compact-text",
    x: (father.x + cardW + mother.x) / 2 - hubW / 2, y: cardY(1) + (cardH - hubH) / 2,
    width: hubW, height: hubH, text: "Couple", content: "", zIndex: 2,
  };
  nodes.push(parentsHub);
  link(father, parentsHub, "relates-to");
  link(mother, parentsHub, "relates-to");
  // Generation 3: a sibling and you, side by side under your parents; you and a partner.
  const parentsCenter = parentsHub.x + hubW / 2;
  const sibling = person("Sibling", 2, parentsCenter - gap - cardW);
  const you = couple("You", "Partner", 2, parentsCenter + gap);
  link(parentsHub, sibling, "leads-to");
  link(parentsHub, you.a, "leads-to");
  // Generation 4: two children under you and your partner.
  const child1 = person("Child", 3, you.center - gap - cardW);
  const child2 = person("Child", 3, you.center + gap);
  link(you.hub, child1, "leads-to");
  link(you.hub, child2, "leads-to");

  // One frame per generation, all the same width so the rows read as a table.
  const right = Math.max(...nodes.map((n) => n.x + n.width));
  const left = Math.min(...nodes.map((n) => n.x));
  const labels = ["Grandparents", "Parents", "You & siblings", "Children"];
  const frames: StoryNode[] = labels.map((label, r) => ({
    id: makeId("shape"), type: "shape", text: label, content: "",
    x: left - framePad, y: r * row, width: right - left + framePad * 2, height: frameLabel + cardH + 24,
    shape: { kind: "frame", strokeStyle: "dashed", strokeWidth: 2 }, zIndex: 0,
  }));

  // Frames first so they're also first in saved order (and in older apps, which ignore our z-order).
  const all = [...frames, ...nodes].map((n) => ({ ...n, x: n.x + origin.x, y: n.y + origin.y }));
  return { nodes: all, connections };
}

export const BOARD_TEMPLATES = [
  { key: "family-tree", label: "Family tree", description: "Grandparents → parents → you & siblings → children, linked up and ready to rename.", build: buildFamilyTree },
] as const;

export type BoardTemplateKey = (typeof BOARD_TEMPLATES)[number]["key"];

/** Footprint of a template, for placing it in view. */
export function templateBounds(nodes: StoryNode[]): { x: number; y: number; w: number; h: number } {
  const x = Math.min(...nodes.map((n) => n.x)), y = Math.min(...nodes.map((n) => n.y));
  return { x, y, w: Math.max(...nodes.map((n) => n.x + n.width)) - x, h: Math.max(...nodes.map((n) => n.y + n.height)) - y };
}
