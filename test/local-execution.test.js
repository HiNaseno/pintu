import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';
import sharp from 'sharp';
import { ExecutionStore } from '../execution/store.js';
import { LocalGateway, workHash } from '../execution/gateway.js';
import { createLocalRuntime } from '../execution/runtime.js';
import { installLocalHttp } from '../execution/http.js';
import { hashAccessCode, verifyAccessCode, digest } from '../execution/access.js';
import { createEngineActivityCheck } from '../execution/engine-activity.js';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'pintu-local-execution-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const key = () => crypto.randomBytes(32);
const session = store => store.createSession({ cookieDigest: digest(crypto.randomUUID()), csrf: crypto.randomUUID(), expiresAt: Date.now() + 86400000 });
const identity = value => ({ ownerId: value.ownerId, sessionId: value.id });
const create = (store, value, actionKey = 'action', params = { prompt: 'private prompt' }) => store.createOperation({ ...identity(value), actionKey, params, workHash: workHash(params) }).operation;
const success = operation => ({ terminal: true, completedCount: 1, files: ['proof.png'], engineTaskId: operation.engineTaskId });

test('encrypted ledger survives restart with session, ownership and request mapping intact', async t => {
  const root = await fixture(t), dbPath = path.join(root, 'tasks.sqlite'), encryptionKey = key();
  let store = new ExecutionStore({ dbPath, encryptionKey });
  const browser = session(store), operation = create(store, browser);
  store.bindResource('job', 'job-a', browser.ownerId);
  const claimed = store.claimActionRequest({ ownerId: browser.ownerId, requestId: 'retry-request', kind: 'image-retry', resourceId: 'job-a:0', workHash: workHash({ prompt: 'private retry prompt' }), payload: { retrySerial: 2, actionKey: 'retry-2' } });
  assert.equal(claimed.created, true); store.close();
  assert.equal((await fs.readFile(dbPath)).includes(Buffer.from('private prompt')), false);
  store = new ExecutionStore({ dbPath, encryptionKey }); t.after(() => store.close());
  assert.equal(store.getSession(browser.id).ownerId, browser.ownerId);
  assert.equal(store.resourceOwner('job', 'job-a'), browser.ownerId);
  assert.equal(store.getOperation(operation.id).params.prompt, 'private prompt');
  assert.equal(store.getActionRequest(browser.ownerId, 'retry-request').payload.retrySerial, 2);
  assert.equal(store.claimActionRequest({ ownerId: browser.ownerId, requestId: 'retry-request', kind: 'image-retry', resourceId: 'job-a:0', workHash: workHash({ prompt: 'private retry prompt' }), payload: { retrySerial: 999 } }).record.payload.retrySerial, 2);
  assert.throws(() => store.claimActionRequest({ ownerId: browser.ownerId, requestId: 'retry-request', kind: 'image-retry', resourceId: 'job-a:1', workHash: workHash({}), payload: {} }), error => error.code === 'CONFLICT');
  assert.throws(() => store.bindResource('job', 'job-a', 'another-owner'), error => error.code === 'CONFLICT');
});

test('two ledger connections cannot claim different engine actions concurrently', async t => {
  const root = await fixture(t), dbPath = path.join(root, 'tasks.sqlite'), encryptionKey = key();
  const first = new ExecutionStore({ dbPath, encryptionKey }), second = new ExecutionStore({ dbPath, encryptionKey });
  t.after(() => { first.close(); second.close(); });
  const browser = session(first), a = create(first, browser, 'a'), b = create(second, browser, 'b');
  assert.equal(first.compareAndSetOperation(a.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: 'engine-a' }).state, 'DISPATCHING');
  assert.equal(second.compareAndSetOperation(b.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: 'engine-b' }), null);
  assert.throws(() => second.updateOperation(a.id, { state: 'CREATED' }), error => error.code === 'CONFLICT');
  first.updateOperation(a.id, { state: 'DONE', result: success(first.getOperation(a.id)) });
  assert.equal(second.compareAndSetOperation(b.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: 'engine-b' }).state, 'DISPATCHING');
  assert.throws(() => second.updateOperation(a.id, { result: { completedCount: 0 } }), error => error.code === 'CONFLICT');
});

