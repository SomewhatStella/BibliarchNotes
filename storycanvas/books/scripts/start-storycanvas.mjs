import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

export function parsePort(value) {
  if (!/^\d+$/.test(String(value)) || +value < 1 || +value > 65535) throw new Error(`Invalid port: ${value}`);
  return +value;
}
export async function assertPortAvailable(port) {
  // localhost may already be served on IPv6 only (especially on Windows).
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', error => {
        if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)) return resolve();
        reject(new Error(`Port ${port} is in use or unavailable (${host}). Stop its existing server yourself; no process was killed.`));
      });
      probe.listen(port, host, () => probe.close(resolve));
    });
  }
}
async function main() {
  const books = fileURLToPath(new URL('../', import.meta.url));
  const notes = path.resolve(books, '../bibliarch-notes');
  const notesPort = parsePort(process.env.NOTES_PORT || '5202');
  const mode = process.argv.includes('--production') ? 'start' : 'dev';
  if (notesPort === 3210) throw new Error('Notes must use a different port than the public site (3210).');
  const origin = `http://127.0.0.1:${notesPort}`;
  if (process.env.NOTES_ORIGIN && process.env.NOTES_ORIGIN !== origin) throw new Error(`Launcher requires NOTES_ORIGIN=${origin}; use NOTES_PORT to change the backend port.`);
  for (const dir of [books, notes]) {
    if (!existsSync(path.join(dir, 'node_modules/next/dist/bin/next'))) throw new Error(`Install dependencies first in ${dir}`);
    if (mode === 'start' && !existsSync(path.join(dir, '.next/BUILD_ID'))) throw new Error(`Build first in ${dir}`);
  }
  // Fail closed: never reuse an unknown server or let Next choose another origin.
  await assertPortAvailable(3210);
  await assertPortAvailable(notesPort);
  const children = [];
  let stopping = false;
  async function stop(code) {
    if (stopping) return;
    stopping = true;
    await Promise.all(children.map(child => new Promise(resolve => {
      if (child.exitCode !== null || !child.pid) return resolve();
      if (process.platform === 'win32') {
        // PID-scoped tree only: Next CLI has its own worker process.
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {stdio:'ignore'});
        killer.once('exit', resolve); killer.once('error', resolve);
      } else {
        try { process.kill(-child.pid, 'SIGTERM'); } catch {}
        child.once('exit', resolve);
        setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch {} resolve(); }, 3000).unref();
      }
    })));
    process.exit(code);
  }
  process.once('SIGINT', () => void stop(0));
  process.once('SIGTERM', () => void stop(0));
  function start(label, dir, port) {
    const child = spawn(process.execPath, [path.join(dir, 'node_modules/next/dist/bin/next'), mode, '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: dir, env: {...process.env, NOTES_PORT:String(notesPort), NOTES_ORIGIN:origin},
      stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    children.push(child);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => process.stdout.write(`[${label}] ${chunk}`));
    child.once('error', error => { console.error(`[${label}] ${error.message}`); void stop(1); });
    child.once('exit', (code, signal) => {
      if (!stopping) { console.error(`[${label}] exited (${signal || code}); shutting down its companion.`); void stop(1); }
    });
  }
  async function ready(url) {
    const deadline = Date.now() + 120000;
    while (!stopping && Date.now() < deadline) {
      try {
        const response = await fetch(url, {redirect:'manual', signal:AbortSignal.timeout(5000)});
        await response.body?.cancel();
        if (response.status >= 200 && response.status < 400) return;
        if (response.status >= 500) throw new Error(`HTTP ${response.status}`);
      } catch { /* startup can still be compiling */ }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    throw new Error(`Readiness timed out: ${url}. Check the server errors above.`);
  }
  try {
    start('notes', notes, notesPort);
    await ready(`${origin}/notes/login`);
    start('site', books, 3210);
    await ready('http://127.0.0.1:3210/');
    await ready('http://127.0.0.1:3210/notes/login');
    console.log('\nStorycanvas ready: http://localhost:3210 — Home / Books / Notes. Ctrl+C stops both owned servers.');
  } catch (error) { console.error(error.message); await stop(1); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
