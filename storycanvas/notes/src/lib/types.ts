// Field-for-field mirror of the Node/Connection/RelationshipConnection
// interfaces actually used by storycanvas's live canvas today
// (storycanvas/src/components/canvas/HTMLCanvas.tsx, read directly — not the
// stale docs). This is what's already sitting in production `canvas_data`
// rows; changing a field name here silently stops reading/writing it there.

export type NodeType =
  | "text"
  | "character"
  | "event"
  | "location"
  | "folder"
  | "list"
  | "image"
  | "table"
  | "relationship-canvas"
  | "line"
  | "compact-text"
  // Newer card types. Older clients don't know them and fall back to a plain
  // text card showing `text`, so every one of these keeps a sensible `text`.
  | "drawing"
  | "shape"
  | "chart";

export interface NodeSettings {
  locked?: boolean;
  font?: "default" | "serif" | "rounded" | "handwritten" | "display" | "mono";
  text_size?: "normal" | "large" | "huge";
  show_header?: boolean;
  show_caption?: boolean;
  image_fit?: "contain" | "cover" | "fill";
  show_profile_picture?: boolean;
  picture_shape?: "circle" | "square" | "rounded";
  show_duration?: boolean;
  expand_summary?: boolean;
  icon?: "folder" | "book" | "archive" | "box";
  expand_by_default?: boolean;
  show_header_row?: boolean;
  alternate_row_colors?: boolean;
}

export type RelationshipType = "romantic" | "family" | "friends" | "professional" | "rivals" | "other";

export interface RelationshipConnection {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;
  relationshipType: RelationshipType;
  strength: 1 | 2 | 3;
  label: string;
  notes?: string;
  isBidirectional: boolean;
  reverseRelationshipType?: RelationshipType;
  reverseStrength?: 1 | 2 | 3;
  reverseLabel?: string;
  // Set whenever this app edits a tie, so the shared registry can keep the newest copy.
  updatedAt?: string;
}

// One story-wide list of ties (see lib/relationship-registry.ts). Every map shows the ties
// between the people it contains, so the same pair is never drawn twice in different maps.
export interface RelationshipRegistry {
  version: 1;
  relationships: RelationshipConnection[];
  // Map-local tie ids already folded in, so a stale copy in another map is never re-imported.
  importedIds: string[];
}

export interface StoryNode {
  id: string;
  x: number;
  y: number;
  text: string;
  content?: string;
  width: number;
  height: number;
  type?: NodeType;
  color?: string;
  linkedCanvasId?: string;
  customTemplateId?: string; // Explicit provenance; ordinary linked folders remain ordinary folders.
  imageUrl?: string; // storage PATH in story-images, never base64 — see lib/storage.ts
  profileImageUrl?: string;
  locationIcon?: string;
  attributes?: unknown;
  tableData?: Record<string, string>[];
  columnWidths?: Record<string, number>;
  // event-only
  title?: string;
  summary?: string;
  durationText?: string;
  sequenceOrder?: number;
  // list-container
  parentId?: string;
  childIds?: string[];
  layoutMode?: "single-column" | "two-columns" | "grid";
  // relationship-canvas-only
  relationshipData?: {
    selectedCharacters: { id: string; name: string; profileImageUrl?: string; position: { x: number; y: number } }[];
    relationships: RelationshipConnection[];
  };
  // A linked card: shows and opens another character/location instead of being a copy.
  refNodeId?: string;
  // Only on the hidden registry node (canvas "story-relationships").
  relationshipRegistry?: RelationshipRegistry;
  zIndex?: number;
  settings?: NodeSettings;
  // line-only: a curved arrow drawn through three points (same shape storycanvas saves)
  linePoints?: { start: { x: number; y: number }; middle: { x: number; y: number }; end: { x: number; y: number } };
  lineStyle?: { color: string; width: number };
  // drawing-only: freehand pen strokes, see lib/drawing.ts
  drawing?: DrawingData;
  // shape-only: rectangles, ellipses, dividers and section frames, see lib/shapes.ts
  shape?: ShapeData;
  // chart-only: radar / bar / pie, see lib/charts.ts
  chart?: ChartData;
}

/**
 * Points are flat [x0, y0, x1, y1, …] in a `w`×`h` space whose origin is the
 * node's top-left corner. Keeping that space separate from node.width/height
 * means resizing a drawing just scales it, with no rewrite of every point.
 */
export interface DrawingStroke {
  id: string;
  points: number[];
  color: string;
  width: number;
}
export interface DrawingData {
  w: number;
  h: number;
  strokes: DrawingStroke[];
}

export type ShapeKind = "rect" | "rounded" | "ellipse" | "divider" | "frame";
export interface ShapeData {
  kind: ShapeKind;
  /** Unset = the board's main colour. */
  stroke?: string;
  /** Unset = no fill (a frame gets a faint tint of its stroke). */
  fill?: string;
  fillOpacity?: number;
  strokeStyle?: "solid" | "dashed";
  strokeWidth?: number;
  /** divider only */
  orientation?: "horizontal" | "vertical";
  /** "back" (default) sits behind cards; frames are always behind. */
  layer?: "back" | "front";
}

export type ChartKind = "radar" | "bar" | "pie";
export interface ChartData {
  kind: ChartKind;
  data: { label: string; value: number }[];
}

export type ConnectionType = "leads-to" | "conflicts-with" | "relates-to" | "relationship";

export interface StoryConnection {
  id: string;
  from: string;
  to: string;
  type?: ConnectionType;
}

export interface Story {
  id: string;
  user_id: string;
  title: string;
  bio: string | null;
  created_at: string;
  updated_at: string;
  settings: unknown;
}

export interface CanvasRow {
  id: string;
  story_id: string;
  canvas_type: string;
  nodes: StoryNode[];
  connections: StoryConnection[];
  palette: unknown;
  updated_at: string;
}

export const DEFAULT_SIZE: Record<NodeType, { w: number; h: number }> = {
  character: { w: 320, h: 72 },
  location: { w: 320, h: 72 },
  folder: { w: 300, h: 139 },
  text: { w: 300, h: 139 },
  list: { w: 320, h: 240 },
  table: { w: 280, h: 200 },
  "relationship-canvas": { w: 600, h: 400 },
  "compact-text": { w: 160, h: 48 },
  event: { w: 300, h: 139 },
  image: { w: 240, h: 180 },
  line: { w: 0, h: 0 },
  drawing: { w: 0, h: 0 },
  shape: { w: 240, h: 160 },
  chart: { w: 300, h: 320 },
};

export const CONNECTION_TYPES: ConnectionType[] = ["leads-to", "conflicts-with", "relates-to"];
export const RELATIONSHIP_TYPES: RelationshipType[] = [
  "romantic",
  "family",
  "friends",
  "professional",
  "rivals",
  "other",
];
export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  romantic: "#C76A82",
  family: "#2E5AAC",
  friends: "#3E9B5C",
  professional: "#E8A61C",
  rivals: "#8A5BB8",
  other: "#8B8B8B",
};
