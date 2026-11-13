// Chart card maths: data rules per chart kind, radar/pie geometry and the
// plain-text summary used by export. Pure (type imports only) for node tests.
import type { ChartData, ChartKind } from "./types";

export const RADAR_MIN_AXES = 3;
export const RADAR_MAX_AXES = 8;
export const SERIES_MAX = 10;
export const STAT_MAX = 10;

/** Board palette colours (CSS custom properties from lib/color-palette.ts), cycled for bars and slices. */
export const CHART_COLORS = [
  "var(--color-node-default, #2E5AAC)",
  "var(--color-accent, #C76A82)",
  "var(--color-success, #3E9B5C)",
  "var(--color-warning, #E8A61C)",
  "var(--color-secondary, #8A5BB8)",
  "var(--color-info, #3B82C4)",
  "var(--color-error, #C0504D)",
  "var(--color-primary, #1F2633)",
];

export function defaultChart(): ChartData {
  return {
    kind: "radar",
    data: [
      { label: "Strength", value: 6 },
      { label: "Agility", value: 7 },
      { label: "Intellect", value: 5 },
      { label: "Charisma", value: 8 },
      { label: "Endurance", value: 4 },
    ],
  };
}

export function limitsFor(kind: ChartKind): { min: number; max: number; valueMax: number } {
  if (kind === "radar") return { min: RADAR_MIN_AXES, max: RADAR_MAX_AXES, valueMax: STAT_MAX };
  if (kind === "bar") return { min: 1, max: SERIES_MAX, valueMax: STAT_MAX };
  return { min: 1, max: RADAR_MAX_AXES, valueMax: 999 };
}

export function clampValue(kind: ChartKind, v: number): number {
  if (!Number.isFinite(v)) return 0;
  const { valueMax } = limitsFor(kind);
  return Math.max(0, Math.min(valueMax, Math.round(v * 10) / 10));
}

/** Data made valid for a kind: right number of rows (padding or trimming), values in range. */
export function normalizeChart(input: Partial<ChartData> | undefined): ChartData {
  const kind: ChartKind = input?.kind === "bar" || input?.kind === "pie" ? input.kind : "radar";
  const { min, max } = limitsFor(kind);
  let data = Array.isArray(input?.data) ? input!.data.map((d) => ({ label: String(d?.label ?? ""), value: clampValue(kind, Number(d?.value)) })) : defaultChart().data;
  data = data.slice(0, max);
  while (data.length < min) data.push({ label: `Stat ${data.length + 1}`, value: kind === "radar" ? 5 : 1 });
  return { kind, data };
}

/** Point at `value` (of `max`) on spoke `i` of `n`, first spoke straight up, clockwise. */
export function radarPoint(i: number, n: number, value: number, max: number, cx: number, cy: number, r: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const k = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return { x: cx + Math.cos(angle) * r * k, y: cy + Math.sin(angle) * r * k };
}

export function radarPolygon(values: number[], max: number, cx: number, cy: number, r: number): string {
  return values.map((v, i) => { const p = radarPoint(i, values.length, v, max, cx, cy, r); return `${round(p.x)},${round(p.y)}`; }).join(" ");
}

export interface Slice { index: number; start: number; end: number; fraction: number }

/** Pie slices as angles in radians, clockwise from 12 o'clock. Zero values get no slice. */
export function pieSlices(values: number[]): Slice[] {
  const total = values.reduce((a, v) => a + Math.max(0, v), 0);
  if (total <= 0) return [];
  const out: Slice[] = [];
  let a = 0;
  values.forEach((v, index) => {
    if (v <= 0) return;
    const fraction = v / total;
    out.push({ index, start: a, end: a + fraction * Math.PI * 2, fraction });
    a += fraction * Math.PI * 2;
  });
  return out;
}

/** SVG path for one slice. A full circle can't be one arc, so it's drawn as two. */
export function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const pt = (a: number) => `${round(cx + Math.sin(a) * r)} ${round(cy - Math.cos(a) * r)}`;
  if (end - start >= Math.PI * 2 - 1e-6) {
    return `M ${pt(0)} A ${r} ${r} 0 1 1 ${pt(Math.PI)} A ${r} ${r} 0 1 1 ${pt(0)} Z`;
  }
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${pt(start)} A ${r} ${r} 0 ${large} 1 ${pt(end)} Z`;
}

/** One line for the text export, e.g. "radar chart — Strength 6/10, Agility 7/10". */
export function chartSummary(chart: ChartData | undefined): string {
  const c = normalizeChart(chart);
  if (c.kind === "pie") {
    const total = c.data.reduce((a, d) => a + d.value, 0);
    return `pie chart — ${c.data.map((d) => `${d.label || "?"} ${total > 0 ? Math.round((d.value / total) * 100) : 0}%`).join(", ")}`;
  }
  return `${c.kind} chart — ${c.data.map((d) => `${d.label || "?"} ${d.value}/${STAT_MAX}`).join(", ")}`;
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}
