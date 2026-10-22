import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync, openSync, closeSync, lstatSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { LocalError } from './errors.js';

const STATES = new Set(['CREATED', 'DISPATCHING', 'DONE', 'FAILED', 'UNCERTAIN']);
const final = state => state === 'DONE' || state === 'FAILED';
const fail = (code = 'STORE_VALIDATION') => { throw new LocalError(code, { status: code === 'CONFLICT' ? 409 : 400 }); };
const identifier = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\x00-\x1f]/.test(value) ? value : fail();
const stamp = value => value === null || value === undefined ? null : Number.isSafeInteger(value) && value >= 0 ? value : fail();

export function canonical(value) {
  try {
    const plain = JSON.parse(JSON.stringify(value));
    const ordered = item => Array.isArray(item) ? item.map(ordered) : item && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key, ordered(item[key])])) : item;
    return JSON.stringify(ordered(plain));
  } catch { return fail(); }
}

// Each write is synchronous and transactional. A transaction never spans an
// HTTP request or engine invocation; dispatch ownership is claimed beforehand.
export class ExecutionStore {
  #db; #key; #now;
  constructor({ dbPath, encryptionKey, now = Date.now }) {
    if (!(encryptionKey instanceof Uint8Array) || encryptionKey.length !== 32) fail();
    this.#key = Buffer.from(encryptionKey); this.#now = now;
    try {
      const filename = resolve(dbPath), directory = dirname(filename);
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      if (!lstatSync(directory).isDirectory() || lstatSync(directory).isSymbolicLink()) fail();
      chmodSync(directory, 0o700);
      if (existsSync(filename) && (!lstatSync(filename).isFile() || lstatSync(filename).isSymbolicLink())) fail();
      closeSync(openSync(filename, 'a', 0o600)); chmodSync(filename, 0o600);
      this.#db = new DatabaseSync(filename);
      this.#db.exec(`
        PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
        CREATE TABLE IF NOT EXISTS local_sessions (
          id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, cookie_digest TEXT NOT NULL UNIQUE,
          expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, payload TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS image_operations (
          id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, session_id TEXT, action_key TEXT NOT NULL,
          request_id TEXT NOT NULL UNIQUE, work_hash TEXT NOT NULL,
          image_count INTEGER NOT NULL CHECK(image_count BETWEEN 1 AND 4),
          state TEXT NOT NULL, engine_task_id TEXT, dispatch_claimed_at INTEGER,
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, payload TEXT NOT NULL,
          UNIQUE(owner_id, action_key)
        );
        CREATE INDEX IF NOT EXISTS image_operations_pending ON image_operations(state);
        CREATE TABLE IF NOT EXISTS owned_resources (
          kind TEXT NOT NULL, resource_id TEXT NOT NULL, owner_id TEXT NOT NULL,
          created_at INTEGER NOT NULL, PRIMARY KEY(kind, resource_id)
        );
        CREATE TABLE IF NOT EXISTS action_requests (
          owner_id TEXT NOT NULL, request_id TEXT NOT NULL, kind TEXT NOT NULL,
          resource_id TEXT NOT NULL, work_hash TEXT NOT NULL,
          created_at INTEGER NOT NULL, payload TEXT NOT NULL,
          PRIMARY KEY(owner_id,request_id)
        );
      `);
      for (const file of [filename, `${filename}-wal`, `${filename}-shm`]) if (existsSync(file)) chmodSync(file, 0o600);
    } catch (error) { this.#db?.close(); this.#key.fill(0); throw error instanceof LocalError ? error : new LocalError('STORE_UNAVAILABLE'); }
  }
  #guard(fn) { try { return fn(); } catch (error) { throw error instanceof LocalError ? error : new LocalError('STORE_UNAVAILABLE'); } }
  #transaction(fn) {
    return this.#guard(() => {
      this.#db.exec('BEGIN IMMEDIATE');
      try { const value = fn(); this.#db.exec('COMMIT'); return value; }
      catch (error) { this.#db.exec('ROLLBACK'); throw error; }
    });
  }
  #encrypt(value, context) {
    const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.#key, nonce);
    cipher.setAAD(Buffer.from(context));
    const data = Buffer.concat([cipher.update(canonical(value)), cipher.final()]);
    return ['v1', nonce.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
  }
  #decrypt(value, context) {
    try {
      const [version, nonce, tag, data, extra] = value.split('.');
      if (version !== 'v1' || extra !== undefined) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', this.#key, Buffer.from(nonce, 'base64'));
      decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString());
    } catch { throw new LocalError('STORE_CORRUPT'); }
  }
  #session(row) {
    if (!row) return null;
    const payload = this.#decrypt(row.payload, `session:${row.id}`);
    return { id: row.id, ownerId: row.owner_id, cookieDigest: row.cookie_digest, expiresAt: row.expires_at, createdAt: row.created_at, updatedAt: row.updated_at, authFingerprint: payload.authFingerprint || null };
  }
  createSession({ id = randomUUID(), ownerId = randomUUID(), cookieDigest, csrf, expiresAt, authFingerprint = null }) {
    identifier(id); identifier(ownerId);
    if (!/^[a-f0-9]{64}$/.test(cookieDigest || '') || typeof csrf !== 'string' || !csrf || stamp(expiresAt) === null) fail();
    return this.#transaction(() => {
      if (this.#db.prepare('SELECT id FROM local_sessions WHERE id=? OR cookie_digest=?').get(id, cookieDigest)) fail('CONFLICT');
      const now = this.#now();
      this.#db.prepare('INSERT INTO local_sessions VALUES (?,?,?,?,?,?,?)').run(id, ownerId, cookieDigest, expiresAt, now, now, this.#encrypt({ csrf, authFingerprint }, `session:${id}`));
      return this.getSession(id);
    });
  }
  getSession(id) { return this.#guard(() => this.#session(this.#db.prepare('SELECT * FROM local_sessions WHERE id=?').get(identifier(id)))); }
  getSessionByDigest(value) { return this.#guard(() => this.#session(this.#db.prepare('SELECT * FROM local_sessions WHERE cookie_digest=?').get(identifier(value)))); }
  getSessionSecrets(id) {
    return this.#guard(() => { const row = this.#db.prepare('SELECT * FROM local_sessions WHERE id=?').get(identifier(id)); return row ? this.#decrypt(row.payload, `session:${id}`) : null; });
  }
  updateSession(id, patch) {
    if (!patch || Object.keys(patch).some(key => !['expiresAt', 'authFingerprint'].includes(key))) fail();
    return this.#transaction(() => {
      const current = this.getSession(id); if (!current) return null;
      const payload = { ...this.getSessionSecrets(id), ...patch }, next = { ...current, ...patch };
      if (stamp(next.expiresAt) === null) fail();
      this.#db.prepare('UPDATE local_sessions SET expires_at=?,updated_at=?,payload=? WHERE id=?').run(next.expiresAt, this.#now(), this.#encrypt({ csrf: payload.csrf, authFingerprint: payload.authFingerprint }, `session:${id}`), id);
      return this.getSession(id);
    });
  }
  #operation(row) {
    if (!row) return null;
    return { id: row.id, ownerId: row.owner_id, sessionId: row.session_id, actionKey: row.action_key, requestId: row.request_id, workHash: row.work_hash, imageCount: row.image_count, state: row.state, engineTaskId: row.engine_task_id, dispatchClaimedAt: row.dispatch_claimed_at, createdAt: row.created_at, updatedAt: row.updated_at, ...this.#decrypt(row.payload, `operation:${row.id}`) };
  }
  createOperation({ id = randomUUID(), ownerId, sessionId = null, actionKey, workHash, params, imageCount = 1, requestId = randomUUID() }) {
    for (const value of [id, ownerId, actionKey, requestId]) identifier(value);
    if (sessionId !== null) identifier(sessionId);
    if (!/^[a-f0-9]{64}$/.test(workHash || '') || !Number.isInteger(imageCount) || imageCount < 1 || imageCount > 4 || params === undefined) fail();
    const normalized = canonical(params);
    return this.#transaction(() => {
      const previous = this.getOperationByAction(ownerId, actionKey);
      if (previous) {
        if (previous.workHash !== workHash || previous.imageCount !== imageCount || canonical(previous.params) !== normalized) fail('CONFLICT');
        return { operation: previous, created: false };
      }
      const now = this.#now(), payload = this.#encrypt({ params, result: null, errorCode: null, metadata: {} }, `operation:${id}`);
      this.#db.prepare("INSERT INTO image_operations VALUES (?,?,?,?,?,?,?,'CREATED',NULL,NULL,?,?,?)").run(id, ownerId, sessionId, actionKey, requestId, workHash, imageCount, now, now, payload);
      return { operation: this.getOperation(id), created: true };
    });
  }
  getOperation(id) { return this.#guard(() => this.#operation(this.#db.prepare('SELECT * FROM image_operations WHERE id=?').get(identifier(id)))); }
  getOperationByAction(ownerId, actionKey) { return this.#guard(() => this.#operation(this.#db.prepare('SELECT * FROM image_operations WHERE owner_id=? AND action_key=?').get(identifier(ownerId), identifier(actionKey)))); }
  #update(id, expected, patch) {
    if (!patch || Object.keys(patch).some(key => !['state', 'engineTaskId', 'result', 'errorCode', 'metadata'].includes(key))) fail();
    return this.#transaction(() => {
      const current = this.getOperation(id);
      if (!current || expected !== undefined && current.state !== expected) return null;
      const next = { ...current, ...patch, metadata: { ...current.metadata, ...patch.metadata } };
      if (!STATES.has(next.state) || patch.metadata !== undefined && (!patch.metadata || Array.isArray(patch.metadata))) fail();
      if (final(current.state) && (next.state !== current.state || canonical(next.result) !== canonical(current.result))) fail('CONFLICT');
      if (next.state === 'DISPATCHING' && current.state !== 'DISPATCHING') {
        if (expected !== 'CREATED' || current.dispatchClaimedAt !== null) fail('CONFLICT');
        // The SQLite transaction also protects deployments accidentally started
        // with two Node workers. An in-memory queue alone is insufficient.
        if (this.#db.prepare("SELECT id FROM image_operations WHERE state='DISPATCHING' AND id<>? LIMIT 1").get(id)) return null;
        next.dispatchClaimedAt = this.#now();
      }
      if (current.dispatchClaimedAt !== null && next.state === 'CREATED') fail('CONFLICT');
      if (current.state === 'CREATED' && !['CREATED', 'DISPATCHING', 'FAILED'].includes(next.state)) fail('CONFLICT');
      if (current.engineTaskId !== null && next.engineTaskId !== current.engineTaskId) fail('CONFLICT');
      if (next.engineTaskId !== null) identifier(next.engineTaskId);
      const payload = this.#encrypt({ params: current.params, result: next.result, errorCode: next.errorCode, metadata: next.metadata }, `operation:${id}`);
      this.#db.prepare('UPDATE image_operations SET state=?,engine_task_id=?,dispatch_claimed_at=?,updated_at=?,payload=? WHERE id=?').run(next.state, next.engineTaskId, next.dispatchClaimedAt, this.#now(), payload, id);
      return this.getOperation(id);
    });
  }
  updateOperation(id, patch) { return this.#update(identifier(id), undefined, patch); }
  compareAndSetOperation(id, expected, patch) { return this.#update(identifier(id), expected, patch); }
  listOperations({ ownerId, states, unfinishedOnly = false, limit = 1000 } = {}) {
    return this.#guard(() => {
      if (!Number.isInteger(limit) || limit < 1 || limit > 10000 || states && !Array.isArray(states)) fail();
      const where = [], values = [];
      if (ownerId !== undefined) { where.push('owner_id=?'); values.push(identifier(ownerId)); }
      if (states) { if (!states.length) return []; if (states.some(state => !STATES.has(state))) fail(); where.push(`state IN (${states.map(() => '?').join(',')})`); values.push(...states); }
      if (unfinishedOnly) where.push("state NOT IN ('DONE','FAILED')");
      return this.#db.prepare(`SELECT * FROM image_operations${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at,id LIMIT ?`).all(...values, limit).map(row => this.#operation(row));
    });
  }
  listPending(ownerId) { return this.listOperations({ ownerId, unfinishedOnly: true }); }
  bindResource(kind, id, ownerId) {
    identifier(kind); identifier(id); identifier(ownerId);
    return this.#transaction(() => {
      const previous = this.resourceOwner(kind, id); if (previous !== null && previous !== ownerId) fail('CONFLICT');
      this.#db.prepare('INSERT OR IGNORE INTO owned_resources VALUES (?,?,?,?)').run(kind, id, ownerId, this.#now()); return ownerId;
    });
  }
  resourceOwner(kind, id) { return this.#guard(() => this.#db.prepare('SELECT owner_id FROM owned_resources WHERE kind=? AND resource_id=?').get(identifier(kind), identifier(id))?.owner_id ?? null); }
  getActionRequest(ownerId, requestId) {
    return this.#guard(() => {
      const row = this.#db.prepare('SELECT * FROM action_requests WHERE owner_id=? AND request_id=?').get(identifier(ownerId), identifier(requestId));
      return row ? { ownerId: row.owner_id, requestId: row.request_id, kind: row.kind, resourceId: row.resource_id, workHash: row.work_hash, createdAt: row.created_at, payload: this.#decrypt(row.payload, `action:${row.owner_id}:${row.request_id}`) } : null;
    });
  }
  claimActionRequest({ ownerId, requestId, kind, resourceId, workHash, payload }) {
    for (const value of [ownerId, requestId, kind, resourceId]) identifier(value);
    if (!/^[a-f0-9]{64}$/.test(workHash || '') || payload === undefined) fail();
    return this.#transaction(() => {
      const previous = this.getActionRequest(ownerId, requestId);
      if (previous) {
        if (previous.kind !== kind || previous.resourceId !== resourceId || previous.workHash !== workHash) fail('CONFLICT');
        return { record: previous, created: false };
      }
      this.#db.prepare('INSERT INTO action_requests VALUES (?,?,?,?,?,?,?)').run(ownerId, requestId, kind, resourceId, workHash, this.#now(), this.#encrypt(payload, `action:${ownerId}:${requestId}`));
      return { record: this.getActionRequest(ownerId, requestId), created: true };
    });
  }
  close() { return this.#guard(() => { this.#db.close(); this.#key.fill(0); }); }
}
