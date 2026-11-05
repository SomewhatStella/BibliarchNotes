"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGate } from "@/lib/use-admin-gate";

interface ProfileRow {
  id: string;
  username: string | null;
  email: string | null;
  created_at: string;
  is_admin: boolean | null;
}

export default function AdminUsersPage() {
  const gate = useAdminGate();
  const [users, setUsers] = useState<ProfileRow[] | null>(null);

  useEffect(() => {
    if (gate !== "admin") return;
    createClient()
      .from("profiles")
      .select("id, username, email, created_at, is_admin")
      .order("created_at", { ascending: false })
      .then(({ data }) => setUsers(data ?? []));
  }, [gate]);

  if (gate === "checking" || (gate === "admin" && users === null)) {
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

  return (
    <main className="min-h-screen bg-parchment-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="mb-6 flex items-center gap-1.5 text-[13px] text-ink-500 hover:text-ink-900">
          <ArrowLeft size={14} /> Admin
        </Link>
        <div className="mb-6 flex items-center gap-2">
          <Users size={20} className="text-bibliarch-blue" />
          <h1 className="font-display text-2xl font-semibold text-ink-900">{users?.length ?? 0} users</h1>
        </div>
        <div className="emboss overflow-hidden rounded-2xl">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-900/8 text-[11px] uppercase tracking-wide text-ink-500">
                <th className="px-4 py-2.5">Username</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Joined</th>
                <th className="px-4 py-2.5">Admin</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b border-ink-900/5 last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-ink-900">{u.username ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-700">{u.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-500">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5">{u.is_admin ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
