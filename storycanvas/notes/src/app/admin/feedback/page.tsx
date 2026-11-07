"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, Bug, Lightbulb, MessageCircle, HelpCircle, Search, Check, RotateCcw, Trash2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGate } from "@/lib/use-admin-gate";
import { fetchAllRows, relativeDay } from "@/lib/admin";
import { Chip, Stat } from "@/components/AdminBits";
import type { Database } from "@/types/supabase";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

const TYPE_ICON = { bug: Bug, feature: Lightbulb, general: MessageCircle, other: HelpCircle } as const;
const TYPE_LABEL: Record<string, string> = { bug: "Bug", feature: "Suggestion", general: "General", other: "Other" };
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  in_progress: "In progress",
  resolved: "Resolved",
  wont_fix: "Won’t fix",
  duplicate: "Duplicate",
};
const STATUSES = Object.keys(STATUS_LABEL);
const OPEN = new Set(["new", "reviewing", "in_progress"]);
const PRIORITIES = ["critical", "high", "medium", "low"] as const;
const PRIORITY_LABEL: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

type View = "open" | "done" | "all";

/** Which part of Bibliarch it was sent from, read from the page address. */
function sourceOf(f: { page_url: string | null; title: string }): string {
  if (/^\[Books\]/.test(f.title)) return "Books";
  try {
    const path = f.page_url ? new URL(f.page_url).pathname : "";
    return path.startsWith("/books") ? "Books" : path === "/" || path === "" ? "Home" : "Notes";
  } catch {
    return "Notes";
  }
}
const isOpen = (f: FeedbackRow) => OPEN.has(f.status ?? "new");

export default function AdminFeedbackPage() {
  const gate = useAdminGate();
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [view, setView] = useState<View>("open");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [source, setSource] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (gate !== "admin") return;
    const supabase = createClient();
    fetchAllRows<FeedbackRow>((from, to) =>
      supabase.from("feedback").select("*").order("created_at", { ascending: false }).order("id").range(from, to),
    )
      .then(setItems)
      .catch((e: Error) => {
        setError(`Couldn’t load feedback: ${e.message}`);
        setItems([]);
      });
  }, [gate]);

  async function patch(id: string, changes: Partial<FeedbackRow>) {
    const before = items;
    setItems((prev) => (prev ?? []).map((f) => (f.id === id ? { ...f, ...changes } : f)));
    setError(null);
    const { data, error } = await createClient()
      .from("feedback")
      .update({ ...changes, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .select("id");
    if (error || !data?.length) {
      setItems(before);
      setError("That change didn’t save. If this keeps happening, run supabase/004_account_delete_and_admin.sql once in Supabase.");
    }
  }

  async function remove(f: FeedbackRow) {
    if (!window.confirm(`Delete “${f.title.replace(/^\[Books\]\s*/, "")}” for good?`)) return;
    const { data, error } = await createClient().from("feedback").delete().eq("id", f.id).select("id");
    if (error || !data?.length) return setError("That feedback couldn’t be deleted.");
    setItems((prev) => (prev ?? []).filter((x) => x.id !== f.id));
  }

  const all = useMemo(() => items ?? [], [items]);
  const inView = useMemo(() => all.filter((f) => view === "all" || isOpen(f) === (view === "open")), [all, view]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inView.filter(
      (f) =>
        (kind === "all" || f.type === kind) &&
        (status === "all" || (f.status ?? "new") === status) &&
        (priority === "all" || (priority === "none" ? !f.priority : f.priority === priority)) &&
        (source === "all" || sourceOf(f) === source) &&
        (!q || `${f.title} ${f.description} ${f.user_email ?? ""} ${f.user_name ?? ""} ${f.admin_notes ?? ""}`.toLowerCase().includes(q)),
    );
  }, [inView, kind, status, priority, source, query]);

  if (gate === "checking" || (gate === "admin" && items === null)) {
    return (
      <div className="admin-center">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div className="admin-center">
        <ShieldAlert size={28} className="admin-danger-ink" />
        <p className="admin-h2">Not available</p>
      </div>
    );
  }

  const openCount = all.filter(isOpen).length;
  const countIn = (pred: (f: FeedbackRow) => boolean) => inView.filter(pred).length;
  const statusesInView = STATUSES.filter((s) => view === "all" || OPEN.has(s) === (view === "open"));

  return (
    <div className="admin-page">
      <Link href="/admin" className="admin-back">
        <ArrowLeft size={14} /> Admin
      </Link>
      <h1 className="admin-title">Feedback</h1>

      <div className="admin-stats">
        <Stat value={openCount} label="Open" tone="warm" />
        <Stat value={all.filter((f) => isOpen(f) && f.type === "bug").length} label="Open bugs" tone="bad" />
        <Stat value={all.filter((f) => isOpen(f) && (f.priority === "critical" || f.priority === "high")).length} label="Open, high priority" tone="bad" />
        <Stat value={all.length - openCount} label="Done" tone="good" />
        <Stat value={all.length} label="All time" />
      </div>
      {error && <p className="admin-note admin-note-bad">{error}</p>}

      <div className="admin-segment" role="tablist" aria-label="Open or done">
        {(["open", "done", "all"] as View[]).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            className={view === v ? "is-on" : ""}
            onClick={() => {
              setView(v);
              setStatus("all");
            }}
          >
            {v === "open" ? `Open · ${openCount}` : v === "done" ? `Done · ${all.length - openCount}` : `All · ${all.length}`}
          </button>
        ))}
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, text, person or notes" />
        </label>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option value="all">Any priority</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
          <option value="none">No priority</option>
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)} aria-label="Sent from">
          <option value="all">Notes, Books & Home</option>
          <option value="Notes">Notes</option>
          <option value="Books">Books</option>
          <option value="Home">Home</option>
        </select>
      </div>

      <div className="admin-chips" role="group" aria-label="Kind">
        {["all", "bug", "feature", "general"].map((t) => (
          <Chip key={t} on={kind === t} onClick={() => setKind(t)} label={t === "all" ? "All kinds" : TYPE_LABEL[t] ?? t} n={countIn((f) => t === "all" || f.type === t)} />
        ))}
      </div>
      <div className="admin-chips" role="group" aria-label="Status">
        <Chip on={status === "all"} onClick={() => setStatus("all")} label="Any status" />
        {statusesInView.map((s) => (
          <Chip key={s} on={status === s} onClick={() => setStatus(s)} label={STATUS_LABEL[s] ?? s} n={countIn((f) => (f.status ?? "new") === s)} />
        ))}
      </div>

      <p className="admin-count">{visible.length} shown</p>
      <div className="admin-feed">
        {visible.map((f) => {
          const Icon = TYPE_ICON[(f.type as keyof typeof TYPE_ICON) ?? "general"] ?? MessageCircle;
          const st = f.status ?? "new";
          const expanded = openId === f.id;
          return (
            <article key={f.id} className={`admin-item ${isOpen(f) ? "" : "is-done"} ${expanded ? "is-expanded" : ""}`}>
              <div className="admin-item-head">
                <Icon size={16} className={`admin-type-icon type-${f.type}`} aria-hidden="true" />
                <div className="admin-item-main">
                  <div className="admin-tags">
                    <span className={`admin-pill type-${f.type}`}>{TYPE_LABEL[f.type] ?? f.type}</span>
                    <span className={`admin-pill status-${st}`}>{STATUS_LABEL[st] ?? st}</span>
                    {f.priority && <span className={`admin-pill prio-${f.priority}`}>{PRIORITY_LABEL[f.priority] ?? f.priority}</span>}
                    <span className="admin-pill">{sourceOf(f)}</span>
                    {f.admin_notes && <span className="admin-pill admin-pill-accent">Has notes</span>}
                  </div>
                  <button className="admin-item-title" onClick={() => setOpenId(expanded ? null : f.id)} aria-expanded={expanded}>
                    {f.title.replace(/^\[Books\]\s*/, "")}
                    <ChevronDown size={14} className="admin-chevron" />
                  </button>
                  <p className={`admin-item-text ${expanded ? "" : "is-clamped"}`}>{f.description}</p>
                  <p className="admin-item-meta">
                    {f.user_name ?? f.user_email ?? "Anonymous"} · {relativeDay(f.created_at)} ({new Date(f.created_at).toLocaleString()})
                  </p>
                </div>
                <div className="admin-item-actions">
                  {isOpen(f) ? (
                    <button className="admin-btn admin-btn-good" onClick={() => patch(f.id, { status: "resolved" })} title="Mark as done">
                      <Check size={14} /> Done
                    </button>
                  ) : (
                    <button className="admin-btn" onClick={() => patch(f.id, { status: "new" })} title="Move back to open">
                      <RotateCcw size={14} /> Reopen
                    </button>
                  )}
                  <select value={st} onChange={(e) => patch(f.id, { status: e.target.value })} aria-label="Status">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <select value={f.priority ?? ""} onChange={(e) => patch(f.id, { priority: e.target.value || null })} aria-label="Priority">
                    <option value="">No priority</option>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {expanded && <Details f={f} onSaveNotes={(admin_notes) => patch(f.id, { admin_notes })} onDelete={() => remove(f)} />}
            </article>
          );
        })}
        {visible.length === 0 && <p className="admin-empty">{view === "open" ? "Nothing open. Nice." : "Nothing here."}</p>}
      </div>
    </div>
  );
}

