"use client";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

/** The feedback button that sits beside Appearance in the site header (same place as on Home and Books). */
export default function HeaderFeedback() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="site-feedback-button" aria-label="Send feedback" title="Send feedback" onClick={() => setOpen(true)}>
        <MessageSquare size={16} aria-hidden="true" />
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
