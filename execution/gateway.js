import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { canonical } from './store.js';
import { LocalError } from './errors.js';

export const workHash = params => crypto.createHash('sha256').update(canonical(params)).digest('hex');
const liveOperations = new Set();
const processIdentity = pid => {
  try {
    const boot = readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
    return `${boot}:${stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19]}`;
  } catch { return null; }
};
const dispatcherIdentity = processIdentity(process.pid);

export class LocalGateway {
  constructor({ store, queryEngine, isEngineBusy = async () => false }) {
    this.store = store; this.queryEngine = queryEngine; this.isEngineBusy = isEngineBusy;
    this.executing = new Set();
  }
  pending(ownerId) { return this.store.listOperations({ ownerId, states: ['DISPATCHING', 'UNCERTAIN'] }); }
  blocking(ownerId) { return this.store.listOperations({ ownerId, states: ['DISPATCHING'] }); }
  admissionState(ownerId) { return { admissionBlocked: this.executing.size > 0 || this.store.listOperations({ states: ['DISPATCHING'], limit: 1 }).length > 0, pendingReconciliationCount: this.pending(ownerId).length }; }
  pendingError(operation) { return new LocalError(this.executing.has(operation?.id) ? 'ENGINE_BUSY' : operation?.state === 'CREATED' ? 'ENGINE_NOT_STARTED' : 'ENGINE_RESULT_UNKNOWN', { status: 409 }); }
  validateSession({ sessionId, ownerId }) {
    const session = this.store.getSession(sessionId);
    if (!session || session.ownerId !== ownerId || session.expiresAt <= Date.now()) throw new LocalError('LOCAL_SESSION_REQUIRED', { status: 401 });
    return session;
  }
  async checkAdmission({ sessionId, ownerId }) {
    this.validateSession({ sessionId, ownerId });
    if (this.executing.size || this.store.listOperations({ states: ['DISPATCHING'], limit: 1 }).length > 0 || await this.isEngineBusy()) throw new LocalError('ENGINE_BUSY', { status: 409 });
    return this.admissionState(ownerId);
  }
  async reconcile(value) {
    const operation = this.store.getOperation(typeof value === 'string' ? value : value.id);
    if (!operation || ['DONE', 'FAILED', 'CREATED'].includes(operation.state) || liveOperations.has(operation.id)) return operation;
    const result = await this.queryEngine(operation).catch(() => null);
    if (result?.terminal && result.completedCount > 0) return this.store.updateOperation(operation.id, { state: 'DONE', result, errorCode: null });
    if (operation.state === 'DISPATCHING' && Number.isSafeInteger(operation.metadata?.dispatcherPid) && operation.metadata.dispatcherPid !== process.pid) {
      try {
        process.kill(operation.metadata.dispatcherPid, 0);
        const identity = processIdentity(operation.metadata.dispatcherPid);
        if (!identity || !operation.metadata.dispatcherIdentity || identity === operation.metadata.dispatcherIdentity) return operation;
      }
      catch (error) { if (error.code !== 'ESRCH') return operation; }
    }
    if (operation.state === 'DISPATCHING') return this.store.updateOperation(operation.id, { state: 'UNCERTAIN', errorCode: 'ENGINE_RESULT_UNKNOWN' });
    return operation;
  }
  async recover() {
    for (const operation of this.store.listOperations({ states: ['DISPATCHING', 'UNCERTAIN'], limit: 10000 })) await this.reconcile(operation);
  }
  async execute({ sessionId, ownerId, actionKey, params, imageCount, run }) {
    this.validateSession({ sessionId, ownerId });
    const { operation: original } = this.store.createOperation({ sessionId, ownerId, actionKey, params, workHash: workHash(params), imageCount });
    let operation = await this.reconcile(original);
    if (operation.state === 'DONE') return { operation, result: operation.result };
    if (operation.state === 'FAILED') throw new LocalError(operation.errorCode || 'ENGINE_FAILED', { status: 422 });
    if (operation.state !== 'CREATED') throw new LocalError(this.executing.has(operation.id) ? 'ENGINE_BUSY' : 'ENGINE_RESULT_UNKNOWN', { status: 409 });
    const rejectUnstarted = () => {
      // A capacity rejection before the durable dispatch claim proves this
      // action did not reach an engine. Do not strand it in UNKNOWN. The CAS
      // must not cancel an identical request another caller already claimed.
      const cancelled = this.store.compareAndSetOperation(original.id, 'CREATED', { state: 'FAILED', errorCode: 'ENGINE_NOT_STARTED' });
      if (cancelled) throw new LocalError('ENGINE_NOT_STARTED', { status: 409 });
      throw this.pendingError(this.store.getOperation(original.id));
    };
    try { await this.checkAdmission({ sessionId, ownerId }); }
    catch (error) { if (error.code === 'ENGINE_BUSY') return rejectUnstarted(); throw error; }
    // checkAdmission can await process inspection; reserve the local slot and
    // durable compare-and-set synchronously afterwards, before another await.
    if (this.executing.size) return rejectUnstarted();
    operation = this.store.compareAndSetOperation(operation.id, 'CREATED', { state: 'DISPATCHING', engineTaskId: crypto.randomUUID(), metadata: { dispatcherPid: process.pid, dispatcherIdentity } });
    if (!operation) return rejectUnstarted();
    this.executing.add(operation.id); liveOperations.add(operation.id);
    try {
      const result = await run(operation);
      if (!result?.terminal || !Number.isInteger(result.completedCount) || result.completedCount < 1 || result.completedCount > imageCount || !Array.isArray(result.files) || result.files.length !== result.completedCount) throw new Error('Unverified engine result');
      operation = this.store.updateOperation(operation.id, { state: 'DONE', result, errorCode: null });
      return { operation, result };
    } catch (error) {
      // A timeout, socket loss, process death or save failure proves nothing
      // about remote generation. Only an explicit request rejection is final.
      const status = Number(error.status || error.statusCode);
      const definitive = error.definitiveFailure === true || [400, 401, 403, 404, 413, 422, 429].includes(status);
      this.store.updateOperation(operation.id, { state: definitive ? 'FAILED' : 'UNCERTAIN', errorCode: definitive ? 'ENGINE_FAILED' : 'ENGINE_RESULT_UNKNOWN' });
      throw new LocalError(definitive ? 'ENGINE_FAILED' : 'ENGINE_RESULT_UNKNOWN', { status: definitive ? 422 : 409 });
    } finally { this.executing.delete(operation.id); liveOperations.delete(operation.id); }
  }
}
