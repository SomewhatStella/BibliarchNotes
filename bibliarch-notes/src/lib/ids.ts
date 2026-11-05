// Short, URL/filename-safe ids in the same shape the Unity side already
// writes (timestamp + random suffix) — not required to match byte-for-byte,
// just to never collide with existing ids when a board is edited from here.
export function makeId(prefix?: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 11);
  return prefix ? `${prefix}-${t}-${r}` : `${t}-${r}`;
}
