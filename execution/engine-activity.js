import fs from 'node:fs/promises';
import path from 'node:path';

const inside = (root, value) => {
  if (!path.isAbsolute(value)) return false;
  const relative = path.relative(root, value);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

// Detect a detached CLI after a service crash. Process arguments and model
// content remain in this backend-only check and are never logged or returned.
export function createEngineActivityCheck({ engineRoot, provider, store, enabled, procRoot = '/proc', platform = process.platform }) {
  const root = path.resolve(engineRoot);
  const stopped = async operation => {
    if (operation.params.provider !== 'codex-cli' || operation.dispatchClaimedAt === null || operation.result?.terminal) return true;
    try {
      const directory = path.join(root, operation.id);
      const dispatch = JSON.parse(await fs.readFile(path.join(directory, 'engine-dispatch.json'), 'utf8'));
      const result = JSON.parse(await fs.readFile(path.join(directory, 'engine-result.json'), 'utf8'));
      const diagnostic = result.diagnostic;
      return dispatch.version === 1 && result.version === 1 && dispatch.engineTaskId === operation.engineTaskId && result.engineTaskId === operation.engineTaskId &&
        /^[a-f0-9]{64}$/.test(dispatch.requestHash || '') && dispatch.requestHash === result.requestHash &&
        (result.outcome === 'SUCCEEDED' || diagnostic &&
          (diagnostic.exitCode === null || Number.isInteger(diagnostic.exitCode)) &&
          typeof diagnostic.timedOut === 'boolean' && typeof diagnostic.spawnFailed === 'boolean' && typeof diagnostic.eventPersistenceFailed === 'boolean');
    } catch { return false; }
  };
  return async () => {
    if (!enabled) return false;
    if (Number(provider.pending) > 0) return true;
    if (platform === 'linux') {
      try {
        const entries = await fs.readdir(procRoot);
        const active = await Promise.all(entries.filter(name => /^\d+$/.test(name)).map(async pid => {
          try {
            const args = (await fs.readFile(path.join(procRoot, pid, 'cmdline'))).toString().split('\0');
            return args.some((arg, index) => ['-C', '--cd'].includes(arg) && inside(root, args[index + 1] || ''));
          } catch (error) { if (['ENOENT', 'ESRCH'].includes(error.code)) return false; throw error; }
        }));
        return active.some(Boolean);
      } catch { /* Without a process view, require durable termination proof. */ }
    }
    const operations = store.listOperations({ states: ['DISPATCHING', 'UNCERTAIN', 'DONE', 'FAILED'], limit: 10000 });
    if (operations.length === 10000) return true;
    for (const operation of operations) if (!await stopped(operation)) return true;
    return false;
  };
}
