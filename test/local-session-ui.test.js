import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../local-session.js', import.meta.url), 'utf8');

function harness(initial = {}) {
  const requests = [], events = [], writes = [];
  const element = () => ({ hidden: false, disabled: false, textContent: '', value: '', required: false, listeners: {}, setAttribute() {}, focus() {}, addEventListener(name, fn) { this.listeners[name] = fn; } });
  const input = element(), field = element(), status = element(), submit = element(), close = element(), button = element();
  const form = { ...element(), reportValidity: () => true };
  const nodes = { form, input, label: field, '.local-session-status': status, '[type="submit"]': submit, '[data-session-close]': close };
  const dialog = { ...element(), open: false, querySelector: key => nodes[key], showModal() { this.open = true; }, close() { this.open = false; this.listeners.close?.(); } };
  let current = { ownerId: 'browser-owner', csrfToken: 'memory-only-csrf', authenticated: false, accessRequired: true, expiresAt: '2027-01-01T00:00:00Z', ...initial };
  const context = vm.createContext({
    AbortSignal,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    document: { createElement: () => dialog, body: { append() {} }, querySelectorAll: () => [button], querySelector: selector => selector === '.analyze-button' ? {} : null },
    sessionStorage: { setItem: (...args) => writes.push(args) }, localStorage: { setItem: (...args) => writes.push(args) },
    window: { dispatchEvent: event => events.push(event) },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (url.endsWith('/unlock')) current = { ...current, authenticated: true };
      return { ok: true, json: async () => ({ ...current }) };
    },
  });
  vm.runInContext(source, context);
  return { context, requests, events, writes, dialog, input, field, submit, form, button, current: () => current };
}

test('LAN unlock uses only a same-origin POST and an in-memory CSRF token', async () => {
  const h = harness();
  await h.context.window.pintuSession.ready();
  assert.equal(h.button.textContent, '解锁本机访问');
  h.input.value = 'one-request-access-code';
  await h.form.listeners.submit({ preventDefault() {} });
  const unlock = h.requests.find(request => request.url === '/api/session/unlock');
  assert.equal(unlock.options.method, 'POST');
  assert.equal(unlock.options.credentials, 'same-origin');
  assert.equal(unlock.options.headers['X-Pintu-CSRF'], 'memory-only-csrf');
  assert.deepEqual(JSON.parse(unlock.options.body), { accessCode: 'one-request-access-code' });
  assert.equal(h.input.value, '');
  assert.equal(h.dialog.open, false);
  assert.equal(h.context.window.pintuSession.session().authenticated, true);
  assert.equal(h.events.some(event => event.type === 'pintu-session-changed'), true);
  assert.deepEqual(h.writes, [], 'access code and CSRF token must never be persisted in browser storage');
  assert.ok(h.requests.every(request => !request.url.includes('one-request-access-code')));
});

test('loopback automatic sessions show a status panel without requesting an access code', async () => {
  const h = harness({ authenticated: true, accessRequired: false });
  await h.context.window.pintuSession.ready();
  assert.equal(h.field.hidden, true);
  assert.equal(h.submit.hidden, true);
  assert.equal(h.input.required, false);
  assert.equal(h.button.textContent, '本机访问已就绪');
  assert.equal(h.context.window.pintuSession.headers()['X-Pintu-CSRF'], 'memory-only-csrf');
});

test('every public page loads the generic session helper before protected status and feedback requests', () => {
  for (const file of ['china-full.html', 'china-workflow.html', 'china-examples.html']) {
    const html = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.match(html, /local-session\.js/);
    assert.doesNotMatch(html, /opc-account|产业 OPC|opc\.css|api\/opc/);
    for (const script of ['codex-status.js', 'assets/feedback/feedback.js']) {
      if (html.includes(script)) assert.ok(html.indexOf('local-session.js') < html.indexOf(script));
    }
  }
});

test('feedback uses the visible homepage actions before navigation hidden on mobile', () => {
  const feedback = readFileSync(new URL('../assets/feedback/feedback.js', import.meta.url), 'utf8');
  const start = feedback.indexOf('  const nav=');
  const snippet = feedback.slice(start, feedback.indexOf('  window.pintuFeedback=', start));
  for (const hasActions of [true, false]) {
    const actions = [], navigation = [], queries = [];
    const context = vm.createContext({
      document: { querySelector: selector => { queries.push(selector); return selector === '.site-actions' ? hasActions ? { append: value => actions.push(value) } : null : { append: value => navigation.push(value) }; }, body: { append() {} } },
      make: () => ({}), open() {},
    });
    vm.runInContext(snippet, context);
    assert.equal(actions.length, hasActions ? 1 : 0);
    assert.equal(navigation.length, hasActions ? 0 : 1);
    assert.equal(queries[0], '.site-actions');
    if (hasActions) assert.equal(queries.length, 1, 'desktop DOM order must not select a hidden earlier navigation');
  }
});
