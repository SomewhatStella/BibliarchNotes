"use client";

import { useEffect, useRef, useState } from "react";
import { X, Bug, Lightbulb, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEscape } from "@/lib/use-escape";

/*
 * Send feedback, tagged as a bug, a suggestion or general feedback: the same dialog as
 * Home and Books (styles in app/feedback.css). Stored as the feedback table's
 * bug / feature / general types, which the admin Feedback page filters by.
 */
const TYPES = [
  { value: "bug", label: "Bug", icon: Bug, hint: "Something is broken or not working right", summary: "What went wrong?", example: "e.g. My character card disappeared after I reloaded", more: "What were you doing when it happened?" },
  { value: "feature", label: "Suggestion", icon: Lightbulb, hint: "An idea or something you wish it did", summary: "What would you like?", example: "e.g. Let me colour-code relationships", more: "How would it help you?" },
  { value: "general", label: "General feedback", icon: MessageCircle, hint: "Anything else you want to tell us", summary: "What's on your mind?", example: "e.g. The timeline is really useful", more: "" },
] as const;
type Kind = (typeof TYPES)[number]["value"];

export default function FeedbackModal({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const [type, setType] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const kind = TYPES.find((t) => t.value === type)!;

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  async function submit() {
    if (!title.trim()) {
      setError("Write a short summary first.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const { data: profile } = auth.user
        ? await supabase.from("profiles").select("username, email").eq("id", auth.user.id).single()
        : { data: null };
      const details = [description.trim(), steps.trim() && kind.more && `${kind.more}\n${steps.trim()}`].filter(Boolean).join("\n\n") || title.trim();
      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: auth.user?.id ?? null,
        user_email: profile?.email ?? auth.user?.email ?? null,
        user_name: profile?.username ?? null,
        type,
        title: title.trim().slice(0, 200),
        description: details.slice(0, 10000),
        page_url: window.location.href,
        browser_info: navigator.userAgent,
        screen_size: `${window.screen.width}x${window.screen.height}`,
      });
      if (insertError) throw insertError;
      setSent(true);
    } catch {
      setError("Your message couldn't be sent right now. Please try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  const close = () => {
    ref.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      className="feedback-dialog"
      aria-label="Send feedback"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="fb-head">
        <h2>Send feedback</h2>
        <button type="button" className="fb-close" aria-label="Close" onClick={close}><X size={16} /></button>
      </div>
      {sent ? (
        <div className="fb-sent">
          <span className="fb-sent-icon" aria-hidden="true">✓</span>
          <p><strong>Thank you!</strong> We read every message.</p>
          <div className="fb-actions"><button type="button" className="fb-primary" onClick={close}>Done</button></div>
        </div>
      ) : (
        <form className="fb-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="fb-types" role="radiogroup" aria-label="Kind of feedback">
            {TYPES.map((t) => (
              <button key={t.value} type="button" role="radio" aria-checked={type === t.value} className={type === t.value ? "on" : ""} onClick={() => { setType(t.value); setError(null); }}>
                <t.icon size={18} aria-hidden="true" />
                <strong>{t.label}</strong>
                <small>{t.hint}</small>
              </button>
            ))}
          </div>
          <label><span className="fb-label">{kind.summary}</span><input maxLength={180} value={title} placeholder={kind.example} onChange={(e) => setTitle(e.target.value)} /></label>
          <label><span className="fb-label">Tell us more <span className="fb-optional">(optional)</span></span><textarea rows={4} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          {kind.more && <label><span className="fb-label">{kind.more} <span className="fb-optional">(optional)</span></span><textarea rows={2} maxLength={5000} value={steps} onChange={(e) => setSteps(e.target.value)} /></label>}
          <p className="fb-note">Only what you type here is sent, never your books or notes.</p>
          {error && <p role="alert" className="fb-error">{error}</p>}
          <div className="fb-actions">
            <button type="button" className="fb-cancel" onClick={close}>Cancel</button>
            <button className="fb-primary" disabled={sending || !title.trim()}>{sending ? "Sending…" : "Send"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
