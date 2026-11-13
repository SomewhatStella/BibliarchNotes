"use client";

import { useEffect, useState } from "react";
import { X, Search, UserPlus, Eye, Edit3, Trash2, LogOut, Link as LinkIcon, Copy, Check, Clock, Crown, Globe } from "lucide-react";
import { getPublicLink, publicUrl, turnOffPublicLink, turnOnPublicLink } from "@/lib/public-links";
import * as collab from "@/lib/collaboration";
import type { Collaborator, ShareToken } from "@/lib/collaboration";
import { useEscape } from "@/lib/use-escape";

export default function ShareDialog({
  storyId,
  storyTitle,
  isOwner,
  onClose,
  onCollaboratorsChanged,
  onLeave,
}: {
  storyId: string;
  storyTitle: string;
  isOwner: boolean;
  onClose: () => void;
  onCollaboratorsChanged?: () => void;
  onLeave?: () => void;
}) {
  useEscape(onClose);
  const [collaborators, setCollaborators] = useState<Collaborator[] | null>(null);
  const [tokens, setTokens] = useState<ShareToken[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; username: string | null; email: string | null }[]>([]);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  // Public view link: undefined = loading, null = off, "unavailable" = the database update isn't in yet.
  const [publicToken, setPublicToken] = useState<string | null | undefined | "unavailable">(undefined);
  const [publicBusy, setPublicBusy] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);

  async function refreshCollaborators() {
    try {
      setCollaborators(await collab.getCollaborators(storyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load collaborators");
    }
  }
  async function refreshTokens() {
    if (!isOwner) return;
    try {
      setTokens(await collab.getShareTokens(storyId));
    } catch {
      /* non-fatal — share links are a convenience, not required */
    }
  }
  useEffect(() => {
    if (!isOwner) return;
    getPublicLink(storyId).then(setPublicToken, () => setPublicToken("unavailable"));
  }, [storyId, isOwner]);

  async function togglePublic() {
    setPublicBusy(true);
    try {
      if (publicToken && publicToken !== "unavailable") {
        await turnOffPublicLink(storyId);
        setPublicToken(null);
        setSuccess("Public link turned off. The old link no longer works.");
      } else {
        const token = await turnOnPublicLink(storyId);
        setPublicToken(token);
        copyPublic(token);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the public link");
    } finally {
      setPublicBusy(false);
    }
  }

  function copyPublic(token: string) {
    navigator.clipboard.writeText(publicUrl(token)).then(
      () => {
        setPublicCopied(true);
        setTimeout(() => setPublicCopied(false), 1800);
      },
      () => {},
    );
  }

  useEffect(() => {
    refreshCollaborators();
    refreshTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(null), 3000);
    return () => clearTimeout(t);
  }, [success]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      try {
        setResults(await collab.searchUsers(query));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const acceptedCount = (collaborators ?? []).filter((c) => c.accepted_at).length;
  const canInviteMore = acceptedCount < collab.MAX_COLLABORATORS;

  async function handleInvite(userId: string, label: string) {
    if (!canInviteMore) {
      setError(`Maximum ${collab.MAX_COLLABORATORS} collaborators allowed`);
      return;
    }
    try {
      await collab.inviteUser(storyId, userId, role);
      setSuccess(`Invited ${label}`);
      setQuery("");
      setResults([]);
      refreshCollaborators();
      onCollaboratorsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to invite");
    }
  }

  async function handleRemove(c: Collaborator) {
    if (!confirm("Remove this collaborator? They will lose access to this project.")) return;
    try {
      await collab.removeCollaborator(c.id);
      refreshCollaborators();
      onCollaboratorsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  }

  async function handleRoleChange(c: Collaborator, newRole: "editor" | "viewer") {
    try {
      await collab.updateCollaboratorRole(c.id, newRole);
      refreshCollaborators();
      onCollaboratorsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    }
  }

  async function handleTransfer(c: Collaborator) {
    const name = c.profile?.username ?? c.profile?.email ?? "this person";
    if (!confirm(`Make ${name} the owner of "${storyTitle}"?

They'll be able to share it, change who has access and delete it. You'll stay on as an editor.`)) return;
    try {
      await collab.transferOwnership(storyId, c.user_id);
      setSuccess(`${name} now owns this story. You're an editor.`);
      // Your own access just changed; reload so the board reflects it.
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't transfer ownership");
    }
  }

  async function handleLeave() {
    if (!confirm("Leave this project? You'll lose access unless invited again.")) return;
    try {
      await collab.leaveCollaboration(storyId);
      onLeave?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to leave");
    }
  }

  async function handleCreateLink() {
    try {
      const t = await collab.createShareToken(storyId, role);
      setTokens((prev) => [t, ...(prev ?? [])]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create link");
    }
  }

  async function handleDeleteLink(id: string) {
    try {
      await collab.deleteShareToken(id);
      setTokens((prev) => (prev ?? []).filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete link");
    }
  }

  function copyLink(token: ShareToken) {
    const url = `${window.location.origin}/notes/join/${token.token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedTokenId(token.id);
      setTimeout(() => setCopiedTokenId(null), 1500);
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/20" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="pop-in emboss flex max-h-[85vh] w-[420px] flex-col rounded-2xl">
        <div className="flex items-center justify-between border-b border-ink-900/8 px-5 py-4">
          <div>
            <p className="font-display text-[16px] font-semibold text-ink-900">Share &ldquo;{storyTitle}&rdquo;</p>
            <p className="text-[12px] text-ink-500">
              {acceptedCount}/{collab.MAX_COLLABORATORS} collaborators
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5">
            <X size={16} />
          </button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-auto px-5 py-4">
          {(error || success) && (
            <p className={`mb-3 rounded-lg px-3 py-2 text-[12.5px] ${error ? "bg-bibliarch-rose/8 text-bibliarch-rose" : "bg-bibliarch-blue/8 text-bibliarch-blue"}`}>
              {error || success}
            </p>
          )}

          {isOwner && publicToken !== "unavailable" && (
            <div className="public-link mb-5 rounded-xl p-3">
              <div className="flex items-start gap-2.5">
                <Globe size={16} className="mt-0.5 flex-none text-bibliarch-blue" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink-900">Public view link</p>
                  <p className="text-[11.5px] leading-snug text-ink-500">
                    {publicToken
                      ? "Anyone with this link can look around this story. They can't change anything, and they don't need an account."
                      : "Show this story to anyone (on TikTok, Discord, anywhere) without them signing up. They can look but not change anything."}
                  </p>
                </div>
              </div>
              {publicToken && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-editor-raised px-2.5 py-1.5 text-[12px]">
                  <span className="flex-1 truncate font-mono text-ink-700">{publicUrl(publicToken).replace(/^https?:\/\//, "")}</span>
                  <button onClick={() => copyPublic(publicToken)} className="flex flex-none items-center gap-1 font-semibold text-bibliarch-blue">
                    {publicCopied ? <Check size={13} /> : <Copy size={13} />} {publicCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
              <button
                onClick={togglePublic}
                disabled={publicBusy || publicToken === undefined}
                className={`mt-2 w-full rounded-lg py-1.5 text-[12.5px] font-semibold disabled:opacity-50 ${publicToken ? "bg-ink-900/5 text-ink-700" : "bg-bibliarch-blue text-white"}`}
              >
                {publicBusy ? "One moment…" : publicToken ? "Turn off public link" : "Turn on and copy link"}
              </button>
            </div>
          )}

          {isOwner && (
            <div className="mb-5">
              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Invite by username or email</p>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search…"
                  className="w-full rounded-lg border border-ink-900/12 bg-editor-raised py-1.5 pl-8 pr-2 text-[13px] outline-none focus:border-bibliarch-blue"
                />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <button onClick={() => setRole("editor")} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] ${role === "editor" ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}>
                  <Edit3 size={11} /> Editor
                </button>
                <button onClick={() => setRole("viewer")} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] ${role === "viewer" ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700"}`}>
                  <Eye size={11} /> Viewer
                </button>
              </div>
              {results.length > 0 && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleInvite(r.id, r.username ?? r.email ?? "user")}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-ink-900/5"
                    >
                      <UserPlus size={13} className="text-bibliarch-blue" />
                      <span className="flex-1 truncate">{r.username ?? r.email}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <div className="mb-5">
              <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">Or share a link</p>
              <button onClick={handleCreateLink} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-ink-900/5 py-1.5 text-[12.5px] font-semibold text-ink-700">
                <LinkIcon size={13} /> New {role} link
              </button>
              {(tokens ?? []).map((t) => (
                <div key={t.id} className="mt-1.5 flex items-center gap-2 rounded-lg bg-ink-900/3 px-2.5 py-1.5 text-[12px]">
                  <span className="flex-1 truncate font-mono text-ink-700">…/join/{t.token}</span>
                  <span className="flex-none text-ink-500">{t.role}</span>
                  <button onClick={() => copyLink(t)} className="flex-none text-ink-500 hover:text-bibliarch-blue">
                    {copiedTokenId === t.id ? <Check size={13} className="text-bibliarch-blue" /> : <Copy size={13} />}
                  </button>
                  <button onClick={() => handleDeleteLink(t.id)} className="flex-none text-ink-500 hover:text-bibliarch-rose">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">People with access</p>
            <div className="flex flex-col gap-1.5">
              {collaborators?.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-ink-900/3 px-2.5 py-2">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-bibliarch-blue/15 text-[10.5px] font-semibold text-bibliarch-blue">
                    {(c.profile?.username ?? c.profile?.email ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink-900">{c.profile?.username ?? c.profile?.email}</p>
                    <p className="flex items-center gap-1 text-[11px] text-ink-500">
                      {c.accepted_at ? (
                        c.role
                      ) : (
                        <>
                          <Clock size={10} /> pending
                        </>
                      )}
                    </p>
                  </div>
                  {isOwner && (
                    <>
                      <select
                        value={c.role}
                        onChange={(e) => handleRoleChange(c, e.target.value as "editor" | "viewer")}
                        className="rounded-md border border-ink-900/12 bg-editor-raised px-1.5 py-1 text-[11px]"
                      >
                        <option value="editor">editor</option>
                        <option value="viewer">viewer</option>
                      </select>
                      {c.accepted_at && (
                        <button onClick={() => handleTransfer(c)} title="Make owner" aria-label={`Make ${c.profile?.username ?? c.profile?.email ?? "them"} the owner`} className="flex-none text-ink-500 hover:text-gold-600">
                          <Crown size={13} />
                        </button>
                      )}
                      <button onClick={() => handleRemove(c)} className="flex-none text-ink-500 hover:text-bibliarch-rose">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {collaborators?.length === 0 && <p className="text-[12.5px] text-ink-500">No one else has access yet.</p>}
            </div>
          </div>
        </div>

        {!isOwner && (
          <div className="border-t border-ink-900/8 px-5 py-3">
            <button onClick={handleLeave} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-bibliarch-rose/8 py-2 text-[12.5px] font-semibold text-bibliarch-rose">
              <LogOut size={13} /> Leave this project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