test('simultaneous clicks and late retry dispatch exactly once; changed content conflicts', async t => {
  const root = await fixture(t), store = new ExecutionStore({ dbPath: path.join(root, 'tasks.sqlite'), encryptionKey: key() }); t.after(() => store.close());
  const browser = session(store), gateway = new LocalGateway({ store, queryEngine: async () => null });
  let calls = 0, finish;
  const args = { ...identity(browser), actionKey: 'click', params: { prompt: 'original' }, imageCount: 1, run: async op => { calls++; await new Promise(resolve => { finish = resolve; }); return success(op); } };
  const running = gateway.execute(args);
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(gateway.execute(args), error => error.code === 'ENGINE_BUSY');
  finish(); const result = await running;
  assert.equal((await gateway.execute(args)).operation.id, result.operation.id);
  assert.equal(calls, 1);
  await assert.rejects(gateway.execute({ ...args, params: { prompt: 'changed' } }), error => error.code === 'CONFLICT');
});

test('different actions racing through two gateways have one dispatch and one proven-not-started result', async t => {
  const root = await fixture(t), dbPath = path.join(root, 'tasks.sqlite'), encryptionKey = key();
  const storeA = new ExecutionStore({ dbPath, encryptionKey }), storeB = new ExecutionStore({ dbPath, encryptionKey });
  t.after(() => { storeA.close(); storeB.close(); });
  const browser = session(storeA);
  let inspected = 0, allowInspection, finish, calls = 0;
  const inspectedBoth = new Promise(resolve => { allowInspection = resolve; });
  const isEngineBusy = async () => { inspected++; if (inspected === 2) allowInspection(); await inspectedBoth; return false; };
  const a = new LocalGateway({ store: storeA, queryEngine: async () => null, isEngineBusy });
  const b = new LocalGateway({ store: storeB, queryEngine: async () => null, isEngineBusy });
  const run = async op => { calls++; await new Promise(resolve => { finish = resolve; }); return success(op); };
  const args = { ...identity(browser), params: { prompt: 'same prompt, separate actions' }, imageCount: 1, run };
  const first = a.execute({ ...args, actionKey: 'parallel-a' });
  const second = b.execute({ ...args, actionKey: 'parallel-b' });
  // The second caller must be rejected without waiting for the first engine.
  await assert.rejects(second, error => error.code === 'ENGINE_NOT_STARTED');
  const rejected = storeA.getOperationByAction(browser.ownerId, 'parallel-b');
  assert.equal(rejected.state, 'FAILED'); assert.equal(rejected.dispatchClaimedAt, null); assert.equal(rejected.engineTaskId, null);
  assert.equal(b.admissionState(browser.ownerId).admissionBlocked, true);
  assert.equal(b.blocking(browser.ownerId).length, 1);
  finish(); assert.equal((await first).operation.state, 'DONE'); assert.equal(calls, 1);
  assert.equal(b.admissionState(browser.ownerId).admissionBlocked, false);
});

test('capacity rejection before claim remains a final not-started action instead of unknown', async t => {
  const root = await fixture(t), store = new ExecutionStore({ dbPath: path.join(root, 'tasks.sqlite'), encryptionKey: key() }); t.after(() => store.close());
  const browser = session(store), gateway = new LocalGateway({ store, queryEngine: async () => null, isEngineBusy: async () => true });
  let calls = 0;
  await assert.rejects(gateway.execute({ ...identity(browser), actionKey: 'busy-before-claim', params: {}, imageCount: 1, run: async () => { calls++; } }), error => error.code === 'ENGINE_NOT_STARTED');
  const operation = store.getOperationByAction(browser.ownerId, 'busy-before-claim');
  assert.equal(operation.state, 'FAILED'); assert.equal(operation.errorCode, 'ENGINE_NOT_STARTED'); assert.equal(operation.dispatchClaimedAt, null); assert.equal(calls, 0);
  assert.equal(gateway.pending(browser.ownerId).length, 0);
});

