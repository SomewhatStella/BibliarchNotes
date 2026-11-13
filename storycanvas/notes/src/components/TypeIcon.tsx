import { Type, HeartHandshake, User, MapPin, Folder, List as ListIcon, Image as ImageIcon, StickyNote, Table2, Flag, ArrowRight, PenLine, Shapes, ChartPie } from "lucide-react";
import type { NodeType } from "@/lib/types";

// One icon-per-type map, shared by the sidebar tool palette, list member
// rows, and anywhere else a node type needs a glyph — so "what icon means
// folder" is answered in exactly one place.
const ICONS: Record<NodeType, React.ComponentType<{ size?: number; className?: string }>> = {
  text: Type,
  character: User,
  location: MapPin,
  folder: Folder,
  list: ListIcon,
  table: Table2,
  event: Flag,
  "relationship-canvas": HeartHandshake,
  "compact-text": StickyNote,
  image: ImageIcon,
  line: ArrowRight,
  drawing: PenLine,
  shape: Shapes,
  chart: ChartPie,
};

export function iconForType(type: NodeType | string | undefined) {
  return ICONS[(type as NodeType) ?? "text"] ?? Type;
}

export default function TypeIcon({ type, size = 13, className }: { type: NodeType | string | undefined; size?: number; className?: string }) {
  const Icon = iconForType(type);
  return <Icon size={size} className={className} />;
}
