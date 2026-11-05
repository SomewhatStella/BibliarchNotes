import { FolderKanban, UserRound, MapPin, Flag } from "lucide-react";
import type { CustomTemplate } from "@/lib/custom-templates";

export const TYPE_APPEARANCES = [
  { value: "folder", label: "Folder", description: "A reusable collection", color: "#a56b25", background: "#fff3dc" },
  { value: "character", label: "Character", description: "People & profiles", color: "#3976a5", background: "#e9f4ff" },
  { value: "location", label: "Location", description: "Places & worlds", color: "#367d68", background: "#e7f5ee" },
  { value: "event", label: "Event", description: "Moments & milestones", color: "#8256a5", background: "#f3eaff" },
] as const;

/** FolderKanban deliberately distinguishes reusable types from ordinary Folder nodes. */
export default function CustomTypeIcon({ displayType = "folder", size = 22, className }: {
  displayType?: CustomTemplate["displayType"]; size?: number; className?: string;
}) {
  const Icon = { folder: FolderKanban, character: UserRound, location: MapPin, event: Flag }[displayType] || FolderKanban;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