test('unknown result stays unknown across recovery and is never executed again', async t => {
  const root = await fixture(t), dbPath = path.join(root, 'tasks.sqlite'), encryptionKey = key();
  let store = new ExecutionStore({ dbPath, encryptionKey }), calls = 0;
  const browser = session(store), args = { ...identity(browser), actionKey: 'timeout', params: { prompt: 'test' }, imageCount: 1, run: async () => { calls++; throw new Error('socket lost'); } };
  let gateway = new LocalGateway({ store, queryEngine: async () => null });
  await assert.rejects(gateway.execute(args), error => error.code === 'ENGINE_RESULT_UNKNOWN');
  store.close(); store = new ExecutionStore({ dbPath, encryptionKey }); t.after(() => store.close());
  gateway = new LocalGateway({ store, queryEngine: async () => null }); await gateway.recover();
  await assert.rejects(gateway.execute(args), error => error.code === 'ENGINE_RESULT_UNKNOWN');
  assert.equal(calls, 1);
  assert.equal(gateway.admissionState(browser.ownerId).pendingReconciliationCount, 1);
  assert.equal(gateway.admissionState(browser.ownerId).admissionBlocked, false);
  const other = await gateway.execute({ ...args, actionKey: 'independent-new', run: async op => success(op) });
  assert.equal(other.operation.state, 'DONE');
});

test('restart reconciles existing proof and never starts a previously claimed task', async t => {
  const root = await fixture(t), store = new ExecutionStore({ dbPath: path.join(root, 'tasks.sqlite'), encryptionKey: key() }); t.after(() => store.close());
  const browser = session(store), op = create(store, browser);
  store.compareAndSetOperation(op.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: 'durable-id' });
  let queries = 0, calls = 0;
  const gateway = new LocalGateway({ store, queryEngine: async operation => { queries++; return success(operation); } });
  await gateway.recover();
  const replay = await gateway.execute({ ...identity(browser), actionKey: op.actionKey, params: op.params, imageCount: 1, run: async () => { calls++; } });
  assert.equal(replay.operation.state, 'DONE'); assert.equal(queries, 1); assert.equal(calls, 0);
});

test('explicit provider rejection is final, but malformed image output remains unknown', async t => {
  let calls = 0;
  const root = await fixture(t), runtime = await createLocalRuntime({ runtimeRoot: root, provider: { images: { generate: async request => { calls++; if (request.prompt === 'malformed') return { data: [{ b64_json: Buffer.from('not an image').toString('base64') }] }; const error = new Error('bad input'); error.status = 400; throw error; }, edit: async () => {} } }, useCodex: false, env: { PINTU_ENGINE_MODE: 'real' } });
  t.after(() => runtime.store.close()); const browser = session(runtime.store);
  const args = { ...identity(browser), actionKey: 'rejected', jobId: 'job', request: { prompt: 'test', n: 1 } };
  await assert.rejects(runtime.executeImage(args), error => error.code === 'ENGINE_FAILED');
  assert.equal(runtime.store.getOperationByAction(browser.ownerId, 'rejected').state, 'FAILED');
  const malformed = { ...args, actionKey: 'malformed', request: { prompt: 'malformed', n: 1 } };
  await assert.rejects(runtime.executeImage(malformed), error => error.code === 'ENGINE_RESULT_UNKNOWN');
  await assert.rejects(runtime.executeImage(malformed), error => error.code === 'ENGINE_RESULT_UNKNOWN');
  assert.equal(calls, 2);
});

test('runtime saves partial success, disables API retries and replays results after restart', async t => {
  const root = await fixture(t), png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'blue' } }).png().toBuffer();
  let calls = 0; const provider = { images: { generate: async (_request, options) => { calls++; assert.equal(options.maxRetries, 0); return { data: [{ b64_json: png.toString('base64') }] }; }, edit: async () => {} } };
  let runtime = await createLocalRuntime({ runtimeRoot: root, provider, useCodex: false, env: { PINTU_ENGINE_MODE: 'real' } });
  const browser = session(runtime.store), args = { ...identity(browser), actionKey: 'partial', jobId: 'job', request: { prompt: 'test', n: 2 } };
  const result = await runtime.executeImage(args); assert.equal(result.data.length, 1); assert.equal(result.execution.state, 'DONE');
  runtime.store.close(); runtime = await createLocalRuntime({ runtimeRoot: root, provider, useCodex: false, env: { PINTU_ENGINE_MODE: 'real' } }); t.after(() => runtime.store.close());
  assert.equal((await runtime.executeImage(args)).data.length, 1); assert.equal(calls, 1);
  const operation = runtime.store.getOperation(result.execution.operationId); await fs.unlink(operation.result.files[0]);
  await assert.rejects(runtime.executeImage(args), error => error.code === 'ENGINE_RESULT_UNAVAILABLE'); assert.equal(calls, 1);
});

