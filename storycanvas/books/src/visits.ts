// Counts visitors who don't have an account (or aren't signed in), for the admin's Visitors panel.
// A random ID lives in this browser's localStorage. No cookie, no IP, no device details.
// Once the browser signs in, the ID is handed to the database once so it can tell
// "this visitor went on to make an account" from "an existing user on a new device".
// Notes keeps an identical copy (notes/src/lib/visits.ts); both use the same keys.
type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
interface Client {
  rpc: unknown;
  auth: { getSession(): Promise<{ data: { session: unknown } }> };
}

const ID = "bibliarch.visitor.v1";
const CLAIMED = "bibliarch.visitor.claimed.v1";
const SEEN = "bibliarch.visit.seen.v1"; // sessionStorage: pages already counted this visit
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function isBot() {
  const ua = navigator.userAgent || "";
  return navigator.webdriver || /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|pingdom|vercel/i.test(ua);
}

function visitorId(create: boolean): string | null {
  try {
    const have = localStorage.getItem(ID);
    if (have && UUID.test(have)) return have;
    if (!create) return null;
    const id = crypto.randomUUID();
    localStorage.setItem(ID, id);
    return id;
  } catch {
    return null; // storage blocked: don't count rather than count twice
  }
}

/** Where this visit came from: another site's address, plus ?utm_source= or ?ref= if the link had one. */
function arrival() {
  let host = "";
  try {
    const r = document.referrer ? new URL(document.referrer).hostname : "";
    if (r && r !== location.hostname) host = r;
  } catch {}
  const q = new URLSearchParams(location.search);
  return { host, source: q.get("utm_source") || q.get("ref") || "" };
}

export async function recordVisit(client: Client): Promise<void> {
  try {
    if (typeof window === "undefined" || isBot()) return;
    const rpc = (client.rpc as Rpc).bind(client);
    const { data } = await client.auth.getSession();
    if (data.session) {
      // Signed in: hand over this browser's visitor ID once, then stop counting it as a visitor.
      const id = visitorId(false);
      if (!id || localStorage.getItem(CLAIMED) === id) return;
      const { error } = await rpc("claim_visitor", { p_visitor: id });
      if (!error) localStorage.setItem(CLAIMED, id);
      return;
    }
    const id = visitorId(true);
    if (!id) return;
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date());
    const page = location.pathname.replace(/\/+$/, "") || "/";
    let seen: string[] = [];
    try {
      const raw = JSON.parse(sessionStorage.getItem(SEEN) || "{}");
      seen = raw.day === day && Array.isArray(raw.pages) ? raw.pages : [];
    } catch {}
    if (seen.includes(page)) return;
    // Only the first page of a visit knows which site sent it.
    const { host, source } = seen.length === 0 ? arrival() : { host: "", source: "" };
    const { error } = await rpc("record_visit", { p_visitor: id, p_path: page, p_referrer: host || null, p_source: source || null });
    if (error) return; // e.g. the database update hasn't been run yet
    try {
      sessionStorage.setItem(SEEN, JSON.stringify({ day, pages: [...seen, page].slice(-50) }));
    } catch {}
  } catch {
    // Counting visitors must never get in the way of using the site.
  }
}
