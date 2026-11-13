// Node-by-node merge, undo history, Recently-deleted restore and fixed template ids.
// Run: node --test tests/safety-net.test.mjs
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import test from 'node:test';

function load(path, modules = {}) {
  const code = ts.transpile(readFileSync(path, 'utf8'), {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022});
  const exports = {};
  new Function('exports', 'require', code)(exports, (m) => modules[m]);
  return exports;
}
const M = load('src/lib/node-merge.ts');
const H = load('src/lib/history.ts');
const R = load('src/lib/restore.ts');

const n = (id, extra = {}) => ({id, x: 0, y: 0, width: 100, height: 50, text: id, ...extra});
const board = (nodes, connections = [], palette = null) => ({nodes, connections, palette});
const ids = (b) => b.nodes.map((x) => x.id);

// ── merge ──────────────────────────────────────────────────────────────────
test('two people editing different cards both survive the save merge', () => {
  const a = n('a'), b = n('b'), c = n('c');
  const start = board([a, b, c]);
  // Alice moved A; Bob edited B and already saved, so the server has Bob's B.
  const alice = board([{...a, x: 50}, b, c]);
  const server = board([a, {...b, text: 'Bob'}, c]);
  const merged = M.mergeBoard(server, alice, M.diffBoards(start, alice));
  assert.equal(merged.nodes.find((x) => x.id === 'a').x, 50);
  assert.equal(merged.nodes.find((x) => x.id === 'b').text, 'Bob');
  assert.deepEqual(ids(merged), ['a', 'b', 'c']);
});

test('my deletes and adds apply; a collaborator\'s new card is kept', () => {
  const a = n('a'), b = n('b');
  const start = board([a, b], [{id: 'k', from: 'a', to: 'b'}]);
  const mine = board([a, n('mine')], []); // deleted b (and its arrow), added "mine"
  const server = board([a, b, n('theirs')], [{id: 'k', from: 'a', to: 'b'}, {id: 'k2', from: 'a', to: 'theirs'}]);
  const cs = M.diffBoards(start, mine);
  assert.deepEqual([...cs.deletedNodes], ['b']);
  assert.deepEqual([...cs.deletedConns], ['k']);
  const merged = M.mergeBoard(server, mine, cs);
  assert.deepEqual(ids(merged), ['a', 'theirs', 'mine']);
  assert.deepEqual(merged.connections.map((c) => c.id), ['k2']);
});

test('palette only overwrites the server when I changed it', () => {
  const s = board([], [], {id: 'server'});
  assert.equal(M.mergeBoard(s, board([], [], {id: 'stale'}), M.emptyChangeSet()).palette.id, 'server');
  const cs = M.emptyChangeSet(); cs.palette = true;
  assert.equal(M.mergeBoard(s, board([], [], {id: 'mine'}), cs).palette.id, 'mine');
});

test('a remote delta never wipes my unsaved edit to a different card', () => {
  const a = n('a'), b = n('b');
  const mine = board([{...a, text: 'typing…'}, b]);
  const delta = {upserts: [{...b, x: 999}], deletedNodes: [], connUpserts: [], deletedConns: []};
  const next = M.applyDelta(mine, delta);
  assert.equal(next.nodes[0].text, 'typing…');
  assert.equal(next.nodes[1].x, 999);
});

test('a remote delta deletes and adds by id, leaving everything else as it was', () => {
  const mine = board([n('a'), n('b')], [{id: 'k', from: 'a', to: 'b'}]);
  const next = M.applyDelta(mine, {upserts: [n('c')], deletedNodes: ['b'], connUpserts: [], deletedConns: ['k']});
  assert.deepEqual(ids(next), ['a', 'c']);
  assert.equal(next.connections.length, 0);
  assert.equal(next.nodes[0], mine.nodes[0], 'untouched cards keep identity');
});

test('their newer change to the same card clears it from my unsaved set', () => {
  const cs = M.emptyChangeSet(); cs.nodes.add('a'); cs.nodes.add('b');
  M.dropChanges(cs, M.changeSetOfDelta({upserts: [n('a')], deletedNodes: [], connUpserts: [], deletedConns: []}));
  assert.deepEqual([...cs.nodes], ['b']);
});

