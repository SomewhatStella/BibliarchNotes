"use client";
// Admin: people who came to bibliarch.com without an account, where they came from, and how
// many went on to make one. Numbers come pre-added from admin_visitor_summary (visitors.sql).

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { activityDay } from "@/lib/activity";
import { Stat } from "@/components/AdminBits";

interface Day {
  day: string;
  visitors: number;
  new: number;
  signups: number;
}
interface Row {
  name: string;
  visitors: number;
  signups: number;
}
interface Summary {
  days: Day[];
  unique_visitors: number;
  sources: Row[];
  pages: Row[];
  all_signups: number;
  tracking_since: string | null;
}

const RANGES = [7, 14, 30, 90, 365] as const;
type Range = (typeof RANGES)[number];

function utc(day: string): Date {
  const [y = 1970, m = 1, d = 1] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function label(day: string, style: "short" | "long" = "short"): string {
  return utc(day).toLocaleDateString(undefined, {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", month: "long", day: "numeric" } : { month: "short", day: "numeric" }),
  });
}
const fmtAvg = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1).replace(/\.0$/, ""));
const pct = (part: number, whole: number) =>
  !whole ? "–" : !part ? "0%" : `${((100 * part) / whole).toFixed(part / whole >= 0.1 ? 0 : 1)}%`;
const visitors = (n: number) => `${n.toLocaleString()} ${n === 1 ? "visitor" : "visitors"}`;
const span = (r: Range) => (r === 365 ? "past year" : `past ${r} days`);

