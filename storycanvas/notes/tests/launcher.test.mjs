import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { existsSync } from 'node:fs';
const launcher = new URL('../../bibliarch-books/scripts/start-storycanvas.mjs', import.meta.url);
test('launcher validates ports and refuses an occupied port without killing its owner', async () => {
  assert.ok(existsSync(launcher), 'supervised launcher exists');
  const {parsePort, assertPortAvailable} = await import(launcher);
  assert.equal(parsePort('5202'),5202);
  assert.throws(()=>parsePort('oops'));
  const server = net.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { await assert.rejects(assertPortAvailable(server.address().port), /in use/); assert.equal(server.listening,true); }
  finally { await new Promise(resolve=>server.close(resolve)); }
});