test('provider URL output is downloaded, verified and saved locally without a second generation', async t => {
  const root = await fixture(t), png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'green' } }).png().toBuffer();
  const server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(png); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  let calls = 0; const provider = { images: { generate: async () => { calls++; return { data: [{ url: `http://127.0.0.1:${server.address().port}/output.png` }] }; }, edit: async () => {} } };
  const runtime = await createLocalRuntime({ runtimeRoot: root, provider, useCodex: false, env: { PINTU_ENGINE_MODE: 'real' } }); t.after(() => runtime.store.close());
  const browser = session(runtime.store), args = { ...identity(browser), actionKey: 'url-output', jobId: 'job', request: { prompt: 'test' } };
  assert.equal((await runtime.executeImage(args)).data.length, 1); assert.equal((await runtime.executeImage(args)).data.length, 1); assert.equal(calls, 1);
});

test('failed API artifact download is recovered from its encrypted URL without regenerating', async t => {
  const root = await fixture(t), png = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'white' } }).png().toBuffer();
  let downloads = 0, calls = 0;
  const server = http.createServer((_req, res) => { downloads++; if (downloads === 1) return res.destroy(); res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(png); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => new Promise(resolve => server.close(resolve)));
  const provider = { images: { generate: async () => { calls++; return { data: [{ url: `http://127.0.0.1:${server.address().port}/saved.png?signature=example` }] }; }, edit: async () => {} } };
  const runtime = await createLocalRuntime({ runtimeRoot: root, provider, useCodex: false, env: { PINTU_ENGINE_MODE: 'real' } }); t.after(() => runtime.store.close());
  const browser = session(runtime.store), args = { ...identity(browser), actionKey: 'download-lost', jobId: 'job', request: { prompt: 'test' } };
  await assert.rejects(runtime.executeImage(args), error => error.code === 'ENGINE_RESULT_UNKNOWN');
  assert.equal(runtime.store.getOperationByAction(browser.ownerId, args.actionKey).state, 'UNCERTAIN');
  await runtime.gateway.recover();
  assert.equal(runtime.store.getOperationByAction(browser.ownerId, args.actionKey).state, 'DONE');
  assert.equal((await runtime.executeImage(args)).data.length, 1); assert.equal(calls, 1); assert.equal(downloads, 2);
});

test('old deployment runtime directory is refused rather than migrated or claimed', async t => {
  const root = await fixture(t); await fs.mkdir(path.join(root, 'opc')); await fs.writeFile(path.join(root, 'opc', 'gateway.sqlite'), 'old');
  await assert.rejects(createLocalRuntime({ runtimeRoot: root, provider: null, useCodex: false }), /独立运行目录/);
});

test('offline recovery uses exact CLI proof after process death without creating a provider', async t => {
  const root = await fixture(t), runtime = await createLocalRuntime({ runtimeRoot: root, provider: null, useCodex: false, env: { PINTU_ENGINE_MODE: 'disabled' } }); t.after(() => runtime.store.close());
  const browser = session(runtime.store), operation = create(runtime.store, browser, 'cli-crash', { engineMode: 'real', provider: 'codex-cli' });
  const claimed = runtime.store.compareAndSetOperation(operation.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: crypto.randomUUID() });
  const dir = runtime.directory(claimed); await fs.mkdir(dir, { recursive: true });
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: 'red' } }).png().toBuffer(), requestHash = workHash({ test: true });
  await fs.writeFile(path.join(dir, 'engine-dispatch.json'), JSON.stringify({ version: 1, engineTaskId: claimed.engineTaskId, requestHash }));
  await fs.writeFile(path.join(dir, 'result.png'), bytes);
  const proof = { version: 1, engineTaskId: claimed.engineTaskId, requestHash, outcome: 'SUCCEEDED', completedCount: 1, resultSha256: digest(bytes) };
  await fs.writeFile(path.join(dir, 'engine-result.json'), JSON.stringify({ ...proof, engineTaskId: 'another-task' }));
  await runtime.gateway.recover(); assert.equal(runtime.store.getOperation(operation.id).state, 'UNCERTAIN');
  await fs.writeFile(path.join(dir, 'engine-result.json'), JSON.stringify(proof));
  await runtime.gateway.recover(); assert.equal(runtime.store.getOperation(operation.id).state, 'DONE');
  assert.equal(runtime.store.getOperation(operation.id).result.completedCount, 1);
});

