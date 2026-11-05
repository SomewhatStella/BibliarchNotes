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
  | "compact-text";

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
  zIndex?: number;
  settings?: NodeSettings;
  // line-only: a curved arrow drawn through three points (same shape storycanvas saves)
  linePoints?: { start: { x: number; y: number }; middle: { x: number; y: number }; end: { x: number; y: number } };
  lineStyle?: { color: string; width: number };
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
