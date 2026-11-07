"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ShieldAlert, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminGate } from "@/lib/use-admin-gate";
import { ACTIVE_DAYS, daysAgo, fetchAllRows, relativeDay } from "@/lib/admin";
import { Chip, Stat } from "@/components/AdminBits";

interface ProfileRow {
  id: string;
  username: string | null;
  email: string | null;
  created_at: string;
  is_admin: boolean | null;
  classification: string | null;
}
interface Activity {
  id: string;
  last_sign_in_at: string | null;
  story_count: number;
  last_story_at: string | null;
}
type Group = "all" | "real" | "known" | `tag:${string}`;
type ActivityFilter = "all" | "active" | "inactive";
type Sort = "newest" | "oldest" | "active" | "stories" | "name";

const PAGE = 200;
const NEW_TAG = "__new__";

export default function AdminUsersPage() {
  const gate = useAdminGate();
  const [users, setUsers] = useState<ProfileRow[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [activity, setActivity] = useState<Map<string, Activity> | null>(null);
  const [activityMissing, setActivityMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<Group>("all");
  const [active, setActive] = useState<ActivityFilter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [shown, setShown] = useState(PAGE);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (gate !== "admin") return;
    const supabase = createClient();
    // The exact total comes from a count, never from the length of a (capped) list.
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => setTotal(count ?? null));
    fetchAllRows<ProfileRow>((from, to) =>
      supabase
        .from("profiles")
        .select("id, username, email, created_at, is_admin, classification")
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    )
      .then(setUsers)
      .catch((e: Error) => {
        setLoadError(e.message);
        setUsers([]);
      });
    fetchAllRows<Activity>((from, to) => supabase.rpc("admin_user_activity" as never).order("id").range(from, to))
      .then((rows) => setActivity(new Map(rows.map((r) => [r.id, r]))))
      .catch(() => setActivityMissing(true));
  }, [gate]);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users ?? []) if (u.classification) counts.set(u.classification, (counts.get(u.classification) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [users]);

  const lastSeen = (u: ProfileRow): string | null => {
    const a = activity?.get(u.id);
    if (!a) return null;
    const times = [a.last_sign_in_at, a.last_story_at].filter(Boolean) as string[];
    return times.sort().at(-1) ?? null;
  };
  const isActive = (u: ProfileRow) => {
    const d = daysAgo(lastSeen(u));
    return d !== null && d <= ACTIVE_DAYS;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (users ?? []).filter((u) => {
      if (group === "real" && u.classification) return false;
      if (group === "known" && !u.classification) return false;
      if (group.startsWith("tag:") && u.classification !== group.slice(4)) return false;
      if (activity && active !== "all" && isActive(u) !== (active === "active")) return false;
      if (q && !`${u.username ?? ""} ${u.email ?? ""} ${u.classification ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const by: Record<Sort, (a: ProfileRow, b: ProfileRow) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      active: (a, b) => (lastSeen(b) ?? "").localeCompare(lastSeen(a) ?? ""),
      stories: (a, b) => (activity?.get(b.id)?.story_count ?? 0) - (activity?.get(a.id)?.story_count ?? 0),
      name: (a, b) => (a.username ?? "~").localeCompare(b.username ?? "~"),
    };
    return list.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, activity, query, group, active, sort]);

  useEffect(() => setShown(PAGE), [query, group, active, sort]);

  async function setTag(u: ProfileRow, value: string) {
    let next: string | null = value || null;
    if (value === NEW_TAG) {
      const typed = window.prompt(`New marking for ${u.username ?? u.email ?? "this person"}:`, "")?.trim();
      if (!typed) return;
      next = typed;
    }
    setSaveError(null);
    const { data, error } = await createClient().from("profiles").update({ classification: next } as never).eq("id", u.id).select("id");
    if (error || !data?.length) {
      setSaveError("That marking couldn’t be saved. The admin permissions in supabase/004_account_delete_and_admin.sql need to be run once in Supabase.");
      return;
    }
    setUsers((prev) => (prev ?? []).map((p) => (p.id === u.id ? { ...p, classification: next } : p)));
  }

  if (gate === "checking" || (gate === "admin" && users === null)) {
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
      </div>
    );
  }

  const all = users ?? [];
  const realCount = all.filter((u) => !u.classification).length;
  const knownCount = all.length - realCount;
  const activeCount = activity ? all.filter(isActive).length : null;
  const newThisWeek = all.filter((u) => (daysAgo(u.created_at) ?? 99) < 7).length;

  return (
    <div className="admin-page admin-wide">
      <Link href="/admin" className="admin-back">
        <ArrowLeft size={14} /> Admin
      </Link>
      <h1 className="admin-title">Users</h1>

      <div className="admin-stats">
        <Stat value={total ?? all.length} label="Total registered" />
        <Stat value={realCount} label="Real users" tone="good" />
        <Stat value={knownCount} label="People I know IRL" tone="info" />
        <Stat value={activeCount ?? "—"} label={`Active in last ${ACTIVE_DAYS} days`} tone="warm" />
        <Stat value={newThisWeek} label="Joined this week" />
      </div>
      {total !== null && total !== all.length && (
        <p className="admin-note">Loaded {all.length} of {total} accounts — reload the page if someone just signed up.</p>
      )}
      {loadError && <p className="admin-note admin-note-bad">Couldn’t load everyone: {loadError}</p>}
      {activityMissing && (
        <p className="admin-note">
          Activity (last seen, stories) appears once <code>supabase/004_account_delete_and_admin.sql</code> has been run in Supabase.
        </p>
      )}
      {saveError && <p className="admin-note admin-note-bad">{saveError}</p>}

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or marking" />
        </label>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          {activity && <option value="active">Recently active</option>}
          {activity && <option value="stories">Most stories</option>}
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div className="admin-chips" role="group" aria-label="Who">
        <Chip on={group === "all"} onClick={() => setGroup("all")} label="Everyone" n={all.length} />
        <Chip on={group === "real"} onClick={() => setGroup("real")} label="Real users" n={realCount} />
        <Chip on={group === "known"} onClick={() => setGroup("known")} label="People I know IRL" n={knownCount} />
        {tags.map(([t, n]) => (
          <Chip key={t} on={group === `tag:${t}`} onClick={() => setGroup(`tag:${t}`)} label={t} n={n} tag />
        ))}
      </div>
      {activity && (
        <div className="admin-chips" role="group" aria-label="Activity">
          <Chip on={active === "all"} onClick={() => setActive("all")} label="Any activity" />
          <Chip on={active === "active"} onClick={() => setActive("active")} label="Active" n={activeCount ?? 0} />
          <Chip on={active === "inactive"} onClick={() => setActive("inactive")} label="Inactive" n={all.length - (activeCount ?? 0)} />
        </div>
      )}

      <p className="admin-count">
        Showing {Math.min(shown, visible.length)} of {visible.length}
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Joined</th>
              {activity && <th>Last seen</th>}
              {activity && <th className="num">Stories</th>}
              <th>Marking</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(0, shown).map((u) => {
              const seen = lastSeen(u);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user">
                      <span className="admin-user-name">
                        {u.username ?? "No username"}
                        {u.is_admin && <span className="admin-pill admin-pill-accent">Admin</span>}
                      </span>
                      <span className="admin-user-email">{u.email ?? "—"}</span>
                    </div>
                  </td>
                  <td className="admin-muted">{new Date(u.created_at).toLocaleDateString()}</td>
                  {activity && (
                    <td>
                      <span className={`admin-dot ${isActive(u) ? "is-on" : ""}`} aria-hidden="true" />
                      {relativeDay(seen)}
                    </td>
                  )}
                  {activity && <td className="num">{activity.get(u.id)?.story_count ?? 0}</td>}
                  <td>
                    <select
                      className={`admin-tag-select ${u.classification ? "has-tag" : ""}`}
                      value={u.classification ?? ""}
                      onChange={(e) => setTag(u, e.target.value)}
                      aria-label={`Marking for ${u.username ?? u.email ?? "user"}`}
                    >
                      <option value="">Real user</option>
                      {tags.map(([t]) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                      <option value={NEW_TAG}>New marking…</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && <p className="admin-empty">Nobody matches.</p>}
      </div>
      {shown < visible.length && (
        <button className="admin-more" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, visible.length - shown)} more
        </button>
      )}
    </div>
  );
}