test('addChanges: a later delete cancels an earlier edit and vice versa', () => {
  const x = M.emptyChangeSet(); x.nodes.add('a');
  const y = M.emptyChangeSet(); y.deletedNodes.add('a');
  M.addChanges(x, y);
  assert.deepEqual([...x.nodes], []);
  assert.deepEqual([...x.deletedNodes], ['a']);
});

test('deltaFrom carries exactly the changed cards', () => {
  const b = board([n('a'), n('b')], [], 'p');
  const cs = M.emptyChangeSet(); cs.nodes.add('b'); cs.deletedNodes.add('z'); cs.palette = true;
  const d = M.deltaFrom(b, cs);
  assert.deepEqual(d.upserts.map((x) => x.id), ['b']);
  assert.deepEqual(d.deletedNodes, ['z']);
  assert.equal(d.palette.value, 'p');
});

// ── history ────────────────────────────────────────────────────────────────
function editor() {
  const h = new H.History();
  let cur = board([n('a'), n('b')]);
  let t = 0;
  return {
    h,
    get cur() { return cur; },
    set cur(v) { cur = v; },
    edit(fn, key = 'k', dt = 10) { const before = cur; cur = fn(cur); t += dt; h.record('main', before, cur, key, t); },
    undo() { const s = h.popUndo(); if (s) cur = H.revertStep(cur, s.boards.main.after, s.boards.main.before); return s; },
    redo() { const s = h.popRedo(); if (s) cur = H.revertStep(cur, s.boards.main.before, s.boards.main.after); return s; },
  };
}
const move = (id, x) => (b) => ({...b, nodes: b.nodes.map((y) => (y.id === id ? {...y, x} : y))});

test('undo and redo a single move', () => {
  const e = editor();
  e.edit(move('a', 40));
  assert.equal(e.h.canUndo, true);
  e.undo();
  assert.equal(e.cur.nodes[0].x, 0);
  assert.equal(e.h.canUndo, false);
  assert.equal(e.h.canRedo, true);
  e.redo();
  assert.equal(e.cur.nodes[0].x, 40);
});

test('a whole drag is one step', () => {
  const e = editor();
  e.h.beginGesture();
  for (let x = 1; x <= 30; x++) e.edit(move('a', x), 'main|a|');
  e.edit((b) => ({...b, nodes: b.nodes.filter((y) => y.id !== 'a')}), 'structural:1'); // dropped into a folder
  e.h.endGesture();
  assert.equal(e.h.undoStack.length, 1);
  e.undo();
  assert.deepEqual(ids(e.cur), ['a', 'b']);
  assert.equal(e.cur.nodes[0].x, 0);
});

test('typing coalesces; a pause, another card or a seal starts a new step', () => {
  const e = editor();
  for (const t of ['H', 'He', 'Hel', 'Hell', 'Hello']) e.edit(move('a', t.length), 'main|a|');
  assert.equal(e.h.undoStack.length, 1);
  e.edit(move('a', 9), 'main|a|', H.COALESCE_MS + 1);
  assert.equal(e.h.undoStack.length, 2);
  e.edit(move('b', 9), 'main|b|');
  assert.equal(e.h.undoStack.length, 3);
  e.h.seal();
  e.edit(move('b', 10), 'main|b|');
  assert.equal(e.h.undoStack.length, 4);
});

test('separate drags of the same card are separate steps', () => {
  const e = editor();
  e.h.beginGesture(); e.edit(move('a', 10), 'main|a|'); e.h.endGesture();
  e.h.beginGesture(); e.edit(move('a', 20), 'main|a|'); e.h.endGesture();
  assert.equal(e.h.undoStack.length, 2);
  e.undo();
  assert.equal(e.cur.nodes[0].x, 10);
});

test('undo reverts only my cards: a collaborator\'s later edit to another card survives', () => {
  const e = editor();
  e.edit(move('a', 40));
  e.cur = move('b', 777)(e.cur); // remote change, not recorded
  e.undo();
  assert.equal(e.cur.nodes[0].x, 0);
  assert.equal(e.cur.nodes[1].x, 777);
});