function Details({ f, onSaveNotes, onDelete }: { f: FeedbackRow; onSaveNotes: (notes: string) => void; onDelete: () => void }) {
  const [notes, setNotes] = useState(f.admin_notes ?? "");
  let path = "";
  try {
    path = f.page_url ? new URL(f.page_url).pathname : "";
  } catch {
    path = f.page_url ?? "";
  }
  return (
    <div className="admin-details">
      <dl>
        {f.user_email && (
          <div>
            <dt>Email</dt>
            <dd>{f.user_email}</dd>
          </div>
        )}
        {f.user_name && (
          <div>
            <dt>Name</dt>
            <dd>{f.user_name}</dd>
          </div>
        )}
        {path && (
          <div>
            <dt>Page</dt>
            <dd>{path}</dd>
          </div>
        )}
        {f.screen_size && (
          <div>
            <dt>Screen</dt>
            <dd>{f.screen_size}</dd>
          </div>
        )}
        {f.browser_info && (
          <div>
            <dt>Browser</dt>
            <dd className="admin-wrap">{f.browser_info}</dd>
          </div>
        )}
        {f.updated_at && f.updated_at !== f.created_at && (
          <div>
            <dt>Last changed</dt>
            <dd>{new Date(f.updated_at).toLocaleString()}</dd>
          </div>
        )}
      </dl>
      <label className="admin-notes">
        Your notes (only admins see these)
        <textarea value={notes} rows={3} onChange={(e) => setNotes(e.target.value)} placeholder="What you found, what you fixed…" />
      </label>
      <div className="admin-details-row">
        <button className="admin-btn admin-btn-danger" onClick={onDelete}>
          <Trash2 size={14} /> Delete
        </button>
        <button className="admin-btn admin-btn-primary" disabled={notes === (f.admin_notes ?? "")} onClick={() => onSaveNotes(notes)}>
          Save notes
        </button>
      </div>
    </div>
  );
}
