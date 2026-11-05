"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, LayoutTemplate, Pencil, Plus, Trash2, X } from "lucide-react";
import { TEMPLATE_KEY, snapshotInteriors, type CustomTemplate } from "@/lib/custom-templates";
import type { CanvasRow } from "@/lib/types";
import CustomTypeIcon, { TYPE_APPEARANCES } from "./CustomTypeIcon";

export default function CustomTypesDialog({ canvas, canvases, onCreate, onClose }: {
  canvas: CanvasRow; canvases: Record<string, CanvasRow>;
  onCreate: (t: CustomTemplate) => void; onClose: () => void;
}) {
  const [loaded] = useState(() => {
    try {
      const value = JSON.parse(localStorage.getItem(TEMPLATE_KEY) || "[]");
      if (!Array.isArray(value) || value.some(t => !t || typeof t.id !== "string" || typeof t.name !== "string" || !Array.isArray(t.nodes) || !Array.isArray(t.connections))) throw new Error("Invalid saved types");
      return { types: value as CustomTemplate[], error: "" };
    } catch {
      return { types: [] as CustomTemplate[], error: "Saved types could not be read. Saving is blocked to protect the existing data." };
    }
  });
  const [error, setError] = useState(loaded.error);
  const [types, setTypes] = useState<CustomTemplate[]>(loaded.types);
  const [name, setName] = useState("");
  const [displayType, setDisplayType] = useState<CustomTemplate["displayType"]>("folder");
  const [source, setSource] = useState("current");
  const [editing, setEditing] = useState<string | null>(null);
  const dialog = useRef<HTMLElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", closeOnEscape, true);
    return () => document.removeEventListener("keydown", closeOnEscape, true);
  }, [onClose]);
  function save(next: CustomTemplate[]) {
    if (loaded.error) return false;
    try {
      localStorage.setItem(TEMPLATE_KEY, JSON.stringify(next));
      setTypes(next); setError(""); return true;
    } catch {
      setError("Unable to save types in this browser. Existing types have not been changed."); return false;
    }
  }
  function reset() { setEditing(null); setName(""); setSource("current"); setDisplayType("folder"); }
  function submit() {
    if (!name.trim()) return;
    const old = types.find(t => t.id === editing);
    const content = source === "keep" && old
      ? { nodes: old.nodes, connections: old.connections, interiors: old.interiors }
      : source === "current"
        ? { nodes: structuredClone(canvas.nodes), connections: structuredClone(canvas.connections), interiors: snapshotInteriors(canvas.nodes, canvases) }
        : { nodes: [], connections: [], interiors: undefined };
    const t: CustomTemplate = { ...old, id: old?.id || crypto.randomUUID(), name: name.trim(), displayType, createdAt: old?.createdAt || Date.now(), updatedAt: Date.now(), ...content };
    if (save(old ? types.map(x => x.id === old.id ? t : x) : [...types, t])) { reset(); nameInput.current?.focus(); }
  }
  const appearance = TYPE_APPEARANCES.find(a => a.value === displayType) || TYPE_APPEARANCES[0];
  return <div className="fixed inset-0 z-[300] flex items-center justify-center bg-ink-900/30 p-3 backdrop-blur-sm sm:p-6" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    onKeyDown={e => {
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "Tab") {
        const items = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
        if (!items?.length) return;
        const first = items[0], last = items[items.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }}>
    <section ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="custom-types-heading" aria-describedby="custom-types-description"
      className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-parchment-50 shadow-2xl outline-none">
      <header className="flex items-start gap-3 border-b border-ink-900/8 bg-editor-raised/70 p-5 sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><LayoutTemplate size={25} /></span>
        <div className="min-w-0 flex-1"><h2 id="custom-types-heading" className="text-lg font-semibold text-ink-900">Custom folder types</h2><p id="custom-types-description" className="mt-1 text-sm text-ink-500">Your reusable starting points. Create a type, then add independent copies to any board.</p></div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5"><X size={18} /></button>
      </header>
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-ink-700">Your library <span className="ml-1 rounded-full bg-ink-900/5 px-2 py-0.5 text-xs">{types.length}</span></h3><span className="text-xs text-ink-400">Saved in this browser</span></div>
        {!types.length && <div className="rounded-2xl border border-dashed border-violet-200 bg-bibliarch-blue/5 p-6 text-center"><LayoutTemplate size={30} className="mx-auto mb-2 text-violet-400" /><p className="text-sm font-medium text-ink-700">Make room for your own ideas</p><p className="mt-1 text-xs text-ink-500">Character sheets, world guides, chapter plans… save a board below to reuse it.</p></div>}
        <div className="grid gap-3 sm:grid-cols-2">{types.map(t => {
          const style = TYPE_APPEARANCES.find(a => a.value === t.displayType) || TYPE_APPEARANCES[0];
          return <article key={t.id} aria-label={t.name} className={`overflow-hidden rounded-2xl border bg-editor-raised shadow-sm ${editing === t.id ? "border-bibliarch-blue ring-1 ring-bibliarch-blue" : "border-ink-900/10"}`}>
            <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(120deg, color-mix(in srgb, ${style.background} 15%, var(--editor-card-bg, white)), var(--editor-card-bg, white))` }}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-editor-raised shadow-sm" style={{ color: style.color }}><CustomTypeIcon displayType={t.displayType} size={25} /></span>
              <div className="min-w-0"><h4 className="break-words text-sm font-semibold text-ink-900">{t.name}</h4><p className="mt-1 text-xs text-ink-500">{style.label} · {t.nodes.length} cards</p></div>
            </div>
            {t.bio && <p className="line-clamp-2 px-4 pb-2 text-xs text-ink-500">{t.bio}</p>}
            <div className="flex items-center gap-1 border-t border-ink-900/5 p-2">
              <button type="button" onClick={() => onCreate(t)} className="mr-auto flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-bibliarch-blue hover:bg-blue-50"><Plus size={15} />Create instance</button>
              <button type="button" aria-label={`Edit type ${t.name}`} onClick={() => { setEditing(t.id); setName(t.name); setDisplayType(t.displayType); setSource("keep"); nameInput.current?.focus(); }} className="rounded-lg p-2 text-ink-500 hover:bg-ink-900/5"><Pencil size={15} /></button>
              <button type="button" aria-label={`Delete type ${t.name}`} disabled={!!loaded.error} onClick={() => { if (window.confirm("Delete this type? Existing instances are preserved.") && save(types.filter(x => x.id !== t.id)) && editing === t.id) reset(); }} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          </article>;
        })}</div>
        <form className="mt-6 space-y-4 rounded-2xl border border-ink-900/8 bg-editor-raised p-4 sm:p-5" onSubmit={e => { e.preventDefault(); submit(); }}>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800"><Copy size={17} />{editing ? "Edit type" : "Create a new type"}</h3>
          <label className="block text-xs font-semibold text-ink-600">Type name<input ref={nameInput} required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Character sheet or Chapter plan" className="mt-1.5 block w-full rounded-xl border border-ink-900/15 bg-parchment-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-bibliarch-blue" /></label>
          <fieldset><legend className="mb-2 text-xs font-semibold text-ink-600">Appearance</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{TYPE_APPEARANCES.map(a => <label key={a.value} className="relative cursor-pointer">
            <input type="radio" name="appearance" value={a.value} checked={displayType === a.value} onChange={() => setDisplayType(a.value)} className="peer sr-only" />
            <span className="flex h-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-transparent text-center peer-checked:border-current peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" style={{ color: a.color, backgroundColor: a.background }}>
              <CustomTypeIcon displayType={a.value} size={24} /><span className="text-xs font-semibold">{a.label}</span><span className="text-[10px]">{a.description}</span>
              {displayType === a.value && <Check size={13} className="absolute right-2 top-2" />}
            </span>
          </label>)}</div></fieldset>
          <label className="block text-xs font-semibold text-ink-600">Default interior<select value={source} onChange={e => setSource(e.target.value)} className="mt-1.5 block w-full rounded-xl border border-ink-900/15 bg-parchment-50 px-3 py-2.5 text-sm font-normal">{editing && <option value="keep">Keep saved interior</option>}<option value="current">Copy current board</option><option value="empty">Empty board</option></select></label>
          <div className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: appearance.background, color: appearance.color }}><CustomTypeIcon displayType={displayType} /><div className="min-w-0"><p className="break-words text-sm font-semibold">{name.trim() || "Your new type"}</p><p className="mt-0.5 text-xs">{source === "keep" ? "Keeps the saved interior" : source === "current" ? `${canvas.nodes.length} cards from this board` : "Starts with an empty board"} · Independent copies</p></div></div>
          <p className="text-xs leading-relaxed text-ink-500">Updating a type only changes future copies. Existing boards stay exactly as they are.</p>
          <div className="flex items-center gap-3"><button className="rounded-xl bg-bibliarch-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-40" disabled={!!loaded.error || !name.trim()} type="submit">Save type</button>{editing && <button type="button" className="rounded-lg px-3 py-2 text-sm text-ink-500 hover:bg-ink-900/5" onClick={reset}>Cancel edit</button>}</div>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  </div>;
}
