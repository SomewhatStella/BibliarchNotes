"use client";
import OverviewNavigation from "./OverviewNavigation";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookOpen, LayoutTemplate, Square, Sparkles, Plus, LogOut, Shield, Mail, Check, X, Settings, Trash2, LogOut as LeaveIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { storyTemplates } from "@/lib/story-templates";
import { tidyTemplateNodes } from "@/lib/board-templates";
import { signOut } from "@/lib/auth/actions";
import { getMyInvitations, acceptInvitation, declineInvitation, leaveCollaboration, type MyInvitation } from "@/lib/collaboration";
import type { Story } from "@/lib/types";

export default function Dashboard({ userId, username }: { userId: string; username: string }) {
  const router = useRouter();
  const [stories, setStories] = useState<Story[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  // The story planner by default: new writers who started blank mostly left with an empty board.
  const [templateId, setTemplateId] = useState("basic");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  // The story waiting on "are you sure?" — a real dialog, not a hover-only link nobody found.
  const [confirmDelete, setConfirmDelete] = useState<Story | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function createStory(opts?: { title?: string; templateId?: string }) {
    if (starting) return;
    // A title is optional; an empty one used to make the Create button silently do nothing.
    const trimmed = (opts?.title ?? title).trim() || (stories?.length ? "Untitled story" : "My first story");
    const chosen = opts?.templateId ?? templateId;
    setStarting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("stories")
      .insert({ title: trimmed, bio: "", user_id: userId })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setStarting(false);
      return;
    }
    // Same as storycanvas: a template's boards are written before the story opens.
    const template = storyTemplates.find((t) => t.id === chosen);
    if (template && template.nodes.length) {
      const rows = [
        // Tidied for the new Notes card sizes, and without linking arrows.
        { story_id: data.id, canvas_type: "main", nodes: tidyTemplateNodes(template.nodes), connections: [] },
        ...Object.entries(template.subCanvases ?? {}).map(([canvas_type, c]) => ({ story_id: data.id, canvas_type, nodes: tidyTemplateNodes(c.nodes), connections: [] })),
      ];
      const { error: tplError } = await supabase.from("canvas_data").upsert(rows as never, { onConflict: "story_id,canvas_type" });
      if (tplError) setError("The story was made, but its template couldn't be added. You can still use it as a blank story.");
    }
    router.push(`/story/${data.id}`);
  }

  async function deleteStory(story: Story) {
    setDeleting(true);
    try {
      if (story.user_id === userId) {
        // .select() so a delete RLS quietly refused shows as an error instead of a story that comes back on refresh.
        const { data, error } = await createClient().from("stories").delete().eq("id", story.id).select("id");
        if (error) throw error;
        if (!data?.length) throw new Error("The database refused to delete this story.");
      } else {
        // Only the owner can delete a shared story; for everyone else this removes it from their list.
        await leaveCollaboration(story.id);
      }
      setStories((prev) => prev?.filter((s) => s.id !== story.id) ?? null);
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that story");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
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
            <Link href="/settings" className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] text-ink-500 hover:bg-ink-900/5">
              <Settings size={14} /> Settings
            </Link>
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

        {stories?.length === 0 && !creating && (
          <section className="welcome-panel emboss mb-8 rounded-2xl p-6 md:p-8" aria-labelledby="welcome-title">
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
              <Sparkles size={13} /> Welcome
            </p>
            <h2 id="welcome-title" className="mt-1 font-display text-2xl font-semibold text-ink-900">
              Let&rsquo;s start your first story
            </h2>
            <p className="mt-1 max-w-xl text-[14px] text-ink-500">
              Pick how you&rsquo;d like to begin. It opens straight away, and you can change everything later.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button type="button" disabled={starting} onClick={() => createStory({ templateId: "basic" })} className="welcome-choice is-recommended">
                <span className="welcome-badge">Recommended</span>
                <LayoutTemplate size={22} />
                <strong>Story planner</strong>
                <span>Ready-made folders for your characters, plot and world, a story-development checklist and a plot timeline. Just fill in the blanks.</span>
              </button>
              <button type="button" disabled={starting} onClick={() => createStory({ templateId: "blank" })} className="welcome-choice">
                <Square size={22} />
                <strong>Blank board</strong>
                <span>An empty board with every tool. For when you already know how you want to lay things out.</span>
              </button>
            </div>
            {starting && <p className="mt-3 text-[13px] text-ink-500">Opening your story…</p>}
          </section>
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
              {/* Always visible (the old hover-only link didn't exist on phones and was easy to miss on desktop). */}
              <button
                onClick={() => setConfirmDelete(s)}
                title={s.user_id === userId ? "Delete story" : "Leave this shared story"}
                aria-label={s.user_id === userId ? `Delete ${s.title}` : `Leave ${s.title}`}
                className="story-card-action absolute right-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold shadow-card"
              >
                {s.user_id === userId ? <Trash2 size={12} /> : <LeaveIcon size={12} />}
                {s.user_id === userId ? "Delete" : "Leave"}
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
                placeholder="Story title (you can leave this blank)"
                className="rounded-lg border border-ink-900/10 bg-white px-3 py-2 text-[15px] outline-none focus:border-bibliarch-blue"
              />
              <div role="radiogroup" aria-label="Start from" className="flex flex-col gap-1.5">
                {[...storyTemplates].sort((a, b) => Number(b.id === "basic") - Number(a.id === "basic")).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={templateId === t.id}
                    onClick={() => setTemplateId(t.id)}
                    className={`rounded-lg border px-3 py-2 text-left ${templateId === t.id ? "border-bibliarch-blue bg-bibliarch-blue/8" : "border-ink-900/10 hover:border-ink-900/25"}`}
                  >
                    <span className="block text-[13px] font-semibold text-ink-900">{t.id === "blank" ? "Blank board" : "Story planner (recommended)"}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-500">{t.id === "blank" ? "Start from nothing" : "Ready-made folders for characters, plot and world, a story-development list and a plot timeline"}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => createStory()} disabled={starting} className="flex-1 rounded-lg bg-bibliarch-blue px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                  {starting ? "Opening…" : "Create"}
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


        {confirmDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/15" onClick={() => !deleting && setConfirmDelete(null)}>
            <div role="alertdialog" aria-label="Confirm delete" onClick={(e) => e.stopPropagation()} className="pop-in emboss w-80 rounded-2xl p-5">
              {confirmDelete.user_id === userId ? (
                <>
                  <p className="font-display text-[16px] font-semibold text-ink-900">Delete &ldquo;{confirmDelete.title}&rdquo;?</p>
                  <p className="mt-1.5 text-[12.5px] text-ink-500">
                    Every board in it is deleted, for you and for anyone you shared it with. This can&rsquo;t be undone.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-[16px] font-semibold text-ink-900">Leave &ldquo;{confirmDelete.title}&rdquo;?</p>
                  <p className="mt-1.5 text-[12.5px] text-ink-500">It&rsquo;s shared with you, so only its owner can delete it. Leaving removes it from your stories.</p>
                </>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  disabled={deleting}
                  onClick={() => deleteStory(confirmDelete)}
                  className="flex-1 rounded-lg bg-bibliarch-rose px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  {deleting ? "Working…" : confirmDelete.user_id === userId ? "Delete story" : "Leave story"}
                </button>
                <button disabled={deleting} onClick={() => setConfirmDelete(null)} className="rounded-lg px-3 py-2 text-[13px] text-ink-500">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