async function httpFixture(t, { accessCodeHash = '', host = '127.0.0.1' } = {}) {
  const root = await fixture(t), store = new ExecutionStore({ dbPath: path.join(root, 'tasks.sqlite'), encryptionKey: key() });
  const app = express(); app.use(express.json()); const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port, origin = `http://${host}:${port}`;
  const localHttp = installLocalHttp(app, { store, origins: [origin], accessCodeHash, engineMode: 'mock' });
  app.post('/api/private', localHttp.protect, (req, res) => { store.bindResource('job', req.body.id, req.localSession.ownerId); res.json({ ok: true }); });
  app.get('/api/private/:id', localHttp.protect, (req, res) => res.status(localHttp.owns(req, 'job', req.params.id) ? 200 : 404).json({}));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); store.close(); });
  const request = (pathname, options = {}) => new Promise((resolve, reject) => {
    const outgoing = http.request({ hostname: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers: { Host: `${host}:${port}`, ...(options.method && options.method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...options.headers } }, incoming => {
      const chunks = []; incoming.on('data', chunk => chunks.push(chunk));
      incoming.on('end', () => { const headers = new Headers(); for (const [name, value] of Object.entries(incoming.headers)) for (const item of Array.isArray(value) ? value : [value]) if (item !== undefined) headers.append(name, item); resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers })); });
    });
    outgoing.on('error', reject); outgoing.end(options.body);
  });
  return { request, origin, store };
}

test('local session uses HttpOnly strict 30-day cookie and isolated stable ownership', async t => {
  const { request } = await httpFixture(t);
  const first = await request('/api/session'), second = await request('/api/session');
  const a = await first.json(), b = await second.json(), cookie = first.headers.get('set-cookie').split(';')[0];
  assert.equal(a.authenticated, true); assert.notEqual(a.ownerId, b.ownerId);
  assert.match(first.headers.get('set-cookie'), /HttpOnly/); assert.match(first.headers.get('set-cookie'), /SameSite=Strict/i); assert.match(first.headers.get('set-cookie'), /Max-Age=2592000/);
  assert.equal((await (await request('/api/session', { headers: { Cookie: cookie } })).json()).ownerId, a.ownerId);
  assert.equal((await request('/api/private', { method: 'POST', headers: { Cookie: cookie, 'X-Pintu-CSRF': a.csrfToken }, body: JSON.stringify({ id: 'private-job' }) })).status, 200);
  assert.equal((await request('/api/private/private-job', { headers: { Cookie: second.headers.get('set-cookie').split(';')[0] } })).status, 404);
  assert.equal((await request('/api/private', { method: 'POST', headers: { Cookie: cookie }, body: '{}' })).status, 403);
});

test('reverse-proxied LAN hostname requires backend access code and exact Origin', async t => {
  const code = 'not-a-real-secret-12345', hash = hashAccessCode(code);
  assert.equal(verifyAccessCode(code, hash), true); assert.equal(verifyAccessCode('incorrect', hash), false);
  const { request, origin } = await httpFixture(t, { accessCodeHash: hash, host: 'pintu.example' });
  const initial = await request('/api/session'), state = await initial.json(), cookie = initial.headers.get('set-cookie').split(';')[0];
  assert.equal(state.authenticated, false); assert.equal(state.accessRequired, true);
  assert.equal((await request('/api/private/x', { headers: { Cookie: cookie } })).status, 401);
  assert.equal((await request('/api/session/unlock', { method: 'POST', headers: { Cookie: cookie, Origin: 'http://evil.example', 'X-Pintu-CSRF': state.csrfToken }, body: JSON.stringify({ accessCode: code }) })).status, 403);
  const unlocked = await request('/api/session/unlock', { method: 'POST', headers: { Cookie: cookie, Origin: origin, 'X-Pintu-CSRF': state.csrfToken }, body: JSON.stringify({ accessCode: code }) });
  assert.equal(unlocked.status, 200); assert.equal((await unlocked.json()).authenticated, true);
  assert.equal((await request('/api/private', { method: 'POST', headers: { Cookie: cookie, 'X-Pintu-CSRF': state.csrfToken }, body: JSON.stringify({ id: 'lan-job' }) })).status, 200);
});

