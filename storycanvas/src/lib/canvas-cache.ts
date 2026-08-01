// Local cache for canvas payloads, keyed by (story, canvas, updated_at).
//
// Why: canvas_data rows carry the entire nodes + connections JSON. Before this,
// every navigation between canvases re-downloaded the whole blob, which is what
// put us into Supabase egress trouble and made revisiting a canvas slow.
//
// With this in place a revisit costs one tiny "what's the updated_at?" query.
// The body only comes down the wire when it actually changed.

const PREFIX = 'bibliarch-canvas:'

// Don't try to cache anything enormous - localStorage is ~5MB total and one
// runaway canvas shouldn't evict everything else.
const MAX_ENTRY_BYTES = 1_000_000

export type CachedCanvas = {
  updated_at: string
  nodes: any[]
  connections: any[]
  palette: any
}

function keyFor(storyId: string, canvasType: string) {
  return `${PREFIX}${storyId}:${canvasType}`
}

export function readCanvasCache(storyId: string, canvasType: string): CachedCanvas | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(keyFor(storyId, canvasType))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed.updated_at !== 'string' || !Array.isArray(parsed.nodes)) {
      return null
    }
    return parsed as CachedCanvas
  } catch {
    // Corrupt entry or storage disabled - treat as a miss.
    return null
  }
}

export function writeCanvasCache(storyId: string, canvasType: string, value: CachedCanvas) {
  if (typeof window === 'undefined') return
  try {
    const serialized = JSON.stringify(value)
    if (serialized.length > MAX_ENTRY_BYTES) return

    try {
      window.localStorage.setItem(keyFor(storyId, canvasType), serialized)
    } catch {
      // Out of room. Drop every canvas entry and retry once - a cold cache is
      // slow, a broken cache is worse.
      evictAll()
      try {
        window.localStorage.setItem(keyFor(storyId, canvasType), serialized)
      } catch {
        // Still no room. Caching is an optimisation; carry on without it.
      }
    }
  } catch {
    // Value wasn't serializable. Skip.
  }
}

export function clearCanvasCache(storyId: string, canvasType: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(keyFor(storyId, canvasType))
  } catch {
    // Nothing to do.
  }
}

function evictAll() {
  try {
    const doomed: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(PREFIX)) doomed.push(k)
    }
    doomed.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    // Nothing to do.
  }
}
