// Run: node scripts/test-site-theme.cjs. No servers, credentials, or data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const notes = fs.readFileSync(path.join(root, 'src/components/ThemeToggle.tsx'), 'utf8');
const books = fs.readFileSync(path.join(root, '../bibliarch-books/src/ThemeToggle.tsx'), 'utf8');
assert.equal(notes, books, 'Both zones must keep the identical theme implementation');
const key = 'bibliarch.ui.theme.v1';
function harness(saved, dark = false, blocked = false) {
  const attributes = {};
  const listeners = new Map();
  const mediaListeners = new Set();
  const media = {matches: dark, addEventListener: (_, fn) => mediaListeners.add(fn), removeEventListener: (_, fn) => mediaListeners.delete(fn)};
  let preference = saved;
  let unsubscribe;
  const localStorage = {getItem: () => {if(blocked) throw Error('blocked'); return preference;}, setItem: (k, v) => {assert.equal(k, key); if(blocked) throw Error('blocked'); preference = v;}};
  const window = {matchMedia: () => media, addEventListener: (name, fn) => {if(!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn);}, removeEventListener: (name, fn) => listeners.get(name).delete(fn), dispatchEvent: e => {for(const fn of listeners.get(e.type) || []) fn(e);}};
  const react = {createElement: (type, props, ...children) => ({type, props, children}), useSyncExternalStore: (subscribe, snapshot) => {if(!unsubscribe) unsubscribe = subscribe(() => {}); return snapshot();}};
  react.default = react;
  const exports = {};
  const context = vm.createContext({exports, require: () => react, localStorage, window, document: {documentElement: {setAttribute: (k,v) => attributes[k] = v, getAttribute: k => attributes[k]}}, Event: class {constructor(type){this.type = type;}}});
  vm.runInContext(ts.transpileModule(notes, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React}}).outputText, context);
  vm.runInContext(exports.THEME_BOOTSTRAP, context);
  return {theme: () => attributes['data-ui-theme'], mount: () => exports.ThemeToggle({}), saved: () => preference, storage: value => {preference = value; window.dispatchEvent({type:'storage',key});}, clear: () => {preference = null; window.dispatchEvent({type:'storage',key:null});}, system: value => {media.matches = value; for(const fn of mediaListeners) fn();}, cleanup: () => {unsubscribe(); assert.equal(mediaListeners.size,0); for(const set of listeners.values()) assert.equal(set.size,0);}};
}
for(const [saved, dark, expected] of [['dark',false,'dark'],['light',true,'light'],[null,true,'dark'],['invalid',false,'light']]) {
 const h = harness(saved,dark); assert.equal(h.theme(),expected,'pre-paint theme'); assert.equal(h.mount().props['aria-pressed'],expected==='dark'); h.cleanup();
}
const h = harness('light'); h.mount().props.onClick(); assert.equal(h.theme(),'dark'); assert.equal(h.saved(),'dark');
// Fresh Notes/Books document on the same origin reads the exact same preference.
assert.equal(harness(h.saved()).theme(),'dark');
h.storage('light'); assert.equal(h.theme(),'light'); h.system(true); assert.equal(h.theme(),'light','explicit preference wins'); h.clear(); assert.equal(h.theme(),'dark'); h.system(false); assert.equal(h.theme(),'light'); h.cleanup();
const blocked = harness(null,true,true); assert.equal(blocked.theme(),'dark'); blocked.mount().props.onClick(); assert.equal(blocked.theme(),'light'); blocked.system(true); assert.equal(blocked.theme(),'light'); blocked.cleanup();
const layout = fs.readFileSync(path.join(root,'src/app/layout.tsx'),'utf8');
assert.match(layout, /<head><ThemeBootstrap \/><\/head>/);
const css = fs.readFileSync(path.join(root,'src/app/site-theme.css'),'utf8');
assert.match(css, /max-width:700px/);
assert.doesNotMatch(css, /--color-(canvas|node|connection)/, 'Never override story palette tokens');
const nav = fs.readFileSync(path.join(root,'src/components/OverviewNavigation.tsx'),'utf8');
assert.match(nav, /<ThemeToggle \/>/);
for(const href of ['/', '/notes/dashboard', '/books']) assert.ok(nav.includes(`href="${href}"`));
console.log('PASS: theme parity, pre-paint preference/system fallback, toggle persistence, storage/clear events, system updates, blocked storage, cleanup, navigation and palette isolation');
