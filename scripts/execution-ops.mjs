import path from 'node:path';
import 'dotenv/config';
import { createLocalRuntime } from '../execution/runtime.js';

const [command = 'list'] = process.argv.slice(2);
if (!['list', 'reconcile'].includes(command) || process.argv.length > 3) {
  process.stderr.write('用法：node scripts/execution-ops.mjs [list|reconcile]\n'); process.exitCode = 1;
} else {
  // No model provider is constructed. Reconciliation reads saved local result
  // and CLI proof markers only; it cannot submit, guess zero, or change inputs.
  const runtime = await createLocalRuntime({ runtimeRoot: process.env.PINTU_RUNTIME_ROOT || path.resolve('runtime'), provider: null, useCodex: false, env: { ...process.env, PINTU_ENGINE_MODE: 'disabled' } });
  try {
    if (command === 'reconcile') await runtime.gateway.recover();
    const operations = runtime.store.listOperations({ limit: 10000 });
    process.stdout.write(`${JSON.stringify(operations.map(op => ({ id: op.id, requestId: op.requestId, state: op.state, engineTaskId: op.engineTaskId, requestedCount: op.imageCount, completedCount: op.result?.completedCount ?? null, dispatchClaimedAt: op.dispatchClaimedAt, errorCode: op.errorCode })), null, 2)}\n`);
  } finally { runtime.store.close(); }
}
