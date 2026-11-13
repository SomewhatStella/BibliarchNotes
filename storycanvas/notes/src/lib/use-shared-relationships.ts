"use client";

// The store side of lib/relationship-registry.ts: reads the story's shared ties (with any
// not-yet-imported map ties folded in, in memory) and writes changes back to the hidden row.
import { useMemo } from "react";
import { useCanvasStore } from "./store";
import type { CanvasRow, RelationshipConnection, RelationshipRegistry, StoryNode } from "./types";
import {
  REGISTRY_CANVAS,
  REGISTRY_NODE_ID,
  applyMapEdit,
  findMaps,
  mapsSharingTies,
  mapsShowingTie,
  migrateLegacy,
  readRegistry,
  registryNode,
  tiesAmong,
  type MapRef,
} from "./relationship-registry";

export function effectiveRegistry(canvases: Record<string, CanvasRow>) {
  const maps = findMaps(canvases);
  const { registry, changed } = migrateLegacy(readRegistry(canvases), maps.map((m) => m.node));
  return { registry, changed, maps };
}

function writeRegistry(registry: RelationshipRegistry) {
  const store = useCanvasStore.getState();
  const exists = store.canvases[REGISTRY_CANVAS]?.nodes.some((n) => n.id === REGISTRY_NODE_ID);
  if (exists) store.updateNode(REGISTRY_CANVAS, REGISTRY_NODE_ID, { relationshipRegistry: registry });
  else store.addNode(REGISTRY_CANVAS, registryNode(registry));
}

/** Saves the one-time import of old per-map ties. Editors only (a viewer can't write). */
export function persistRegistryMigration() {
  const { registry, changed } = effectiveRegistry(useCanvasStore.getState().canvases);
  if (changed) writeRegistry(registry);
}

export function mapLabel(m: MapRef) {
  return m.node.text?.trim() || "Relationship map";
}

export function useSharedRelationships(node: StoryNode, readOnly: boolean) {
  const canvases = useCanvasStore((s) => s.canvases);
  const { registry, maps } = useMemo(() => effectiveRegistry(canvases), [canvases]);
  return {
    tiesAmong: (memberIds: Set<string>) => tiesAmong(registry, memberIds),
    otherMaps: (ties: RelationshipConnection[]) => mapsSharingTies(maps, node.id, ties),
    otherMapsForTie: (tie: RelationshipConnection) => mapsShowingTie(maps, node.id, tie),
    /** Records a map's change (prev -> next visible ties) story-wide. Returns false if not allowed. */
    commit(prev: RelationshipConnection[], next: RelationshipConnection[]) {
      if (readOnly) return false;
      writeRegistry(applyMapEdit(registry, prev, next, new Date().toISOString()));
      return true;
    },
  };
}
