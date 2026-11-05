'use client';

import React, {useSyncExternalStore} from 'react';

export type UITheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'bibliarch.ui.theme.v1';
// Runs in <head>, before page paint. Only the root attribute is changed, never book data.
export const THEME_BOOTSTRAP = `(function(){var t;try{t=localStorage.getItem('${THEME_STORAGE_KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){try{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){t='light'}}document.documentElement.setAttribute('data-ui-theme',t)})();`;
export function ThemeBootstrap() {
  return <script dangerouslySetInnerHTML={{__html: THEME_BOOTSTRAP}} />;
}

const eventName = 'bibliarch:ui-theme';
let preference: UITheme | null | undefined;
function storedTheme(): UITheme | null {
  try {const value = localStorage.getItem(THEME_STORAGE_KEY); return value === 'light' || value === 'dark' ? value : null;}
  catch {return null;}
}
function applyTheme(theme: UITheme) {
  document.documentElement.setAttribute('data-ui-theme', theme);
  window.dispatchEvent(new Event(eventName));
}
function snapshot(): UITheme | null {
  const value = document.documentElement.getAttribute('data-ui-theme');
  return value === 'light' || value === 'dark' ? value : null;
}
function subscribe(notify: () => void) {
  if (preference === undefined) preference = storedTheme();
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const systemChanged = () => {if (!preference) applyTheme(media.matches ? 'dark' : 'light');};
  const storageChanged = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    preference = storedTheme();
    applyTheme(preference || (media.matches ? 'dark' : 'light'));
  };
  window.addEventListener(eventName, notify);
  window.addEventListener('storage', storageChanged);
  media.addEventListener('change', systemChanged);
  // A system change may occur between bootstrap paint and React hydration.
  applyTheme(preference || (media.matches ? 'dark' : 'light'));
  return () => {
    window.removeEventListener(eventName, notify);
    window.removeEventListener('storage', storageChanged);
    media.removeEventListener('change', systemChanged);
  };
}
const serverSnapshot = () => null;

/** Render inline in shared navigation, or use floating for the layout-level fallback. */
export function ThemeToggle({floating = false, className = ''}: {floating?: boolean; className?: string}) {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  function toggle() {
    preference = snapshot() === 'dark' ? 'light' : 'dark';
    applyTheme(preference);
    try {localStorage.setItem(THEME_STORAGE_KEY, preference);} catch {/* Private/blocked storage: this tab still works. */}
  }
  return <button type="button" className={`ui-theme-toggle${floating ? ' ui-theme-toggle--floating' : ''} ${className}`}
    aria-label="Toggle color theme" aria-pressed={theme === null ? undefined : theme === 'dark'}
    title="Switch between light and dark mode" onClick={toggle}>
    <span className="ui-theme-sun" aria-hidden="true">☀</span>
    <span className="ui-theme-moon" aria-hidden="true">☾</span>
    <span className="ui-theme-label">Appearance</span>
  </button>;
}
export default ThemeToggle;
