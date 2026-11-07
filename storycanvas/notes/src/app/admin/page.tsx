"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, MessageSquare, Loader2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGate } from "@/lib/use-admin-gate";

export default function AdminPage() {
  const gate = useAdminGate();
  const [users, setUsers] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (gate !== "admin") return;
    const supabase = createClient();
    supabase.from("profiles").select("*", { count: "exact", head: true }).then(({ count }) => setUsers(count ?? null));
    supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .in("status", ["new", "reviewing", "in_progress"])
      .then(({ count }) => setOpen(count ?? null));
  }, [gate]);

  if (gate === "checking") {
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
        <Link href="/dashboard" className="admin-back">
          Back to your stories
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Link href="/dashboard" className="admin-back">
        <ArrowLeft size={14} /> Your stories
      </Link>
      <h1 className="admin-title">Admin</h1>
      <div className="admin-home-grid">
        <Link href="/admin/users" className="admin-home-card">
          <Users size={22} />
          <span className="admin-home-value">{users === null ? "…" : users.toLocaleString()}</span>
          <span className="admin-h2">Users</span>
          <span className="admin-muted">Everyone who signed up, who’s active, and your markings</span>
        </Link>
        <Link href="/admin/feedback" className="admin-home-card">
          <MessageSquare size={22} />
          <span className="admin-home-value">{open === null ? "…" : `${open.toLocaleString()} open`}</span>
          <span className="admin-h2">Feedback</span>
          <span className="admin-muted">Bugs and suggestions from Notes, Books and Home</span>
        </Link>
      </div>
    </div>
  );
}
