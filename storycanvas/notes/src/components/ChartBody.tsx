"use client";

import { useEffect, useState } from "react";
import { Minus, Pencil, Plus, X } from "lucide-react";
import type { ChartData, ChartKind, StoryNode } from "@/lib/types";
import { CHART_COLORS, STAT_MAX, arcPath, clampValue, limitsFor, normalizeChart, pieSlices, radarPoint, radarPolygon } from "@/lib/charts";
import type { BoardActions } from "./CanvasView";
import { useEscape } from "@/lib/use-escape";

const KINDS: [ChartKind, string][] = [["radar", "Radar"], ["bar", "Bar"], ["pie", "Pie"]];

/**
 * A chart card's body: pure SVG, palette-coloured, with an in-card editor for
 * the stats (open it with the "Edit stats" pill or a double-click).
 */
export default function ChartBody({ node, actions, selected, readOnly }: { node: StoryNode; actions: BoardActions; selected: boolean; readOnly: boolean }) {
  const chart = normalizeChart(node.chart);
  const [editing, setEditing] = useState(false);
  const accent = node.color || CHART_COLORS[0]!;

  // Deselecting the card (clicking away) closes the editor and releases the collaborator lock.
  useEffect(() => {
    if (!selected && editing) {
      setEditing(false);
      actions.unlockNode(node.id);
    }
  }, [selected, editing, actions, node.id]);

  function open() {
    if (readOnly) return;
    setEditing(true);
    actions.lockNode(node.id, "chart");
  }
  function close() {
    setEditing(false);
    actions.unlockNode(node.id);
  }
  const commit = (next: Partial<ChartData>) => actions.editNode(node.id, { chart: normalizeChart({ ...chart, ...next }) });

  return (
    <div className="relative min-h-0 flex-1" onDoubleClick={(e) => { e.stopPropagation(); open(); }}>
      {editing ? (
        <ChartEditor chart={chart} onChange={commit} onDone={close} />
      ) : (
        <>
          <div className="absolute inset-0 px-2 pb-2">
            {chart.kind === "radar" ? <Radar chart={chart} accent={accent} /> : chart.kind === "bar" ? <Bars chart={chart} /> : <Pie chart={chart} />}
          </div>
          {selected && !readOnly && (
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); open(); }}
              className="board-pill absolute bottom-2 right-2 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-card"
            >
              <Pencil size={11} /> Edit stats
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Radar({ chart, accent }: { chart: ChartData; accent: string }) {
  const n = chart.data.length, cx = 150, cy = 108, r = 68;
  const values = chart.data.map((d) => d.value);
  return (
    <svg viewBox="0 0 300 216" className="h-full w-full" role="img" aria-label={`Radar chart: ${chart.data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      {[2, 4, 6, 8, 10].map((ring) => (
        <polygon key={ring} points={radarPolygon(Array(n).fill(ring), STAT_MAX, cx, cy, r)} fill="none" stroke="currentColor" className="text-ink-900/10" strokeWidth={ring === 10 ? 1.2 : 0.8} />
      ))}
      {chart.data.map((_, i) => {
        const p = radarPoint(i, n, STAT_MAX, STAT_MAX, cx, cy, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" className="text-ink-900/10" strokeWidth={0.8} />;
      })}
      <polygon points={radarPolygon(values, STAT_MAX, cx, cy, r)} style={{ fill: accent, stroke: accent }} fillOpacity={0.22} strokeWidth={2} strokeLinejoin="round" />
      {values.map((v, i) => {
        const p = radarPoint(i, n, v, STAT_MAX, cx, cy, r);
        return <circle key={i} cx={p.x} cy={p.y} r={2.8} style={{ fill: accent }} />;
      })}
      {chart.data.map((d, i) => {
        const p = radarPoint(i, n, STAT_MAX * 1.2, STAT_MAX, cx, cy, r);
        const dx = p.x - cx, dy = p.y - cy;
        const anchor = Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";
        const y = p.y + (Math.abs(dy) < 8 ? 3 : dy > 0 ? 9 : -1);
        return (
          <text key={i} x={p.x} y={y} textAnchor={anchor} className="fill-ink-700" fontSize={10}>
            {truncate(d.label, 12)} <tspan fontWeight={700} className="fill-ink-900">{d.value}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

function Bars({ chart }: { chart: ChartData }) {
  const left = 22, right = 252, top = 14, bottom = 172;
  const n = chart.data.length, slot = (right - left) / n, bw = Math.min(40, slot * 0.68);
  const y = (v: number) => bottom - (v / STAT_MAX) * (bottom - top);
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full" role="img" aria-label={`Bar chart: ${chart.data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      {[0, 5, 10].map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-ink-900/10" strokeWidth={t === 0 ? 1.2 : 0.8} />
          <text x={left - 5} y={y(t) + 3} textAnchor="end" fontSize={8.5} className="fill-ink-500">{t}</text>
        </g>
      ))}
      {chart.data.map((d, i) => {
        const x = left + slot * i + (slot - bw) / 2;
        const color = CHART_COLORS[i % CHART_COLORS.length]!;
        return (
          <g key={i}>
            <rect x={x} y={y(d.value)} width={bw} height={Math.max(0, bottom - y(d.value))} rx={3} style={{ fill: color }} />
            <text x={x + bw / 2} y={y(d.value) - 4} textAnchor="middle" fontSize={9.5} fontWeight={700} className="fill-ink-900">{d.value}</text>
            <text x={x + bw / 2} y={bottom + 13} textAnchor="middle" fontSize={9} className="fill-ink-700">{truncate(d.label, Math.max(4, Math.floor(slot / 5.5)))}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Pie({ chart }: { chart: ChartData }) {
  const cx = 82, cy = 100, r = 72;
  const slices = pieSlices(chart.data.map((d) => d.value));
  const total = chart.data.reduce((a, d) => a + d.value, 0);
  const rowH = Math.min(22, 180 / chart.data.length);
  return (
    <svg viewBox="0 0 260 200" className="h-full w-full" role="img" aria-label={`Pie chart: ${chart.data.map((d) => `${d.label} ${d.value}`).join(", ")}`}>
      {slices.length === 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" className="text-ink-900/15" strokeDasharray="4 4" />}
      {slices.map((s) => (
        <path key={s.index} d={arcPath(cx, cy, r, s.start, s.end)} style={{ fill: CHART_COLORS[s.index % CHART_COLORS.length] }} stroke="#fff" strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      {chart.data.map((d, i) => {
        const y = 100 - (chart.data.length * rowH) / 2 + i * rowH + rowH / 2;
        return (
          <g key={i}>
            <rect x={170} y={y - 5} width={10} height={10} rx={2.5} style={{ fill: CHART_COLORS[i % CHART_COLORS.length] }} />
            <text x={185} y={y + 3.5} fontSize={9.5} className="fill-ink-700">
              {truncate(d.label, 9)} <tspan fontWeight={700} className="fill-ink-900">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ChartEditor({ chart, onChange, onDone }: { chart: ChartData; onChange: (c: Partial<ChartData>) => void; onDone: () => void }) {
  useEscape(onDone);
  const { min, max, valueMax } = limitsFor(chart.kind);
  const setRow = (i: number, patch: Partial<{ label: string; value: number }>) => onChange({ data: chart.data.map((d, j) => (j === i ? { ...d, ...patch } : d)) });
  const step = (i: number, by: number) => setRow(i, { value: clampValue(chart.kind, chart.data[i]!.value + by) });
  return (
    <div className="absolute inset-0 flex flex-col gap-2 overflow-y-auto px-3 pb-3 pt-1" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        {KINDS.map(([k, label]) => (
          <button key={k} onClick={() => onChange({ kind: k })}
            className={`rounded-full px-2.5 py-1 text-[11.5px] ${chart.kind === k ? "bg-bibliarch-blue text-white" : "bg-ink-900/5 text-ink-700 hover:bg-ink-900/10"}`}>
            {label}
          </button>
        ))}
        <button onClick={onDone} className="ml-auto rounded-full solid-chip px-3 py-1 text-[11.5px] font-semibold">Done</button>
      </div>
      <div className="flex flex-col gap-1">
        {chart.data.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: chart.kind === "radar" ? CHART_COLORS[0] : CHART_COLORS[i % CHART_COLORS.length] }} />
            <input
              aria-label={`Name of stat ${i + 1}`}
              value={d.label}
              placeholder="Stat"
              onChange={(e) => setRow(i, { label: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-ink-900/10 bg-editor-raised px-1.5 py-0.5 text-[12px] text-ink-900 outline-none focus:border-bibliarch-blue"
            />
            <button aria-label="Less" onClick={() => step(i, -1)} className="rounded-full p-0.5 text-ink-500 hover:bg-ink-900/5"><Minus size={11} /></button>
            <input
              aria-label={`Value of ${d.label || `stat ${i + 1}`}`}
              type="number"
              min={0}
              max={valueMax}
              step={1}
              value={d.value}
              onChange={(e) => setRow(i, { value: clampValue(chart.kind, Number(e.target.value)) })}
              className="w-11 rounded-md border border-ink-900/10 bg-editor-raised px-1 py-0.5 text-center font-mono text-[12px] text-ink-900 outline-none focus:border-bibliarch-blue"
            />
            <button aria-label="More" onClick={() => step(i, 1)} className="rounded-full p-0.5 text-ink-500 hover:bg-ink-900/5"><Plus size={11} /></button>
            <button
              aria-label={`Remove ${d.label || "stat"}`}
              disabled={chart.data.length <= min}
              onClick={() => onChange({ data: chart.data.filter((_, j) => j !== i) })}
              className="rounded-full p-0.5 text-ink-500 hover:bg-bibliarch-rose/15 hover:text-bibliarch-rose disabled:opacity-30"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        disabled={chart.data.length >= max}
        onClick={() => onChange({ data: [...chart.data, { label: "", value: chart.kind === "pie" ? 1 : 5 }] })}
        className="flex items-center justify-center gap-1 rounded-lg border border-dashed border-ink-900/15 py-1 text-[11.5px] text-ink-700 hover:bg-ink-900/5 disabled:opacity-40"
      >
        <Plus size={12} /> Add {chart.kind === "pie" ? "slice" : chart.kind === "bar" ? "bar" : "stat"}
      </button>
      <p className="text-[10.5px] text-ink-500">
        {chart.kind === "radar" ? `3–8 stats, each 0–${STAT_MAX}.` : chart.kind === "bar" ? `Up to ${max} bars, each 0–${STAT_MAX}.` : "Slices show each value's share of the total."}
      </p>
    </div>
  );
}

function truncate(s: string, n: number) {
  const t = s || "—";
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}
