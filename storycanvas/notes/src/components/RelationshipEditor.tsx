"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { Plus, X, UserPlus, Users } from "lucide-react";
import type { RelationshipConnection, StoryNode } from "@/lib/types";
import { RELATIONSHIP_COLORS, RELATIONSHIP_TYPES } from "@/lib/types";
import { getImageUrl } from "@/lib/storage";

const STRENGTH_WIDTH = { 1: 1, 2: 2, 3: 3.5 } as const;
const STRENGTH_LABEL = { 1: "weak", 2: "medium", 3: "strong" } as const;

// This is the exact read that used to race a 2-second debounced save
// (storycanvas's own bug report: "ABANDONED BY USER — NON-FUNCTIONAL").
// `allCharacters` here comes from the Zustand store's in-memory scan of
// every loaded canvas, never a fresh database query — so it's never stale
// by a save that hasn't landed yet.
//
// The map itself is ported to match the real storycanvas behavior (read
// straight from HTMLCanvas.tsx, not guessed): membership is EXPLICIT
// (selectedCharacters), not auto-derived from who happens to be in a tie;
// every character carries a persisted, user-draggable position instead of
// an auto-computed ring layout; and a tie can be "two-way" with an
// independent type/strength/label in each direction plus a free-text
// notes field.
export default function RelationshipEditor({
  node,
  allCharacters,
  onChange,
}: {
  node: StoryNode;
  allCharacters: { id: string; name: string; profileImageUrl?: string }[];
  onChange: (patch: Partial<StoryNode>) => void;
}) {
  const [adding, setAdding] = useState<RelationshipConnection | null | undefined>(undefined);
  const [formA, setFormA] = useState("");
  const [formB, setFormB] = useState("");
  const [formType, setFormType] = useState<(typeof RELATIONSHIP_TYPES)[number]>("friends");
  const [formStrength, setFormStrength] = useState<1 | 2 | 3>(2);
  const [formLabel, setFormLabel] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [mutual, setMutual] = useState(true);
  const [reverseType, setReverseType] = useState<(typeof RELATIONSHIP_TYPES)[number]>("rivals");
  const [reverseStrength, setReverseStrength] = useState<1 | 2 | 3>(2);
  const [reverseLabel, setReverseLabel] = useState("");
  const [peopleAnchor, setPeopleAnchor] = useState<{ x: number; y: number } | null>(null);

  const data = node.relationshipData ?? { selectedCharacters: [], relationships: [] };
  // OUTER_PAD leaves a visible strip of the card's own cream chrome around
  // the bordered canvas surface — without it the border sat flush with the
  // card's own edge, so the "canvas" never actually looked bounded inside
  // the card the way an inset element should.
  const OUTER_PAD = 10;
  const w = Math.max(200, node.width - 24 - OUTER_PAD * 2);
  const h = Math.max(150, node.height - 70 - OUTER_PAD * 2);

  // Self-healing for older saves: anyone referenced by a tie but missing
  // from selectedCharacters (shouldn't happen going forward, since
  // membership is explicit now) still renders instead of silently
  // vanishing, placed via the same random-scatter new members get.
  const missingIds = Array.from(
    new Set(data.relationships.flatMap((r) => [r.fromCharacterId, r.toCharacterId]).filter((id) => !data.selectedCharacters.some((c) => c.id === id)))
  );
  const members = [
    ...data.selectedCharacters,
    ...missingIds.map((id) => ({
      id,
      name: allCharacters.find((c) => c.id === id)?.name ?? "?",
      profileImageUrl: allCharacters.find((c) => c.id === id)?.profileImageUrl,
      position: randomPosition(w, h),
    })),
  ];
  const nameOf = (id: string) => allCharacters.find((c) => c.id === id)?.name ?? members.find((c) => c.id === id)?.name ?? "?";
  const portraitOf = (id: string) => allCharacters.find((c) => c.id === id)?.profileImageUrl ?? members.find((c) => c.id === id)?.profileImageUrl;

  // Live drag — the position shown while dragging is purely local state so
  // every frame doesn't schedule a save; only mouseup commits.
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [livePos, setLivePos] = useState<{ id: string; x: number; y: number } | null>(null);

  function commitMembers(nextMembers: typeof members) {
    onChange({ relationshipData: { selectedCharacters: nextMembers, relationships: data.relationships } });
  }
  function commitRelationships(next: RelationshipConnection[]) {
    onChange({ relationshipData: { selectedCharacters: members, relationships: next } });
  }

  function beginDrag(id: string, clientX: number, clientY: number, startPos: { x: number; y: number }, offsetLeft: number, offsetTop: number) {
    const dx = clientX - offsetLeft - startPos.x;
    const dy = clientY - offsetTop - startPos.y;
    dragRef.current = { id, dx, dy };
    setLivePos({ id, ...startPos });
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const x = clamp(ev.clientX - offsetLeft - d.dx, 0, w);
      const y = clamp(ev.clientY - offsetTop - d.dy, 0, h);
      setLivePos({ id: d.id, x, y });
    };
    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      setLivePos((cur) => {
        if (d && cur && cur.id === d.id) {
          commitMembers(members.map((m) => (m.id === d.id ? { ...m, position: { x: cur.x, y: cur.y } } : m)));
        }
        return null;
      });
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function addCharacter(id: string) {
    if (members.some((m) => m.id === id)) return;
    const c = allCharacters.find((ch) => ch.id === id);
    if (!c) return;
    commitMembers([...members, { id: c.id, name: c.name, profileImageUrl: c.profileImageUrl, position: randomPosition(w, h) }]);
  }
  function removeCharacter(id: string) {
    // One onChange, not two — two sequential commitMembers/commitRelationships
    // calls each close over the same stale `node.relationshipData` prop
    // (it hasn't re-rendered between them), so the second call clobbered the
    // first and silently undid the removal. Found by actually removing one.
    onChange({
      relationshipData: {
        selectedCharacters: members.filter((m) => m.id !== id),
        relationships: data.relationships.filter((r) => r.fromCharacterId !== id && r.toCharacterId !== id),
      },
    });
  }

  function openNewTie() {
    setFormA("");
    setFormB("");
    setFormType("friends");
    setFormStrength(2);
    setFormLabel("");
    setFormNotes("");
    setMutual(true);
    setReverseType("rivals");
    setReverseStrength(2);
    setReverseLabel("");
    setAdding(null);
  }
  function openEditTie(r: RelationshipConnection) {
    setFormA(r.fromCharacterId);
    setFormB(r.toCharacterId);
    setFormType(r.relationshipType);
    setFormStrength(r.strength);
    setFormLabel(r.label);
    setFormNotes(r.notes ?? "");
    setMutual(r.isBidirectional);
    setReverseType(r.reverseRelationshipType ?? "rivals");
    setReverseStrength(r.reverseStrength ?? 2);
    setReverseLabel(r.reverseLabel ?? "");
    setAdding(r);
  }

  function saveTie() {
    if (!formA || !formB || formA === formB) return;
    const editingId = adding?.id;
    const next = data.relationships.filter((r) => r.id !== editingId && !samePair(r, formA, formB));
    next.push({
      id: editingId ?? `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fromCharacterId: formA,
      toCharacterId: formB,
      relationshipType: formType,
      strength: formStrength,
      label: formLabel || formType,
      notes: formNotes || undefined,
      isBidirectional: mutual,
      ...(mutual
        ? {}
        : { reverseRelationshipType: reverseType, reverseStrength, reverseLabel: reverseLabel || reverseType }),
    });
    commitRelationships(next);
    setAdding(undefined);
  }

  function removeTie(id: string) {
    commitRelationships(data.relationships.filter((r) => r.id !== id));
  }

  const rootRef = useRef<HTMLDivElement>(null);

  if (allCharacters.length < 2) {
    return (
      <div className="h-full w-full bg-parchment-50 p-2.5" onMouseDown={(e) => e.stopPropagation()}>
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-lg border border-ink-900/15 px-4 text-center"
          style={{ background: "var(--color-canvas-bg)" }}
        >
          <p className="text-[12.5px] text-ink-500">Needs at least two character cards anywhere in this story.</p>
        </div>
      </div>
    );
  }

  return (
    // A visible strip of the card's own cream chrome (p-2.5) around the
    // actual canvas surface below — "a node inside a node": the bordered,
    // dotted box reads as something INSET inside the card, not just a
    // border drawn flush with the card's own edge.
    <div className="h-full w-full select-none bg-parchment-50 p-2.5" onMouseDown={(e) => e.stopPropagation()}>
    <div
      ref={rootRef}
      className="relative h-full w-full select-none rounded-lg border border-ink-900/15"
      style={{
        background: "var(--color-canvas-bg)",
        backgroundImage: "radial-gradient(circle, rgba(43, 36, 22, 0.28) 0.9px, transparent 0.9px)",
        backgroundSize: "12px 12px",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <svg data-testid="rel-lines-svg" width={w} height={h} className="pointer-events-none absolute left-3 top-3">
        {data.relationships.map((r) => {
          const a = posOf(r.fromCharacterId, members, livePos);
          const b = posOf(r.toCharacterId, members, livePos);
          if (!a || !b) return null;
          const onClickTie = (e: ReactMouseEvent) => {
            e.stopPropagation();
            openEditTie(r);
          };
          if (r.isBidirectional) {
            return (
              <g key={r.id} className="pointer-events-auto cursor-pointer">
                {/* A fat invisible stroke under the visible thin one — the
                    real line is too thin to reliably click, and clicking a
                    tie is now the ONLY way to edit/remove it (the
                    bottom-left chip list that used to do this was pure
                    clutter over the map). */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} onClick={onClickTie} />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={RELATIONSHIP_COLORS[r.relationshipType]}
                  strokeWidth={STRENGTH_WIDTH[r.strength]}
                  strokeLinecap="round"
                  opacity={0.85}
                  onClick={onClickTie}
                >
                  <title>{`${r.label} — click to edit`}</title>
                </line>
              </g>
            );
          }
          // Two-way: two parallel offset lines, one per direction, each
          // with its own color/weight — matching the original app's
          // two-independent-feelings rendering.
          const [o1, o2] = perpendicularOffset(a, b, 3.5);
          return (
            <g key={r.id} className="pointer-events-auto cursor-pointer">
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={16} onClick={onClickTie} />
              <line x1={a.x + o1.x} y1={a.y + o1.y} x2={b.x + o1.x} y2={b.y + o1.y} stroke={RELATIONSHIP_COLORS[r.relationshipType]} strokeWidth={STRENGTH_WIDTH[r.strength]} strokeLinecap="round" opacity={0.85} onClick={onClickTie}>
                <title>{`${nameOf(r.fromCharacterId)} → ${nameOf(r.toCharacterId)}: ${r.label} — click to edit`}</title>
              </line>
              <line
                x1={a.x + o2.x}
                y1={a.y + o2.y}
                x2={b.x + o2.x}
                y2={b.y + o2.y}
                stroke={RELATIONSHIP_COLORS[r.reverseRelationshipType ?? "other"]}
                strokeWidth={STRENGTH_WIDTH[r.reverseStrength ?? 2]}
                strokeLinecap="round"
                opacity={0.85}
                strokeDasharray="1 4"
                onClick={onClickTie}
              >
                <title>{`${nameOf(r.toCharacterId)} → ${nameOf(r.fromCharacterId)}: ${r.reverseLabel} — click to edit`}</title>
              </line>
            </g>
          );
        })}
      </svg>
      {/* pointer-events-none on the wrapper, -auto on each avatar — this
          full-size transparent div was otherwise swallowing every click
          across the WHOLE map (empty space included), which silently ate
          every click meant for a relationship line underneath it. Found by
          actually clicking a line, not just checking it rendered. */}
      <div className="pointer-events-none absolute left-3 top-3" style={{ width: w, height: h }}>
        {members.map((m) => {
          const pos = livePos && livePos.id === m.id ? livePos : m.position;
          const portrait = getImageUrl(portraitOf(m.id));
          return (
            <div
              key={m.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                const root = rootRef.current;
                if (!root) return;
                const r = root.getBoundingClientRect();
                beginDrag(m.id, e.clientX, e.clientY, m.position, r.left + 12, r.top + 12);
              }}
              className="pointer-events-auto absolute flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center gap-1 active:cursor-grabbing"
              style={{ left: pos.x, top: pos.y }}
              title="Drag to reposition"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-bibliarch-blue/15 text-[11px] font-semibold text-bibliarch-blue ring-2 ring-white">
                {portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portrait} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  nameOf(m.id).slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="max-w-[72px] truncate text-[10.5px] text-ink-700">{nameOf(m.id)}</span>
            </div>
          );
        })}
      </div>

      <div className="absolute right-2 top-2 flex items-center gap-1.5">
        <button
          onClick={(e) => {
            if (peopleAnchor) {
              setPeopleAnchor(null);
            } else {
              const r = e.currentTarget.getBoundingClientRect();
              setPeopleAnchor({ x: r.right, y: r.bottom + 6 });
            }
          }}
          title="Add or remove characters"
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-card ${peopleAnchor ? "bg-bibliarch-blue text-white" : "bg-editor-raised/90 text-ink-700"}`}
        >
          <Users size={12} /> People
        </button>
      </div>

      {/* Portaled to the document body, fixed to the button's own screen
          position — this used to be `absolute` inside the card, which
          NodeCard's own overflow-hidden silently clipped whenever the card
          wasn't huge. Found by actually looking at it at a normal card
          size, not after manually resizing the card first. */}
      {peopleAnchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pop-in fixed z-[200] w-56 rounded-xl emboss p-3"
            style={{ left: Math.min(peopleAnchor.x - 224, window.innerWidth - 236), top: Math.min(peopleAnchor.y, window.innerHeight - 320) }}
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-500">On this map</p>
            <div className="mb-3 flex flex-col gap-1">
              {members.length === 0 && <p className="text-[11.5px] text-ink-500/60">Nobody yet.</p>}
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 hover:bg-ink-900/4">
                  <span className="truncate text-[12px] text-ink-700">{nameOf(m.id)}</span>
                  <button onClick={() => removeCharacter(m.id)} title="Remove from map" className="flex-none text-ink-500/50 hover:text-bibliarch-rose">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-500">Add</p>
            <div className="scrollbar-thin flex max-h-32 flex-col gap-0.5 overflow-auto">
              {allCharacters.filter((c) => !members.some((m) => m.id === c.id)).length === 0 && (
                <p className="text-[11.5px] text-ink-500/60">Everyone&rsquo;s already here.</p>
              )}
              {allCharacters
                .filter((c) => !members.some((m) => m.id === c.id))
                .map((c) => (
                  <button key={c.id} onClick={() => addCharacter(c.id)} className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[12px] text-ink-700 hover:bg-ink-900/5">
                    <UserPlus size={12} className="text-ink-500/60" /> {c.name}
                  </button>
                ))}
            </div>
          </div>,
          document.body
        )}

      <button onClick={openNewTie} className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-card">
        <Plus size={12} /> Tie
      </button>
      {/* No more floating chip legend cluttering the corner of the map —
          every line is now its own click target (via the invisible fat
          hit-stroke above) that opens the same edit/remove dialog. */}

      {/* Portaled and fixed to the viewport, not the card — this modal's
          real content (two person-pickers, type/strength/notes) is far
          taller than a typical relationship-map card, and NodeCard's own
          overflow-hidden was silently clipping the header and "Who"
          section off the top entirely whenever the card wasn't huge. The
          same bug the People panel had, just worse because this modal has
          so much more content. Found by actually opening it on a
          default-sized card, not a manually-enlarged one. */}
      {adding !== undefined &&
        typeof document !== "undefined" &&
        createPortal(
          <div data-testid="tie-form" className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/25 p-4">
            <div className="pop-in emboss flex max-h-[90%] w-full max-w-2xl flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center justify-between border-b border-ink-900/8 px-5 py-4">
              <p className="font-display text-[18px] font-semibold text-ink-900">{adding ? "Edit tie" : "New tie"}</p>
              <button onClick={() => setAdding(undefined)} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5">
                <X size={16} />
              </button>
            </div>

            <div className="scrollbar-thin flex-1 overflow-auto px-5 py-4">
              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Who</p>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <PersonPicker label="Person A" characters={allCharacters} value={formA} exclude={formB} onPick={setFormA} />
                <PersonPicker label="Person B" characters={allCharacters} value={formB} exclude={formA} onPick={setFormB} />
              </div>

              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">How they relate</p>
              <div className="mb-4 flex gap-1">
                {RELATIONSHIP_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full border px-1.5 py-1.5 text-[11px] capitalize ${
                      formType === t ? "border-transparent text-white" : "border-ink-900/12 text-ink-700 hover:bg-ink-900/5"
                    }`}
                    style={formType === t ? { background: RELATIONSHIP_COLORS[t] } : undefined}
                  >
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: formType === t ? "white" : RELATIONSHIP_COLORS[t] }} />
                    <span className="truncate">{t}</span>
                  </button>
                ))}
              </div>

              <input
                value={formLabel}
                onChange={(e) => setFormLabel(e.target.value)}
                placeholder="Give it a label — “sisters”, “ex-rivals”…"
                className="mb-4 w-full rounded-lg border border-ink-900/12 bg-editor-raised px-3 py-2 text-[13px] outline-none focus:border-bibliarch-blue"
              />

              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Strength</p>
              <div className="mb-4 flex gap-1.5">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFormStrength(s)}
                    className={`flex-1 rounded-lg py-2 text-[12.5px] font-semibold capitalize ${
                      formStrength === s ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"
                    }`}
                  >
                    {STRENGTH_LABEL[s]}
                  </button>
                ))}
              </div>

              <label className="mb-1 flex items-center justify-between rounded-lg bg-ink-900/4 px-3 py-2.5 text-[12.5px] text-ink-700">
                Two-way relationship (different feelings in each direction)
                <input type="checkbox" checked={!mutual} onChange={(e) => setMutual(!e.target.checked)} className="h-4 w-4" />
              </label>
              {!mutual && (
                <div className="mt-2 rounded-lg border border-ink-900/8 p-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-ink-500">B→A: how they feel back</p>
                  <div className="mb-2 flex gap-1">
                    {RELATIONSHIP_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setReverseType(t)}
                        className={`min-w-0 flex-1 truncate rounded-full border px-1.5 py-1 text-[10.5px] capitalize ${
                          reverseType === t ? "border-transparent text-white" : "border-ink-900/12 text-ink-700 hover:bg-ink-900/5"
                        }`}
                        style={reverseType === t ? { background: RELATIONSHIP_COLORS[t] } : undefined}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <input
                    value={reverseLabel}
                    onChange={(e) => setReverseLabel(e.target.value)}
                    placeholder="Return label — “just a friend”…"
                    className="mb-2 w-full rounded-lg border border-ink-900/12 bg-editor-raised px-3 py-1.5 text-[12.5px] outline-none focus:border-bibliarch-blue"
                  />
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setReverseStrength(s)}
                        className={`flex-1 rounded-lg py-1.5 text-[11.5px] font-semibold capitalize ${
                          reverseStrength === s ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"
                        }`}
                      >
                        {STRENGTH_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mb-1.5 mt-4 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Notes (optional)</p>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Any other details about this relationship…"
                className="h-20 w-full resize-none rounded-lg border border-ink-900/12 bg-editor-raised px-3 py-2 text-[12.5px] outline-none focus:border-bibliarch-blue"
              />
            </div>

            <div className="flex gap-2 border-t border-ink-900/8 px-5 py-4">
              {adding && (
                <button
                  onClick={() => {
                    removeTie(adding.id);
                    setAdding(undefined);
                  }}
                  className="rounded-lg px-3 py-2 text-[13.5px] text-bibliarch-rose"
                >
                  Remove
                </button>
              )}
              <button onClick={() => setAdding(undefined)} className="rounded-lg px-4 py-2 text-[13.5px] text-ink-500">Cancel</button>
              <button
                onClick={saveTie}
                disabled={!formA || !formB || formA === formB}
                className="flex-1 rounded-lg bg-bibliarch-blue py-2 text-[13.5px] font-semibold text-white disabled:opacity-40"
              >
                {adding ? "Save tie" : "Add tie"}
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </div>
    </div>
  );
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function randomPosition(w: number, h: number) {
  return { x: clamp(40 + Math.random() * Math.max(1, w - 80), 0, w), y: clamp(40 + Math.random() * Math.max(1, h - 80), 0, h) };
}

function posOf(
  id: string,
  members: { id: string; position: { x: number; y: number } }[],
  livePos: { id: string; x: number; y: number } | null
) {
  if (livePos && livePos.id === id) return { x: livePos.x, y: livePos.y };
  return members.find((m) => m.id === id)?.position;
}

function perpendicularOffset(a: { x: number; y: number }, b: { x: number; y: number }, mag: number): [{ x: number; y: number }, { x: number; y: number }] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * mag;
  const py = (dx / len) * mag;
  return [
    { x: px, y: py },
    { x: -px, y: -py },
  ];
}

function samePair(r: RelationshipConnection, a: string, b: string) {
  return (r.fromCharacterId === a && r.toCharacterId === b) || (r.fromCharacterId === b && r.toCharacterId === a);
}

// A picture-grid picker — the point of the bigger modal — instead of a bare
// <select> of names, so choosing who a tie is between actually looks like
// choosing people.
function PersonPicker({
  label,
  characters,
  value,
  exclude,
  onPick,
}: {
  label: string;
  characters: { id: string; name: string; profileImageUrl?: string }[];
  value: string;
  exclude: string;
  onPick: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-semibold text-ink-500">{label}</p>
      <div className="scrollbar-thin grid max-h-40 grid-cols-3 gap-1.5 overflow-auto rounded-lg border border-ink-900/10 bg-editor-raised p-2">
        {characters.map((c) => {
          const portrait = getImageUrl(c.profileImageUrl);
          const disabled = c.id === exclude;
          const selected = c.id === value;
          return (
            <button
              key={c.id}
              disabled={disabled}
              onClick={() => onPick(c.id)}
              className={`flex flex-col items-center gap-1 rounded-lg p-1.5 text-center ${
                selected ? "bg-bibliarch-blue/10 ring-2 ring-bibliarch-blue" : disabled ? "opacity-30" : "hover:bg-ink-900/5"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-bibliarch-blue/15 text-[10px] font-semibold text-bibliarch-blue">
                {portrait ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portrait} alt="" className="h-full w-full object-cover" />
                ) : (
                  c.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="w-full truncate text-[10.5px] text-ink-700">{c.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
