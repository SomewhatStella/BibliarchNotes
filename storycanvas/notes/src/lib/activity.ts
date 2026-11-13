"use client";
// Marks "this person used Bibliarch today" for the admin's daily-active counts.
// At most one call per person per day per browser; the database ignores repeats anyway.
// Books shares the same key (same site), so moving between Notes and Books doesn't call twice.
import { createClient } from "@/lib/supabase/client";

const KEY = "bibliarch.activity.v1";

export function activityDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(date);
}

export async function recordActivity(): Promise<void> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const mark = `${uid}:${activityDay()}`;
    try {
      if (localStorage.getItem(KEY) === mark) return;
    } catch {}
    const { error } = await supabase.rpc("record_activity" as never);
    if (error) return; // e.g. the migration hasn't been run yet; try again next time
    try {
      localStorage.setItem(KEY, mark);
    } catch {}
  } catch {
    // Counting visits must never get in the way of using the site.
  }
}
