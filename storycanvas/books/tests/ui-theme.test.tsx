import {describe, expect, it} from 'vitest';
import {runInNewContext} from 'node:vm';
import {renderToString} from 'react-dom/server';
import {createElement} from 'react';
import {THEME_BOOTSTRAP, THEME_STORAGE_KEY, ThemeToggle} from '../src/ThemeToggle';

function boot(saved: string | null, dark = false, blocked = false) {
  const attributes: Record<string,string> = {};
  runInNewContext(THEME_BOOTSTRAP, {
    document: {documentElement: {setAttribute: (key:string,value:string) => {attributes[key]=value;}}},
    window: {matchMedia: () => ({matches:dark})},
    localStorage: {getItem: (key:string) => {expect(key).toBe('bibliarch.ui.theme.v1'); if(blocked) throw Error('denied'); return saved;}},
  });
  return attributes['data-ui-theme'];
}
describe('UI theme boot', () => {
  it('uses system preference on first visit', () => {expect(boot(null,true)).toBe('dark'); expect(boot(null)).toBe('light');});
  it('prefers a valid saved choice', () => {expect(boot('light',true)).toBe('light'); expect(boot('dark')).toBe('dark');});
  it('ignores invalid storage and survives blocked storage', () => {expect(boot('oops',true)).toBe('dark'); expect(boot(null,true,true)).toBe('dark');});
  it('exposes the stable key and hydration-stable accessible control', () => {
    expect(THEME_STORAGE_KEY).toBe('bibliarch.ui.theme.v1');
    const markup=renderToString(createElement(ThemeToggle));
    expect(markup).toContain('aria-label="Toggle color theme"');
    expect(markup).toContain('type="button"');
  });
});
