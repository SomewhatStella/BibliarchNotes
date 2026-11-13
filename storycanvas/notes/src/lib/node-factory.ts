import { DEFAULT_SIZE, type NodeType, type StoryNode } from "./types";
import { defaultChart } from "./charts";
import { shapeDefaults } from "./shapes";

export function generateId(prefix = "node"): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

let z = 1;

export function newNode(type: NodeType, overrides: Partial<StoryNode> = {}): StoryNode {
  const size = DEFAULT_SIZE[type];
  const base: StoryNode = {
    id: generateId(type),
    x: 80,
    y: 80,
    width: size.w,
    height: size.h,
    text: type === "character" ? "New character" : type === "location" ? "New place" : "Untitled",
    content: "",
    type,
    zIndex: z++,
  };
  if (type === "folder") {
    base.linkedCanvasId = generateId("canvas");
  }
  if (type === "location" || type === "character") {
    base.linkedCanvasId = generateId("canvas");
  }
  if (type === "event") {
    base.title = "Untitled event";
    base.summary = "";
    base.durationText = "";
  }
  if (type === "table") {
    base.tableData = [{ "Column A": "", "Column B": "" }];
  }
  if (type === "relationship-canvas") {
    base.relationshipData = { selectedCharacters: [], relationships: [] };
  }
  if (type === "list") {
    base.childIds = [];
    base.layoutMode = "single-column";
  }
  if (type === "chart") {
    base.text = "Stats";
    base.chart = defaultChart();
  }
  if (type === "shape") Object.assign(base, shapeDefaults("rect"));
  if (type === "drawing") {
    base.text = "Drawing";
    base.drawing = { w: 0, h: 0, strokes: [] };
  }
  return { ...base, ...overrides };
}
