// Next Link/router AND server redirect() add basePath; only raw URLs use this.
export function notesPath(path: string): string {
  if (path === '/notes' || path.startsWith('/notes/')) return path;
  return `/notes${path === '/' ? '' : path}`;
}

export function authReturnPath(value: unknown): string {
  const fallback = '/dashboard';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\%]/.test(value)) return fallback;
  const path = notesPath(value);
  const url = new URL(path, 'http://notes.local');
  // Accept only existing Notes entrypoints; no external or dot-segment escapes.
  if (url.pathname !== path.split('?')[0] || !/^\/notes\/(join\/[^/]+|story\/[^/]+|dashboard|settings)$/.test(url.pathname)) return fallback;
  return `${url.pathname.slice('/notes'.length)}${url.search}`;
}