test('undo of a delete puts the card back in its old place, with its arrow', () => {
  const h = new H.History();
  const before = board([n('a'), n('b'), n('c')], [{id: 'k', from: 'a', to: 'b'}]);
  const after = board([n('a'), n('c')].map((x, i) => (i === 0 ? before.nodes[0] : before.nodes[2])), []);
  h.record('main', before, after, 'structural', 1);
  const s = h.popUndo();
  const restored = H.revertStep(after, s.boards.main.after, s.boards.main.before);
  assert.deepEqual(ids(restored), ['a', 'b', 'c']);
  assert.deepEqual(restored.connections.map((c) => c.id), ['k']);
});

test('a new edit clears redo', () => {
  const e = editor();
  e.edit(move('a', 1)); e.undo();
  assert.equal(e.h.canRedo, true);
  e.edit(move('b', 2), 'other');
  assert.equal(e.h.canRedo, false);
});

test('palette changes undo too', () => {
  const e = editor();
  e.edit((b) => ({...b, palette: {id: 'blue'}}), 'pal');
  e.undo();
  assert.equal(e.cur.palette, null);
});

// ── restore ────────────────────────────────────────────────────────────────
test('restoring a deleted list brings its members back into it', () => {
  const list = n('L', {type: 'list', childIds: ['m1', 'm2']});
  const m1 = n('m1', {parentId: 'L'}), m2 = n('m2', {parentId: 'L'});
  const start = board([list, m1, m2, n('x')], [{id: 'k', from: 'L', to: 'x'}]);
  const rec = R.captureDeleted(start, 'L');
  // After the delete: m1 is back on the board un-parented, m2 was deleted separately later.
  const now = board([{...m1, parentId: undefined}, n('x')], []);
  const out = R.restoreDeleted(now, rec);
  assert.deepEqual(ids(out).sort(), ['L', 'm1', 'm2', 'x']);
  assert.equal(out.nodes.find((y) => y.id === 'm1').parentId, 'L');
  assert.equal(out.nodes.find((y) => y.id === 'm2').parentId, 'L');
  assert.deepEqual(out.nodes.find((y) => y.id === 'L').childIds, ['m1', 'm2']);
  assert.deepEqual(out.connections.map((c) => c.id), ['k']);
});

test('restoring a card that is already back does nothing', () => {
  const b = board([n('a')]);
  assert.equal(R.restoreDeleted(b, {node: n('a'), members: [], connections: []}), null);
});

test('a restored list member rejoins its list; an orphan lands on the board', () => {
  const b = board([n('L', {type: 'list', childIds: []})]);
  const out = R.restoreDeleted(b, {node: n('m', {parentId: 'L'}), members: [], connections: []});
  assert.deepEqual(out.nodes.find((y) => y.id === 'L').childIds, ['m']);
  const orphan = R.restoreDeleted(board([]), {node: n('m', {parentId: 'gone'}), members: [], connections: [{id: 'k', from: 'm', to: 'gone'}]});
  assert.equal(orphan.nodes[0].parentId, undefined);
  assert.equal(orphan.connections.length, 0, 'an arrow to a card that no longer exists is not restored');
});

// ── template ids ───────────────────────────────────────────────────────────
test('the same board always gets the same template ids (no duplicate charts)', () => {
  const tpl = {nodes: [{id: 'info', type: 'table', x: 0, y: 0, width: 300, height: 200, tableData: [{col1: 'Name', col2: ''}]}, {id: 'l', type: 'list', childIds: ['c'], x: 0, y: 300, width: 300, height: 100}, {id: 'c', parentId: 'l', x: 0, y: 0, width: 1, height: 1}], connections: []};
  const B = load('src/lib/board-templates.ts', {'./story-templates': {subCanvasTemplates: {character: tpl}}});
  const one = B.instantiateBoardTemplate('character', 'character-canvas-123');
  const two = B.instantiateBoardTemplate('character', 'character-canvas-123');
  const other = B.instantiateBoardTemplate('character', 'character-canvas-456');
  assert.deepEqual(ids(one), ids(two));
  assert.notDeepEqual(ids(one), ids(other));
  assert.equal(one.nodes[1].childIds[0], one.nodes[2].id);
  assert.equal(one.nodes[2].parentId, one.nodes[1].id);
  // Without a seed (old behaviour, still used nowhere new) ids stay unique.
  assert.notDeepEqual(ids(B.instantiateBoardTemplate('character')), ids(one));
});
