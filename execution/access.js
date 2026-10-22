import crypto from 'node:crypto';

const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function hashAccessCode(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 256) throw new Error('访问口令须为 12 至 256 个字符');
  const salt = crypto.randomBytes(16).toString('base64url');
  const key = crypto.scryptSync(value, salt, 32, options).toString('base64url');
  return `scrypt$32768$8$1$${salt}$${key}`;
}

export function validAccessHash(value) {
  return typeof value === 'string' && /^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(value);
}

export function verifyAccessCode(value, hash) {
  if (typeof value !== 'string' || value.length > 256 || !validAccessHash(hash)) return false;
  const [, , , , salt, expected] = hash.split('$');
  return safeEqual(crypto.scryptSync(value, salt, 32, options).toString('base64url'), expected);
}

export function isLoopback(address) {
  return address === '127.0.0.1' || address === '::1' || address?.startsWith('::ffff:127.') || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(address || '');
}
