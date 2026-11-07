export function Stat({ value, label, tone }: { value: number | string; label: string; tone?: "good" | "info" | "warm" | "bad" }) {
  return (
    <div className={`admin-stat ${tone ? `tone-${tone}` : ""}`}>
      <span className="admin-stat-value">{typeof value === "number" ? value.toLocaleString() : value}</span>
      <span className="admin-stat-label">{label}</span>
    </div>
  );
}

export function Chip({ on, onClick, label, n, tag }: { on: boolean; onClick: () => void; label: string; n?: number; tag?: boolean }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={`admin-chip ${on ? "is-on" : ""} ${tag ? "is-tag" : ""}`}>
      {label}
      {n !== undefined && <span className="admin-chip-n">{n.toLocaleString()}</span>}
    </button>
  );
}
