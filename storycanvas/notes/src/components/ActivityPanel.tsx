"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/admin";
import { activityDay } from "@/lib/activity";
import { Chip, Stat } from "@/components/AdminBits";

interface DayRow {
  day: string;
  user_id: string;
}
interface Person {
  id: string;
  username: string | null;
  email: string | null;
  classification: string | null;
}

const RANGES = [7, 14, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];
const FETCH_DAYS = 366; // the longest range plus today, loaded once

/** A "2026-11-13" calendar date at UTC midnight, so date maths never crosses a time zone. */
function utc(day: string, minusDays = 0): Date {
  const [y = 1970, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - minusDays));
}
/** "2026-11-13" minus n days. */
function shift(day: string, n: number): string {
  return utc(day, n).toISOString().slice(0, 10);
}
function label(day: string, style: "short" | "long" = "short"): string {
  return utc(day).toLocaleDateString(undefined, {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" }),
  });
}
const people = (n: number) => `${n.toLocaleString()} ${n === 1 ? "person" : "people"}`;
const fmtAvg = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1).replace(/\.0$/, ""));

export function ActivityPanel() {
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [signups, setSignups] = useState<DayRow[]>([]);
  const [who, setWho] = useState<Map<string, Person>>(new Map());
  const [missing, setMissing] = useState(false);
  const [range, setRange] = useState<Range>(() => {
    try {
      const saved = Number(localStorage.getItem("bibliarch.admin.range"));
      return (RANGES as readonly number[]).includes(saved) ? (saved as Range) : 30;
    } catch {
      return 30;
    }
  });
  const [hideMarked, setHideMarked] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const today = activityDay();

  useEffect(() => {
    const supabase = createClient();
    const rpc = (fn: string) => (from: number, to: number) =>
      supabase.rpc(fn as never, { p_days: FETCH_DAYS } as never).range(from, to) as unknown as PromiseLike<{
        data: DayRow[] | null;
        error: { message: string } | null;
      }>;
    fetchAllRows<DayRow>(rpc("admin_daily_activity"))
      .then(setRows)
      .catch(() => {
        setMissing(true);
        setRows([]);
      });
    fetchAllRows<DayRow>(rpc("admin_daily_signups")).then(setSignups).catch(() => {});
    fetchAllRows<Person>((from, to) =>
      supabase.from("profiles").select("id, username, email, classification").order("id").range(from, to),
    )
      .then((list) => setWho(new Map(list.map((p) => [p.id, p]))))
      .catch(() => {});
  }, []);

  function pickRange(r: Range) {
    setRange(r);
    try {
      localStorage.setItem("bibliarch.admin.range", String(r));
    } catch {}
  }

  const counted = (id: string) => !hideMarked || !who.get(id)?.classification;
  const markedCount = useMemo(() => [...who.values()].filter((p) => p.classification).length, [who]);

  // Oldest → newest: the `range` full days before today, then today (still going).
  const days = useMemo(() => Array.from({ length: range + 1 }, (_, i) => shift(today, range - i)), [range, today]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of rows ?? []) if (counted(r.user_id)) m.set(r.day, [...(m.get(r.day) ?? []), r.user_id]);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, who, hideMarked]);

  const stats = useMemo(() => {
    const past = days.slice(0, -1);
    const counts = past.map((d) => byDay.get(d)?.length ?? 0);
    const total = counts.reduce((a, b) => a + b, 0);
    let busiest: string | null = null;
    for (const d of past) if ((byDay.get(d)?.length ?? 0) > (busiest ? byDay.get(busiest)!.length : 0)) busiest = d;
    const unique = new Set(past.flatMap((d) => byDay.get(d) ?? []));
    const first = past[0] ?? today;
    const joined = signups.filter((s) => s.day >= first && s.day < today && counted(s.user_id)).length;
    return {
      today: byDay.get(today)?.length ?? 0,
      yesterday: byDay.get(shift(today, 1))?.length ?? 0,
      average: total / past.length,
      busiest,
      unique: unique.size,
      joined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, byDay, signups, today, hideMarked, who]);

  const shown = picked && days.includes(picked) ? picked : today;
  const shownPeople = (byDay.get(shown) ?? [])
    .map((id) => who.get(id) ?? { id, username: null, email: null, classification: null })
    .sort((a, b) => (a.username ?? a.email ?? "~").localeCompare(b.username ?? b.email ?? "~"));

  return (
    <section className="admin-activity" aria-labelledby="activity-title">
      <div className="admin-activity-head">
        <h2 id="activity-title" className="admin-section-title">
          Daily active people
        </h2>
        <div className="admin-segment" role="group" aria-label="How many past days">
          {RANGES.map((r) => (
            <button key={r} type="button" className={range === r ? "is-on" : ""} aria-pressed={range === r} onClick={() => pickRange(r)}>
              {r === 365 ? "1 year" : `${r} days`}
            </button>
          ))}
        </div>
      </div>

      {missing ? (
        <p className="admin-note admin-note-bad">
          Daily numbers need one database update. In Supabase, open SQL Editor, paste{" "}
          <code>notes/supabase/migrations/20261113000000_daily_activity.sql</code> and press Run.
        </p>
      ) : rows === null ? (
        <div className="admin-activity-loading">
          <Loader2 size={18} className="animate-spin" /> Counting…
        </div>
      ) : (
        <>
          {markedCount > 0 && (
            <div className="admin-chips">
              <Chip on={!hideMarked} onClick={() => setHideMarked(false)} label="Everyone" />
              <Chip on={hideMarked} onClick={() => setHideMarked(true)} label="Leave out people I’ve marked" n={markedCount} tag />
            </div>
          )}

          <div className="admin-stats admin-activity-stats">
            <Stat value={stats.today} label="Today so far" tone="info" />
            <Stat value={stats.yesterday} label="Yesterday" />
            <Stat value={fmtAvg(stats.average)} label={`Average a day, past ${range === 365 ? "year" : `${range} days`}`} tone="good" />
            <Stat
              value={stats.busiest ? (byDay.get(stats.busiest)?.length ?? 0) : 0}
              label={stats.busiest ? `Busiest day · ${label(stats.busiest)}` : "Busiest day"}
            />
            <Stat value={stats.unique} label={`Different people, past ${range === 365 ? "year" : `${range} days`}`} />
            <Stat value={stats.joined} label={`New sign-ups, past ${range === 365 ? "year" : `${range} days`}`} tone="warm" />
          </div>

          <DayChart
            days={days}
            counts={days.map((d) => byDay.get(d)?.length ?? 0)}
            average={stats.average}
            today={today}
            picked={shown}
            hover={hover}
            onHover={setHover}
            onPick={setPicked}
          />

          <div className="admin-activity-foot">
            <span className="admin-muted">Tap a bar to see who was on that day.</span>
            <button type="button" className="admin-link-button" onClick={() => setAsTable((v) => !v)} aria-expanded={asTable}>
              {asTable ? "Hide the table" : "Show as a table"}
            </button>
          </div>

          {asTable && (
            <div className="admin-table-wrap admin-activity-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th className="num">People</th>
                    <th className="num">New sign-ups</th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => (
                    <tr key={d} onClick={() => setPicked(d)} className={d === shown ? "is-picked" : ""}>
                      <td>
                        {label(d, "long")}
                        {d === today && <span className="admin-muted"> · so far</span>}
                      </td>
                      <td className="num">{byDay.get(d)?.length ?? 0}</td>
                      <td className="num">{signups.filter((s) => s.day === d && counted(s.user_id)).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-day-detail">
            <p className="admin-h2">
              {shown === today ? "Today" : label(shown, "long")} · {people(shownPeople.length)}
            </p>
            {shownPeople.length === 0 ? (
              <p className="admin-muted">Nobody signed in this day.</p>
            ) : (
              <ul className="admin-day-people">
                {shownPeople.map((p) => (
                  <li key={p.id}>
                    <span className="admin-day-name">{p.username ?? p.email ?? "Deleted account"}</span>
                    {p.classification && <span className="admin-pill admin-pill-accent">{p.classification}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="admin-muted admin-activity-fine">
            Counts signed-in people, one per day however long they stay. Days run midnight to midnight Central time.
            Days before this chart existed come from sign-ins and new stories, so they may read a little low.
          </p>
        </>
      )}
    </section>
  );
}

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * step >= n) return k * step;
  return 10 * step;
}

function DayChart(props: {
  days: string[];
  counts: number[];
  average: number;
  today: string;
  picked: string;
  hover: string | null;
  onHover: (d: string | null) => void;
  onPick: (d: string) => void;
}) {
  const { days, counts, average, today, picked, hover, onHover, onPick } = props;
  // Draw at the real on-screen width so text stays 11px on a phone instead of shrinking.
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(880);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = W < 500 ? 180 : 220, L = 34, R = 8, T = 12, B = 26;
  const top = niceMax(Math.max(...counts, average, 1));
  const ticks = [0, top / 4, top / 2, (3 * top) / 4, top].filter((t) => Number.isInteger(t));
  const slot = (W - L - R) / days.length;
  const gap = Math.min(2, slot * 0.25);
  const bw = Math.max(1, slot - gap);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const radius = Math.min(4, bw / 2);
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(W / 120)));
  const tip = hover ? days.indexOf(hover) : -1;
  const tipCount = counts[tip] ?? 0;
  const tipDay = days[tip] ?? today;

  // A bar with a rounded top and a square bottom, anchored to the baseline.
  const bar = (x: number, v: number) => {
    const y0 = y(0), y1 = y(v), r = Math.min(radius, (y0 - y1) / 2);
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
  };

  return (
    <div className="admin-chart" ref={box} onMouseLeave={() => onHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`People active each day, ${days.length - 1} days and today`}>
        <defs>
          <pattern id="today-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <rect width="5" height="5" className="admin-chart-today-bg" />
            <line x1="0" y1="0" x2="0" y2="5" className="admin-chart-today-line" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className={t === 0 ? "admin-chart-base" : "admin-chart-grid"} />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="admin-chart-axis">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = L + i * slot + gap / 2;
          const v = counts[i] ?? 0;
          const cls = ["admin-chart-bar", d === today && "is-today", d === picked && "is-picked", hover && d !== hover && "is-dim"]
            .filter(Boolean)
            .join(" ");
          return (
            <g key={d}>
              {v > 0 && <path d={bar(x, v)} className={cls} />}
              {d === picked && <rect x={x} y={H - B + 3} width={bw} height={3} rx={1.5} className="admin-chart-pick" />}
              {(i % labelEvery === 0 && days.length - 1 - i >= labelEvery / 2) || i === days.length - 1 ? (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="admin-chart-axis">
                  {d === today ? "Today" : label(d)}
                </text>
              ) : null}
              <rect
                x={L + i * slot}
                y={T}
                width={slot}
                height={H - T - B + 8}
                className="admin-chart-hit"
                tabIndex={-1}
                onMouseEnter={() => onHover(d)}
                onClick={() => onPick(d)}
              >
                <title>{`${label(d)}: ${people(v)}`}</title>
              </rect>
            </g>
          );
        })}
        {average > 0 && (
          <g className="admin-chart-avg">
            <line x1={L} x2={W - R} y1={y(average)} y2={y(average)} />
            <text x={W - R - 4} y={y(average) - 5} textAnchor="end">
              average {fmtAvg(average)}
            </text>
          </g>
        )}
      </svg>
      {tip >= 0 && (
        <div
          className="admin-chart-tip"
          style={{ left: `${((L + (tip + 0.5) * slot) / W) * 100}%`, top: `${(y(tipCount) / H) * 100}%` }}
        >
          <strong>{people(tipCount)}</strong>
          <span>
            {tipDay === today ? "Today, so far" : label(tipDay, "long")}
          </span>
        </div>
      )}
    </div>
  );
}