export function VisitorsPanel() {
  const [range, setRange] = useState<Range>(() => {
    try {
      const saved = Number(localStorage.getItem("bibliarch.admin.visitors.range"));
      return (RANGES as readonly number[]).includes(saved) ? (saved as Range) : 30;
    } catch {
      return 30;
    }
  });
  const [data, setData] = useState<Record<number, Summary>>({});
  const [missing, setMissing] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [asTable, setAsTable] = useState(false);
  const today = activityDay();
  const sum = data[range];

  useEffect(() => {
    if (data[range]) return;
    let live = true;
    createClient()
      .rpc("admin_visitor_summary" as never, { p_days: range + 1 } as never)
      .then(({ data: d, error }) => {
        if (!live) return;
        if (error) setMissing(true);
        else setData((old) => ({ ...old, [range]: d as unknown as Summary }));
      });
    return () => {
      live = false;
    };
  }, [range, data]);

  function pickRange(r: Range) {
    setRange(r);
    try {
      localStorage.setItem("bibliarch.admin.visitors.range", String(r));
    } catch {}
  }

  const stats = useMemo(() => {
    if (!sum) return null;
    const past = sum.days.filter((d) => d.day < today);
    const add = (k: keyof Omit<Day, "day">) => past.reduce((a, d) => a + d[k], 0);
    const total = add("visitors");
    return {
      today: sum.days.find((d) => d.day === today)?.visitors ?? 0,
      average: past.length ? total / past.length : 0,
      unique: sum.unique_visitors,
      newcomers: add("new"),
      signups: add("signups"),
    };
  }, [sum, today]);

  const startedInside = sum?.tracking_since && sum.days[0] && sum.tracking_since > sum.days[0].day ? sum.tracking_since : null;

  return (
    <section className="admin-activity" aria-labelledby="visitors-title">
      <div className="admin-activity-head">
        <h2 id="visitors-title" className="admin-section-title">
          Visitors without an account
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
          Visitor numbers need one database update. In Supabase, open SQL Editor, paste{" "}
          <code>notes/supabase/migrations/20261115000000_visitors.sql</code> and press Run.
        </p>
      ) : !sum || !stats ? (
        <div className="admin-activity-loading">
          <Loader2 size={18} className="animate-spin" /> Counting…
        </div>
      ) : (
        <>
          {startedInside && (
            <p className="admin-note">
              Counting started {label(startedInside, "long")}, so days before that are empty.
            </p>
          )}
          <div className="admin-stats admin-activity-stats">
            <Stat value={stats.today} label="Today so far" tone="info" />
            <Stat value={fmtAvg(stats.average)} label={`Average a day, ${span(range)}`} tone="good" />
            <Stat value={stats.unique} label={`Different visitors, ${span(range)}`} />
            <Stat value={stats.newcomers} label={`First-time visitors, ${span(range)}`} />
            <Stat value={stats.signups} label={`Made an account, ${span(range)}`} tone="warm" />
            <Stat value={pct(stats.signups, stats.newcomers)} label="Of first-time visitors, made an account" />
          </div>

          <div className="admin-legend" aria-hidden="true">
            <span><i className="admin-key admin-key-visit" /> Visited</span>
            <span><i className="admin-key admin-key-join" /> Made an account that day</span>
          </div>
          <StackChart days={sum.days} today={today} hover={hover} onHover={setHover} />

          <div className="admin-activity-foot">
            <span className="admin-muted">Hover a bar for that day’s numbers.</span>
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
                    <th className="num">Visitors</th>
                    <th className="num">First time</th>
                    <th className="num">Made an account</th>
                  </tr>
                </thead>
                <tbody>
                  {[...sum.days].reverse().map((d) => (
                    <tr key={d.day}>
                      <td>
                        {label(d.day, "long")}
                        {d.day === today && <span className="admin-muted"> · so far</span>}
                      </td>
                      <td className="num">{d.visitors}</td>
                      <td className="num">{d.new}</td>
                      <td className="num">{d.signups}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-visitor-tables">
            <Breakdown title="Where they came from" first="Came from" rows={sum.sources} />
            <Breakdown title="First page they landed on" first="Page" rows={sum.pages} mono />
          </div>

          <p className="admin-muted admin-activity-fine">
            A visitor is one browser that wasn’t signed in, counted once a day. Existing users on a new phone or
            computer are left out once they sign in. “Made an account” means that browser later signed up. Of all{" "}
            {Math.max(sum.all_signups, stats.signups).toLocaleString()} sign-ups in the {span(range)}, {stats.signups.toLocaleString()} were traced
            back to a visit; the rest signed up before counting began or with storage blocked. Tip: link your TikTok bio to{" "}
            <code>bibliarch.com/?ref=tiktok</code> so those visits are labelled even when TikTok hides where they came from.
          </p>
        </>
      )}
    </section>
  );
}

function Breakdown({ title, first, rows, mono }: { title: string; first: string; rows: Row[]; mono?: boolean }) {
  return (
    <div>
      <p className="admin-h2">{title}</p>
      {rows.length === 0 ? (
        <p className="admin-muted">Nobody yet in this range.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{first}</th>
                <th className="num">Visitors</th>
                <th className="num">Accounts</th>
                <th className="num">Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td className={mono ? "admin-visitor-page" : undefined}>{r.name}</td>
                  <td className="num">{r.visitors.toLocaleString()}</td>
                  <td className="num">{r.signups.toLocaleString()}</td>
                  <td className="num">{pct(r.signups, r.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function niceMax(n: number): number {
  if (n <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(n));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * step >= n) return k * step;
  return 10 * step;
}

function StackChart({ days, today, hover, onHover }: { days: Day[]; today: string; hover: string | null; onHover: (d: string | null) => void }) {
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
  const top = niceMax(Math.max(...days.map((d) => d.visitors), 1));
  const ticks = [0, top / 4, top / 2, (3 * top) / 4, top].filter((t) => Number.isInteger(t));
  const slot = (W - L - R) / Math.max(1, days.length);
  const gap = Math.min(2, slot * 0.25);
  const bw = Math.max(1, slot - gap);
  const y = (v: number) => T + (H - T - B) * (1 - v / top);
  const labelEvery = Math.ceil(days.length / Math.max(2, Math.floor(W / 120)));
  const tip = hover ? days.findIndex((d) => d.day === hover) : -1;
  const t = days[tip];

  // Rounded top only on the topmost segment; the bottom stays square on the baseline.
  const seg = (x: number, from: number, to: number, round: boolean) => {
    const y0 = y(from), y1 = y(to), r = round ? Math.min(4, bw / 2, (y0 - y1) / 2) : 0;
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
  };

  return (
    <div className="admin-chart" ref={box} onMouseLeave={() => onHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Visitors without an account each day, ${days.length - 1} days and today`}>
        <defs>
          <pattern id="visit-today-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <rect width="5" height="5" className="admin-visit-today-bg" />
            <line x1="0" y1="0" x2="0" y2="5" className="admin-visit-today-line" />
          </pattern>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className={v === 0 ? "admin-chart-base" : "admin-chart-grid"} />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="admin-chart-axis">
              {v}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = L + i * slot + gap / 2;
          const joined = Math.min(d.signups, d.visitors);
          const dim = hover && d.day !== hover ? " is-dim" : "";
          const isToday = d.day === today ? " is-today" : "";
          // 2px surface gap between the two segments when both are tall enough to show it.
          const split = joined > 0 && d.visitors > joined && y(joined) - y(d.visitors) > 3;
          return (
            <g key={d.day}>
              {d.visitors > joined && (
                <path d={seg(x, joined, d.visitors, true)} className={`admin-visit-bar${isToday}${dim}`} transform={split ? "translate(0,-1)" : undefined} />
              )}
              {joined > 0 && <path d={seg(x, 0, joined, d.visitors === joined)} className={`admin-join-bar${dim}`} />}
              {(i % labelEvery === 0 && days.length - 1 - i >= labelEvery / 2) || i === days.length - 1 ? (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" className="admin-chart-axis">
                  {d.day === today ? "Today" : label(d.day)}
                </text>
              ) : null}
              <rect x={L + i * slot} y={T} width={slot} height={H - T - B + 8} className="admin-chart-hit" onMouseEnter={() => onHover(d.day)}>
                <title>{`${label(d.day)}: ${visitors(d.visitors)}, ${d.signups} made an account`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      {t && (
        <div className="admin-chart-tip" style={{ left: `${((L + (tip + 0.5) * slot) / W) * 100}%`, top: `${(y(t.visitors) / H) * 100}%` }}>
          <strong>{visitors(t.visitors)}</strong>
          <span>
            {t.new} first-time · {t.signups} made an account
          </span>
          <span>{t.day === today ? "Today, so far" : label(t.day, "long")}</span>
        </div>
      )}
    </div>
  );
}
