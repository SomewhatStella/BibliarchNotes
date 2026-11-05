"use client";
import OverviewNavigation from "./OverviewNavigation";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, Plus, LogOut, Shield, Mail, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";
import { getMyInvitations, acceptInvitation, declineInvitation, type MyInvitation } from "@/lib/collaboration";
import type { Story } from "@/lib/types";

export default function Dashboard({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  async function refresh() {
    const supabase = createClient();
    // RLS returns owned stories + anything shared with this user — no
    // explicit .eq('user_id', ...) filter needed or wanted.
    const { data, error } = await supabase.from("stories").select("*").order("updated_at", { ascending: false });
    if (error) {
      setError(error.message);
      return;
    }
    setStories(data ?? []);
  }

  async function refreshInvitations() {
    try {
      setInvitations(await getMyInvitations());
    } catch {
      /* non-fatal */
    }
  }

  useEffect(() => {
    refresh();
    refreshInvitations();
    createClient()
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept(inv: MyInvitation) {
    try {
      await acceptInvitation(inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't accept invitation");
    }
  }
  async function handleDecline(inv: MyInvitation) {
    try {
      await declineInvitation(inv.id);
      setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't decline invitation");
    }
  }

  async function createStory() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stories")
      .insert({ title: trimmed, bio: "", user_id: userId })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/story/${data.id}`);
  }

  async function deleteStory(id: string) {
    if (!confirm("Delete this story? This can't be undone.")) return;
    const supabase = createClient();
    await supabase.from("stories").delete().eq("id", id);
    setStories((prev) => prev?.filter((s) => s.id !== id) ?? null);
  }

  return (
    <div className="notes-overview-shell">
    <OverviewNavigation />
    <main className="min-h-0 flex-1 overflow-y-auto px-6 py-10 md:px-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">bibliarch · notes</p>
            <h1 className="mt-1 font-display text-4xl font-semibold text-ink-900">
              {username}&rsquo;s stories
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-ink-500 hover:bg-ink-900/5">
                <Shield size={14} /> Admin
              </Link>
            )}
            <form action={signOut}>
              <button className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-ink-500 hover:bg-ink-900/5">
                <LogOut size={14} /> Log out
              </button>
            </form>
          </div>
        </header>

        {error && <p className="mb-6 text-[14px] text-bibliarch-rose">{error}</p>}

        {invitations.length > 0 && (
          <div className="mb-8 flex flex-col gap-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="emboss flex items-center gap-3 rounded-xl px-4 py-3">
                <Mail size={16} className="flex-none text-bibliarch-blue" />
                <p className="flex-1 text-[13px] text-ink-700">
                  <span className="font-semibold text-ink-900">{inv.inviter?.username ?? inv.inviter?.email ?? "Someone"}</span> invited you
                  to <span className="font-semibold text-ink-900">{inv.story.title}</span> as {inv.role}
                </p>
                <button onClick={() => handleAccept(inv)} className="flex items-center gap-1 rounded-full bg-bibliarch-blue px-3 py-1 text-[12px] font-semibold text-white">
                  <Check size={12} /> Accept
                </button>
                <button onClick={() => handleDecline(inv)} className="flex items-center gap-1 rounded-full bg-ink-900/5 px-3 py-1 text-[12px] text-ink-700">
                  <X size={12} /> Decline
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories?.map((s) => (
            <div key={s.id} className="emboss group relative flex flex-col gap-3 rounded-2xl p-5 text-left">
              <button onClick={() => router.push(`/story/${s.id}`)} className="flex flex-col gap-3 text-left">
                <div className="flex h-24 items-center justify-center rounded-xl bg-bibliarch-blue/8">
                  <BookOpen size={28} className="text-bibliarch-blue/50" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-ink-900">{s.title}</h2>
                  <p className="mt-0.5 text-[12.5px] text-ink-500">
                    Edited {new Date(s.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
              <button
                onClick={() => deleteStory(s.id)}
                className="absolute right-3 top-3 rounded-full bg-white/80 px-2 py-1 text-[11px] text-ink-500 opacity-0 hover:bg-bibliarch-rose/15 hover:text-bibliarch-rose group-hover:opacity-100"
              >
                Delete
              </button>
            </div>
          ))}

          {creating ? (
            <div className="emboss flex flex-col gap-3 rounded-2xl p-5">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createStory()}
                placeholder="Story title…"
                className="rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-[15px] outline-none focus:border-bibliarch-blue"
              />
              <div className="flex gap-2">
                <button onClick={createStory} className="flex-1 rounded-lg bg-bibliarch-blue px-3 py-2 text-[13px] font-semibold text-white">
                  Create
                </button>
                <button onClick={() => setCreating(false)} className="rounded-lg px-3 py-2 text-[13px] text-ink-500">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold-500/40 text-ink-500 hover:border-gold-500 hover:text-ink-900"
            >
              <Plus size={22} />
              <span className="text-[13.5px] font-semibold">New story</span>
            </button>
          )}
        </div>

        {stories?.length === 0 && !creating && (
          <p className="mt-6 text-[14px] text-ink-500">No stories yet — create your first one.</p>
        )}
      </div>
    </main>
    </div>
  );
}
