import type { StoryNode, StoryConnection, CanvasRow } from './types';
// Same key and required shape as original HTMLCanvas.CustomTemplate.
export const TEMPLATE_KEY = 'bibliarch-custom-templates';
export interface CustomTemplate {
  id: string; name: string; displayType: 'folder' | 'character' | 'location' | 'event';
  customIcon?: string; profileImageUrl?: string; bio?: string;
  nodes: StoryNode[]; connections: StoryConnection[]; createdAt: number; updatedAt: number;
  // Optional backwards-compatible snapshot of nested boards.
  interiors?: Record<string, {nodes: StoryNode[]; connections: StoryConnection[]}>;
}
export function snapshotInteriors(nodes: StoryNode[], canvases: Record<string, CanvasRow>) {
  const result: NonNullable<CustomTemplate['interiors']> = {};
  function visit(ns: StoryNode[]) { for (const n of ns) {
    const key = n.linkedCanvasId || `${n.type}-canvas-${n.id}`;
    const c = canvases[key];
    if (c && !result[key]) { result[key] = structuredClone({nodes:c.nodes, connections:c.connections}); visit(c.nodes); }
  }}
  visit(nodes); return result;
}
export function instantiateTemplate(template: CustomTemplate) {
  const copy = structuredClone(template);
  const ids = new Map<string,string>();
  const fresh = () => crypto.randomUUID();
  const boards = {root: {nodes:copy.nodes, connections:copy.connections}, ...copy.interiors};
  const canvasIds = new Map<string,string>();
  for (const key of Object.keys(boards)) canvasIds.set(key, `canvas-${fresh()}`);
  for (const board of Object.values(boards)) for (const n of board.nodes) ids.set(n.id, fresh());
  for (const board of Object.values(boards)) for (const n of board.nodes) {
    const oldId=n.id; n.id=ids.get(oldId)!;
    if(n.parentId) n.parentId=ids.get(n.parentId) || n.parentId;
    if(n.childIds) n.childIds=n.childIds.map(id=>ids.get(id)||id);
    if(n.linkedCanvasId || ['folder','character','location','event'].includes(n.type||'')) {
      const key=n.linkedCanvasId || `${n.type}-canvas-${oldId}`;
      if(!canvasIds.has(key)) canvasIds.set(key,`canvas-${fresh()}`);
      n.linkedCanvasId=canvasIds.get(key);
    }
    if(n.relationshipData) {
      n.relationshipData.selectedCharacters.forEach(c=>{c.id=ids.get(c.id)||c.id;});
      n.relationshipData.relationships.forEach(r=>{r.id=fresh();r.fromCharacterId=ids.get(r.fromCharacterId)||r.fromCharacterId;r.toCharacterId=ids.get(r.toCharacterId)||r.toCharacterId;});
    }
  }
  for(const b of Object.values(boards)) b.connections=b.connections.map(c=>({...c,id:fresh(),from:ids.get(c.from)||c.from,to:ids.get(c.to)||c.to}));
  return {nodes:boards.root.nodes,connections:boards.root.connections,canvasType:canvasIds.get('root')!, interiors:Object.fromEntries(Object.entries(boards).map(([key,b])=>[canvasIds.get(key)!,b]))};
}
