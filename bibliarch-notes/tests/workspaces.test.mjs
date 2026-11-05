import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
function load(path) {
  const file = new URL(path, root);
  assert.ok(existsSync(file), `${path} must exist`);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exports = {}; new Function('exports', code)(exports); return exports;
}
test('Notes owns /notes and host proxies both root and nested paths', async () => {
  assert.equal(load('next.config.ts').default.basePath, '/notes');
  const routes = await load('../bibliarch-books/next.config.ts').default.rewrites();
  assert.ok(routes.some(r => r.source === '/notes' && r.destination.endsWith('/notes')));
  assert.ok(routes.some(r => r.source === '/notes/:path*' && r.destination.endsWith('/notes/:path*')));
});
test('raw paths are prefixed once and auth returns stay in Notes', () => {
  const {notesPath, authReturnPath} = load('src/lib/paths.ts');
  assert.equal(notesPath('/join/abc'), '/notes/join/abc');
  assert.equal(notesPath('/notes/dashboard'), '/notes/dashboard');
  assert.equal(authReturnPath('/join/abc'), '/join/abc');
  for (const path of ['//evil.test', 'https://evil.test', '/books', '/notes/../books', '/notes/%2e%2e/books', '/notes\\evil', null]) assert.equal(authReturnPath(path), '/dashboard');
});
test('cross-zone departure awaits saving and blocks failed saves', async () => {
  const {saveBeforeLeaving} = load('src/lib/workspace-navigation.ts');
  const events=[];
  assert.equal(await saveBeforeLeaving(async()=>events.push('saved'), ()=>({main:'saved'})), true);
  assert.deepEqual(events,['saved']);
  assert.equal(await saveBeforeLeaving(async()=>{}, ()=>({main:'error'})), false);
  assert.equal(await saveBeforeLeaving(async()=>{throw Error('offline')}, ()=>({})), false);
});
