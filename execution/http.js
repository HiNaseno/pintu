import crypto from 'node:crypto';
import { LocalError, publicLocalError } from './errors.js';
import { digest, isLoopback, safeEqual, verifyAccessCode, validAccessHash } from './access.js';

export { publicLocalError } from './errors.js';
const cookieName = 'pintu_local_session';
const lifetime = 30 * 86400000;

export function installLocalHttp(app, { store, origins, secureCookie = false, engineMode = 'real', configured = true, accessCodeHash = process.env.PINTU_ACCESS_CODE_HASH || '', now = Date.now }) {
  if (accessCodeHash && !validAccessHash(accessCodeHash)) throw new Error('PINTU_ACCESS_CODE_HASH 格式无效，请使用访问口令工具生成');
  const accepted = new Set(origins), fingerprint = accessCodeHash ? digest(accessCodeHash) : null;
  const acceptedHosts = new Set(origins.map(origin => new URL(origin).host));
  const attempts = new Map();
  const tokenFor = req => String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  const sessionFor = req => {
    const token = tokenFor(req);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) return null;
    const session = store.getSessionByDigest(digest(token));
    return session?.expiresAt > now() ? session : null;
  };
  const localRequest = req => {
    // Once a shared-access code is configured, all browsers must unlock. Also
    // never infer a proxy's client is local from its loopback backend socket.
    if (fingerprint || req.headers['x-forwarded-for'] || req.headers.forwarded || req.headers['x-real-ip']) return false;
    let host;
    try { host = new URL(`http://${req.headers.host}`).hostname.replace(/^\[|\]$/g, ''); } catch { return false; }
    return isLoopback(req.socket.remoteAddress) && ['localhost', '127.0.0.1', '::1'].includes(host);
  };
  const allowed = req => acceptedHosts.has(req.headers.host) && (!req.headers.origin || accepted.has(req.headers.origin));
  const authenticated = (req, session) => Boolean(session && (localRequest(req) || fingerprint && safeEqual(session.authFingerprint, fingerprint)));
  const fail = (res, error) => {
    res.set('Cache-Control', 'private, no-store');
    if (error.retryAfter) res.set('Retry-After', String(error.retryAfter));
    return res.status(error.status || 503).json({ error: publicLocalError(error) });
  };
  const csrfValid = req => accepted.has(req.headers.origin) && safeEqual(req.headers['x-pintu-csrf'], store.getSessionSecrets(req.localSession.id)?.csrf);
  const view = (req, session) => ({ authenticated: authenticated(req, session), accessRequired: !authenticated(req, session), csrfToken: store.getSessionSecrets(session.id)?.csrf, ownerId: session.ownerId, expiresAt: new Date(session.expiresAt).toISOString(), engine: { configured, mode: engineMode } });
  const requireSession = (req, res, next) => {
    if (!allowed(req)) return fail(res, new LocalError('LOCAL_ORIGIN', { status: 403 }));
    req.localSession = sessionFor(req);
    if (!req.localSession) return fail(res, new LocalError('LOCAL_SESSION_REQUIRED', { status: 401 }));
    return next();
  };
  const endpoint = fn => async (req, res) => { try { await fn(req, res); } catch (error) { fail(res, error); } };
  app.use('/api/session', (_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
  app.get('/api/session', endpoint(async (req, res) => {
    if (!allowed(req)) throw new LocalError('LOCAL_ORIGIN', { status: 403 });
    let session = sessionFor(req), token = tokenFor(req);
    if (!session) {
      token = crypto.randomBytes(32).toString('base64url');
      session = store.createSession({ cookieDigest: digest(token), csrf: crypto.randomBytes(32).toString('base64url'), expiresAt: now() + lifetime });
    } else session = store.updateSession(session.id, { expiresAt: now() + lifetime });
    res.cookie(cookieName, token, { httpOnly: true, sameSite: 'strict', secure: secureCookie, path: '/', maxAge: lifetime });
    res.json(view(req, session));
  }));
  app.post('/api/session/unlock', requireSession, endpoint(async (req, res) => {
    if (!csrfValid(req)) throw new LocalError('LOCAL_CSRF', { status: 403 });
    if (!req.body || Object.keys(req.body).some(key => key !== 'accessCode') || typeof req.body.accessCode !== 'string') throw new LocalError('STORE_VALIDATION', { status: 400 });
    if (localRequest(req)) return res.json(view(req, req.localSession));
    if (!fingerprint) throw new LocalError('LOCAL_ACCESS_REQUIRED', { status: 403 });
    // Limit expensive scrypt work as well as guesses. The reverse proxy may
    // share one socket address: this conservative limit still cannot be bypassed
    // by creating fresh cookies or forging forwarding headers.
    const address = req.socket.remoteAddress || 'unknown', window = attempts.get(address);
    if (window && window.until > now() && window.count >= 5) throw new LocalError('LOCAL_ACCESS_REQUIRED', { status: 429, retryAfter: Math.ceil((window.until - now()) / 1000) });
    const entry = window?.until > now() ? window : { count: 0, until: now() + 15 * 60000 };
    entry.count++; attempts.set(address, entry);
    if (attempts.size > 10000) for (const [key, value] of attempts) if (value.until <= now()) attempts.delete(key);
    if (!verifyAccessCode(req.body.accessCode, accessCodeHash)) throw new LocalError('LOCAL_ACCESS_REQUIRED', { status: 403 });
    attempts.delete(address);
    const updated = store.updateSession(req.localSession.id, { authFingerprint: fingerprint });
    res.json(view(req, updated));
  }));
  const protect = (req, res, next) => requireSession(req, res, () => {
    res.set('Cache-Control', 'private, no-store');
    if (!authenticated(req, req.localSession)) return fail(res, new LocalError('LOCAL_ACCESS_REQUIRED', { status: 401 }));
    if (!['GET', 'HEAD'].includes(req.method) && !csrfValid(req)) return fail(res, new LocalError('LOCAL_CSRF', { status: 403 }));
    return next();
  });
  return { fail, sessionFor, protect, localProtect: protect, owns: (req, kind, id) => Boolean(req.localSession && store.resourceOwner(kind, id) === req.localSession.ownerId) };
}