test('LAN access is fail-closed without a configured hash', async t => {
  const { request } = await httpFixture(t, { host: 'pintu.example' });
  const response = await request('/api/session'), state = await response.json(), cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal(state.authenticated, false);
  assert.equal((await request('/api/session/unlock', { method: 'POST', headers: { Cookie: cookie, 'X-Pintu-CSRF': state.csrfToken }, body: JSON.stringify({ accessCode: 'some-long-passphrase' }) })).status, 403);
});

test('access-code configuration also protects localhost, and proxy headers never grant local access', async t => {
  const withCode = await httpFixture(t, { accessCodeHash: hashAccessCode('example-long-access-code') });
  assert.equal((await (await withCode.request('/api/session')).json()).authenticated, false);
  const withoutCode = await httpFixture(t);
  assert.equal((await (await withoutCode.request('/api/session', { headers: { 'X-Forwarded-For': '192.0.2.5' } })).json()).authenticated, false);
});

test('HTTP access authorization and owner survive restart; changing the access hash revokes authorization only', async t => {
  const root = await fixture(t), dbPath = path.join(root, 'tasks.sqlite'), encryptionKey = key();
  const firstHash = hashAccessCode('first-example-passphrase'), secondHash = hashAccessCode('second-example-passphrase');
  let running;
  const start = async accessCodeHash => {
    const store = new ExecutionStore({ dbPath, encryptionKey }), app = express(); app.use(express.json());
    const server = http.createServer(app); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    installLocalHttp(app, { store, origins: [origin], accessCodeHash, engineMode: 'mock' });
    return { store, request: (route, options = {}) => fetch(`${origin}${route}`, { ...options, headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers } }), close: async () => { await new Promise(resolve => server.close(resolve)); store.close(); } };
  };
  t.after(async () => { if (running) await running.close(); });
  running = await start(firstHash);
  const initial = await running.request('/api/session'), state = await initial.json(), cookie = initial.headers.get('set-cookie').split(';')[0];
  assert.equal((await running.request('/api/session/unlock', { method: 'POST', headers: { Cookie: cookie, 'X-Pintu-CSRF': state.csrfToken }, body: JSON.stringify({ accessCode: 'first-example-passphrase' }) })).status, 200);
  running.store.bindResource('job', 'before-restart', state.ownerId);
  await running.close(); running = null; running = await start(firstHash);
  const afterRestart = await (await running.request('/api/session', { headers: { Cookie: cookie } })).json();
  assert.equal(afterRestart.authenticated, true); assert.equal(afterRestart.ownerId, state.ownerId);
  assert.ok(Date.parse(afterRestart.expiresAt) > Date.now() + 29 * 86400000);
  assert.equal(running.store.resourceOwner('job', 'before-restart'), state.ownerId);
  await running.close(); running = null; running = await start(secondHash);
  const rotated = await (await running.request('/api/session', { headers: { Cookie: cookie } })).json();
  assert.equal(rotated.authenticated, false); assert.equal(rotated.ownerId, state.ownerId);
});

test('orphan CLI detection blocks a detached engine but exposes no arguments', async t => {
  const root = await fixture(t), engineRoot = path.join(root, 'engine'), procRoot = path.join(root, 'proc');
  await fs.mkdir(path.join(procRoot, '123'), { recursive: true });
  await fs.writeFile(path.join(procRoot, '123', 'cmdline'), `codex\0-C\0${engineRoot}/task\0private prompt\0`);
  const check = createEngineActivityCheck({ engineRoot, provider: { pending: 0 }, store: { listOperations: () => [] }, enabled: true, platform: 'linux', procRoot });
  assert.equal(await check(), true);
  await fs.unlink(path.join(procRoot, '123', 'cmdline')); assert.equal(await check(), false);
});
