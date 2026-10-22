import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

// This exercises the real HTTP server and Pi adapter against a standalone fake
// executable. It never invokes the user's CLI profile or any model service.
test('Pi HTTP structured writing uses the isolated CLI and enforces local sessions and CSRF', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pintu-pi-http-'));
  const listener = net.createServer().listen(0, '127.0.0.1');
  await new Promise(resolve => listener.once('listening', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const binary = path.join(root, 'mock-codex'), callsFile = path.join(root, 'text-calls');
  const home = path.join(root, 'home'), temp = path.join(root, 'tmp');
  await fs.mkdir(home, { mode: 0o700 }); await fs.mkdir(temp, { mode: 0o700 });
  await fs.writeFile(binary, `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (Object.keys(process.env).some(key => /^(OPC_|OPENAI_|ANTHROPIC_|PINTU_)/.test(key))) process.exit(10);
if (args[0] === 'login') { console.log('Logged in using ChatGPT'); process.exit(0); }
if (args[args.indexOf('image_generation') - 1] !== '--disable') process.exit(9);
const schema = JSON.parse(fs.readFileSync(args[args.indexOf('--output-schema') + 1]));
if (!schema.properties.suggestion) process.exit(11);
let input=''; process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
 if (!input.includes('品图的电商视觉策划助手')) process.exit(12);
 fs.appendFileSync(${JSON.stringify(callsFile)}, 'text\\n');
 fs.writeFileSync(args[args.indexOf('-o') + 1], JSON.stringify({suggestion:'突出已确认的材质与使用场景。'}));
});
`, { mode: 0o700 });
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: {
    PATH: process.env.PATH, HOME: home, TMPDIR: temp, CODEX_HOME: path.join(home, '.codex'), LANG: 'C.UTF-8',
    NODE_ENV: 'test', AI_PROVIDER: 'pi', CODEX_BIN: binary, CODEX_MODEL: 'gpt-6.1-sol', PORT: String(port), HOST: '127.0.0.1',
    PINTU_RUNTIME_ROOT: path.join(root, 'runtime'), PINTU_ALLOWED_ORIGINS: origin, PINTU_ENGINE_MODE: 'real',
    OPC_GATEWAY_KEY: 'synthetic-secret-never-forward', OPENAI_API_KEY: 'synthetic-secret-never-forward', ANTHROPIC_API_KEY: 'synthetic-secret-never-forward',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  let diagnostics = '';
  child.stdout.on('data', chunk => { diagnostics += chunk; });
  child.stderr.on('data', chunk => { diagnostics += chunk; });
  t.after(async () => {
    if (child.exitCode === null) {
      const exit = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exit;
    }
    await fs.rm(root, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${origin}/api/health`)).ok) { ready = true; break; } } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, `isolated Pi server starts (exit ${child.exitCode})`);
  assert.equal((await fetch(`${origin}/api/generation-service`)).status, 401);
  assert.equal((await fetch(`${origin}/api/assist-writing`, { method: 'POST', body: new FormData() })).status, 401);
  const sessionResponse = await fetch(`${origin}/api/session`);
  assert.equal(sessionResponse.status, 200);
  const cookie = sessionResponse.headers.get('set-cookie').split(';')[0], session = await sessionResponse.json();
  assert.equal(session.authenticated, true); assert.ok(session.csrfToken); assert.ok(session.ownerId);
  assert.match(cookie, /^pintu_local_session=/);
  const service = await (await fetch(`${origin}/api/generation-service`, { headers: { Cookie: cookie } })).json();
  assert.equal(service.provider, 'Pi Agent'); assert.equal(service.ready, true);
  const noCsrf = await fetch(`${origin}/api/assist-writing`, { method: 'POST', body: new FormData(), headers: { Cookie: cookie, Origin: origin } });
  assert.equal(noCsrf.status, 403); assert.equal((await noCsrf.json()).error.code, 'LOCAL_CSRF');
  const wrongOrigin = await fetch(`${origin}/api/assist-writing`, { method: 'POST', body: new FormData(), headers: { Cookie: cookie, Origin: 'http://untrusted.invalid', 'X-Pintu-CSRF': session.csrfToken } });
  assert.equal(wrongOrigin.status, 403);
  const body = new FormData(); body.set('currentText', '强调真实材质');
  const result = await fetch(`${origin}/api/assist-writing`, { method: 'POST', body, headers: { Cookie: cookie, Origin: origin, 'X-Pintu-CSRF': session.csrfToken } });
  assert.equal(result.status, 200); assert.equal((await result.json()).suggestion, '突出已确认的材质与使用场景。');
  assert.equal((await fs.readFile(callsFile, 'utf8')).trim(), 'text', 'only one structured text invocation, no image execution');
  assert.equal((await fetch(`${origin}/api/jobs/11111111-1111-4111-8111-111111111111/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.doesNotMatch(diagnostics, /synthetic-secret-never-forward/);
});
