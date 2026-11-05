"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, Bug, Lightbulb, MessageCircle, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGate } from "@/lib/use-admin-gate";
import type { Database } from "@/types/supabase";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

const TYPE_ICON = { bug: Bug, feature: Lightbulb, general: MessageCircle, other: HelpCircle } as const;
const TYPE_LABEL: Record<string, string> = { bug: "Bug", feature: "Suggestion", general: "General feedback", other: "Other" };
const TYPE_TINT: Record<string, string> = { bug: "bg-bibliarch-rose/15 text-bibliarch-rose", feature: "bg-amber-500/15 text-amber-700", general: "bg-bibliarch-blue/12 text-bibliarch-blue", other: "bg-ink-900/8 text-ink-700" };
/** Which part of Bibliarch it was sent from, read from the page address. */
function sourceOf(f: { page_url: string | null; title: string }): string {
  if (/^\[Books\]/.test(f.title)) return "Books";
  try {
    const path = f.page_url ? new URL(f.page_url).pathname : "";
    return path.startsWith("/books") ? "Books" : path === "/" || path === "" ? "Home" : "Notes";
  } catch { return "Notes"; }
}
const STATUSES = ["new", "reviewing", "in_progress", "resolved", "wont_fix", "duplicate"];

export default function AdminFeedbackPage() {
  const gate = useAdminGate();
  const [items, setItems] = useState<FeedbackRow[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");

  async function refresh() {
    const { data } = await createClient().from("feedback").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => {
    if (gate === "admin") refresh();
  }, [gate]);

  async function setStatus(id: string, status: string) {
    await createClient().from("feedback").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => (prev ?? []).map((f) => (f.id === id ? { ...f, status } : f)));
  }

  if (gate === "checking" || (gate === "admin" && items === null)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={22} className="animate-spin text-ink-500" />
      </div>
    );
  }
  if (gate === "denied") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <ShieldAlert size={28} className="text-bibliarch-rose" />
        <p className="font-display text-[16px] font-semibold text-ink-900">Not available</p>
      </div>
    );
  }

  const visible = (items ?? []).filter((f) => (filter === "all" || f.status === filter) && (kind === "all" || f.type === kind));
  const countOf = (t: string) => (items ?? []).filter((f) => (filter === "all" || f.status === filter) && (t === "all" || f.type === t)).length;

  return (
    <main className="min-h-screen bg-parchment-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900">
          <ArrowLeft size={14} /> Admin
        </Link>
        <h1 className="mb-4 font-display text-2xl font-semibold text-ink-900">Feedback</h1>

        <div className="mb-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by kind">
          <span className="mr-1 text-[11.5px] font-semibold text-ink-500">Kind</span>
          {["all", "bug", "feature", "general"].map((t) => (
            <button
              key={t}
              onClick={() => setKind(t)}
              aria-pressed={kind === t}
              className={`rounded-full px-3 py-1 text-[11.5px] ${kind === t ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}
            >
              {t === "all" ? "All" : TYPE_LABEL[t]} <span className="opacity-70">{countOf(t)}</span>
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
          <span className="mr-1 text-[11.5px] font-semibold text-ink-500">Status</span>
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-[11.5px] ${filter === s ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {visible.map((f) => {
            const Icon = TYPE_ICON[(f.type as keyof typeof TYPE_ICON) ?? "general"] ?? MessageCircle;
            return (
              <div key={f.id} className="emboss rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Icon size={15} className="mt-0.5 flex-none text-bibliarch-blue" />
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TYPE_TINT[f.type ?? "general"] ?? TYPE_TINT.other}`}>{TYPE_LABEL[f.type ?? "general"] ?? f.type}</span>
                        <span className="rounded-full bg-ink-900/5 px-2 py-0.5 text-[10.5px] text-ink-700">{sourceOf(f)}</span>
                      </div>
                      <p className="font-semibold text-[13.5px] text-ink-900">{f.title.replace(/^\[Books\]\s*/, "")}</p>
                      <p className="mt-0.5 text-[12.5px] text-ink-700">{f.description}</p>
                      <p className="mt-1.5 text-[11px] text-ink-500">
                        {f.user_name ?? f.user_email ?? "anonymous"} · {new Date(f.created_at).toLocaleString()}
                        {f.page_url ? ` · ${new URL(f.page_url).pathname}` : ""}
                      </p>
                    </div>
                  </div>
                  <select
                    value={f.status ?? "new"}
                    onChange={(e) => setStatus(f.id, e.target.value)}
                    className="flex-none rounded-md border border-ink-900/12 bg-white px-2 py-1 text-[11.5px]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
          {visible.length === 0 && <p className="text-[13px] text-ink-500">Nothing here.</p>}
        </div>
      </div>
    </main>
  );
}
