"use client";

import Link from "next/link";
import { ArrowLeft, Users, MessageSquare, Loader2, ShieldAlert } from "lucide-react";
import { useAdminGate } from "@/lib/use-admin-gate";

export default function AdminPage() {
  const gate = useAdminGate();

  if (gate === "checking") {
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
        <Link href="/dashboard" className="mt-2 text-[13px] text-bibliarch-blue">
          Back to your stories
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-parchment-50 px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900">
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">Admin</h1>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/admin/users" className="emboss flex flex-col gap-2 rounded-2xl p-5 hover:shadow-card-hover">
            <Users size={22} className="text-bibliarch-blue" />
            <p className="font-display text-[15px] font-semibold text-ink-900">Users</p>
            <p className="text-[12.5px] text-ink-500">Registered accounts</p>
          </Link>
          <Link href="/admin/feedback" className="emboss flex flex-col gap-2 rounded-2xl p-5 hover:shadow-card-hover">
            <MessageSquare size={22} className="text-bibliarch-blue" />
            <p className="font-display text-[15px] font-semibold text-ink-900">Feedback</p>
            <p className="text-[12.5px] text-ink-500">What people have sent in</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
