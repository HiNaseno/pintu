import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { ExecutionStore } from './store.js';
import { LocalGateway, workHash } from './gateway.js';
import { LocalError } from './errors.js';
import { createEngineActivityCheck } from './engine-activity.js';

export async function createLocalRuntime({ runtimeRoot, provider, useCodex, configured: providerConfigured = Boolean(provider?.images?.generate && provider?.images?.edit), env = process.env }) {
  if (await fs.stat(path.join(runtimeRoot, 'opc', 'gateway.sqlite')).catch(() => null)) throw new Error('此目录含旧部署账本，请为通用版使用独立运行目录');
  const root = path.join(runtimeRoot, 'execution');
  await fs.mkdir(root, { recursive: true, mode: 0o700 }); await fs.chmod(root, 0o700);
  const keyFile = path.join(root, 'local-storage.key');
  let key = env.PINTU_ENCRYPTION_KEY;
  if (!key) {
    try { key = await fs.readFile(keyFile, 'utf8'); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const proposed = crypto.randomBytes(32).toString('base64');
      try { await fs.writeFile(keyFile, proposed, { flag: 'wx', mode: 0o600 }); key = proposed; }
      catch (race) { if (race.code !== 'EEXIST') throw race; key = await fs.readFile(keyFile, 'utf8'); }
    }
  }
  const encryptionKey = Buffer.from(key.trim(), 'base64');
  if (encryptionKey.length !== 32) throw new Error('PINTU_ENCRYPTION_KEY 必须是 32 字节随机值的 Base64');
  const engineMode = env.PINTU_ENGINE_MODE || 'real';
  if (!['disabled', 'mock', 'real'].includes(engineMode)) throw new Error('无效的 PINTU_ENGINE_MODE');
  const store = new ExecutionStore({ dbPath: path.join(root, 'tasks.sqlite'), encryptionKey });
  const engineRoot = path.join(root, 'engine'); await fs.mkdir(engineRoot, { recursive: true, mode: 0o700 });
  const directory = operation => path.join(engineRoot, operation.id);
  const configured = engineMode === 'mock' || engineMode === 'real' && providerConfigured;
  const saveResult = async (operation, response) => {
    const dir = directory(operation); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
    if (!Array.isArray(response?.data) || !response.data.length || response.data.length > operation.imageCount) throw new Error('Unverified engine count');
    const files = [];
    for (const [index, image] of response.data.entries()) {
      let payload;
      if (image?.b64_json) payload = Buffer.from(image.b64_json, 'base64');
      else if (typeof image?.url === 'string') {
        let url = image.url;
        for (let redirects = 0; redirects <= 3; redirects++) {
          const target = new URL(url);
          if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password) throw new Error('Invalid image URL');
          const response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(Math.min(Number(env.IMAGE_REQUEST_TIMEOUT_MS || 120000), 120000)) });
          if ([301, 302, 303, 307, 308].includes(response.status)) { await response.body?.cancel(); if (redirects === 3 || !response.headers.get('location')) throw new Error('Image redirect unavailable'); url = new URL(response.headers.get('location'), target).href; continue; }
          if (!response.ok || Number(response.headers.get('content-length') || 0) > 32 * 1024 * 1024) { await response.body?.cancel(); throw new Error('Image download unavailable'); }
          const chunks = []; let size = 0;
          try { for await (const chunk of response.body) { size += chunk.length; if (size > 32 * 1024 * 1024) throw new Error('Image too large'); chunks.push(chunk); } }
          catch (error) { await response.body?.cancel().catch(() => {}); throw error; }
          payload = Buffer.concat(chunks); break;
        }
      }
      if (!payload?.length || payload.length > 32 * 1024 * 1024) throw new Error('Image payload unavailable');
      const bytes = await sharp(payload, { limitInputPixels: 64000000 }).png().toBuffer();
      const filename = path.join(dir, `verified-${index}.png`), temporary = `${filename}.tmp`;
      const handle = await fs.open(temporary, 'w', 0o600);
      try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
      await fs.rename(temporary, filename); files.push(filename);
    }
    const result = { terminal: true, completedCount: files.length, engineTaskId: operation.engineTaskId, files };
    const temporary = path.join(dir, 'local-result.tmp'), handle = await fs.open(temporary, 'w', 0o600);
    try { await handle.writeFile(JSON.stringify(result)); await handle.sync(); } finally { await handle.close(); }
    await fs.rename(temporary, path.join(dir, 'local-result.json'));
    const dirHandle = await fs.open(dir, 'r'); try { await dirHandle.sync(); } finally { await dirHandle.close(); }
    return result;
  };
  const queryEngine = async operation => {
    const dir = directory(operation);
    try {
      const result = JSON.parse(await fs.readFile(path.join(dir, 'local-result.json'), 'utf8'));
      if (result.terminal !== true || result.engineTaskId !== operation.engineTaskId || !Number.isInteger(result.completedCount) || result.completedCount < 1 || result.completedCount > operation.imageCount || !Array.isArray(result.files) || result.files.length !== result.completedCount) throw new Error('Invalid result');
      for (const file of result.files) {
        if (typeof file !== 'string' || path.dirname(file) !== dir || !(await fs.lstat(file)).isFile()) throw new Error('Invalid result file');
        await sharp(file, { limitInputPixels: 64000000 }).metadata();
      }
      return result;
    } catch { /* Query durable provider evidence only; never invoke generation. */ }
    if (operation.params.provider === 'openai-compatible' && Array.isArray(operation.metadata?.providerImageUrls) && operation.metadata.providerImageUrls.length > 0 && operation.metadata.providerImageUrls.length <= operation.imageCount) {
      // Retrying a known artifact download does not re-dispatch generation.
      return saveResult(operation, { data: operation.metadata.providerImageUrls.map(url => ({ url })) });
    }
    if (operation.params.engineMode === 'real' && operation.params.provider === 'codex-cli') {
      try {
        const dispatch = JSON.parse(await fs.readFile(path.join(dir, 'engine-dispatch.json'), 'utf8'));
        const saved = JSON.parse(await fs.readFile(path.join(dir, 'engine-result.json'), 'utf8'));
        const filename = path.join(dir, 'result.png');
        if (dispatch.version !== 1 || saved.version !== 1 || dispatch.engineTaskId !== operation.engineTaskId || saved.engineTaskId !== operation.engineTaskId || !/^[a-f0-9]{64}$/.test(dispatch.requestHash || '') || dispatch.requestHash !== saved.requestHash || saved.outcome !== 'SUCCEEDED' || saved.completedCount !== 1 || !(await fs.lstat(filename)).isFile()) throw new Error('No verified CLI result');
        const bytes = await fs.readFile(filename);
        if (crypto.createHash('sha256').update(bytes).digest('hex') !== saved.resultSha256 || (await sharp(bytes).metadata()).format !== 'png') throw new Error('CLI proof mismatch');
        return saveResult(operation, { data: [{ b64_json: bytes.toString('base64') }] });
      } catch { /* A partial or mismatched proof never establishes failure. */ }
    }
    if (operation.params.engineMode === 'real' && operation.params.provider === 'codex-cli' && useCodex && typeof provider?.queryImageTask === 'function') {
      const response = await provider.queryImageTask(dir);
      if (response.outcome === 'SUCCEEDED' && response.engineTaskId === operation.engineTaskId) return saveResult(operation, response);
    }
    return null;
  };
  const isEngineBusy = createEngineActivityCheck({ engineRoot, provider, store, enabled: engineMode === 'real' && useCodex });
  const gateway = new LocalGateway({ store, queryEngine, isEngineBusy });
  const executeImage = async ({ sessionId, ownerId, actionKey, jobId, request, method = 'generate', context = {} }) => {
    if (!['generate', 'edit'].includes(method)) throw new LocalError('STORE_VALIDATION', { status: 400 });
    const existing = store.getOperationByAction(ownerId, actionKey);
    if ((!existing || existing.state === 'CREATED') && (!configured || engineMode === 'disabled')) throw new LocalError('ENGINE_DISABLED');
    const { image, mask, ...plain } = request;
    const digestFile = async file => file ? { sha256: crypto.createHash('sha256').update(Buffer.from(await file.arrayBuffer())).digest('hex'), type: file.type, size: file.size } : null;
    // Freeze provider identity for replay across configuration changes. A new
    // request with changed content still conflicts against the original digest.
    const params = { jobId, method, engineMode: existing?.params.engineMode || engineMode, provider: existing?.params.provider || (useCodex ? 'codex-cli' : 'openai-compatible'), engineVersion: existing?.params.engineVersion || (useCodex ? { model: provider?.model || '', reasoningEffort: provider?.reasoningEffort || '', adapter: 1 } : { adapter: 1, baseUrl: env.OPENAI_BASE_URL || '' }), request: plain, images: await Promise.all((Array.isArray(image) ? image : [image]).filter(Boolean).map(digestFile)), mask: await digestFile(mask), context };
    const { operation, result } = await gateway.execute({ sessionId, ownerId, actionKey, params, imageCount: request.n || 1, run: async op => {
      if (engineMode !== op.params.engineMode || !configured || engineMode === 'disabled') { const error = new Error('Engine disabled'); error.definitiveFailure = true; throw error; }
      if (engineMode === 'mock') {
        const bytes = await sharp({ create: { width: 512, height: 512, channels: 3, background: '#d6e5dc' } }).png().toBuffer();
        return saveResult(op, { data: Array.from({ length: op.imageCount }, () => ({ b64_json: bytes.toString('base64') })) });
      }
      const dir = directory(op); await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      const response = await provider.images[method]({ ...request, ...(useCodex ? { localEngineTaskId: op.engineTaskId, localEngineDirectory: dir } : {}) }, { timeout: Number(env.IMAGE_REQUEST_TIMEOUT_MS || 120000), maxRetries: 0 });
      if (!useCodex && Array.isArray(response?.data) && response.data.length > 0 && response.data.length <= op.imageCount && response.data.every(image => !image.b64_json && typeof image.url === 'string')) {
        // Signed URLs remain encrypted in the backend ledger. A lost download
        // can then be recovered without a second image-generation request.
        store.updateOperation(op.id, { metadata: { providerImageUrls: response.data.map(image => image.url) } });
      }
      return saveResult(op, response);
    } });
    let data;
    try {
      data = await Promise.all(result.files.map(async file => {
        if (path.dirname(file) !== directory(operation) || !(await fs.lstat(file)).isFile()) throw new Error('Invalid result file');
        const bytes = await fs.readFile(file); await sharp(bytes).metadata(); return { b64_json: bytes.toString('base64') };
      }));
    } catch { throw new LocalError('ENGINE_RESULT_UNAVAILABLE', { status: 409 }); }
    return { data, execution: { operationId: operation.id, pending: operation.state !== 'DONE', state: operation.state }, workHash: workHash(params) };
  };
  const origins = (env.PINTU_ALLOWED_ORIGINS || `http://127.0.0.1:${env.PORT || 5176},http://localhost:${env.PORT || 5176}`).split(',').map(value => value.trim()).filter(Boolean);
  for (const origin of origins) { const url = new URL(origin); if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) throw new Error('PINTU_ALLOWED_ORIGINS 必须是精确网页 Origin'); }
  return { store, gateway, configured, engineMode, executeImage, root, directory, origins, secureCookie: env.PINTU_COOKIE_SECURE === 'true', accessCodeHash: env.PINTU_ACCESS_CODE_HASH || '' };
}
