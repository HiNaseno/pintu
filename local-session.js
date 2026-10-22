(() => {
  let session = null;
  let inFlight = null;
  const dialog = document.createElement('dialog');
  dialog.className = 'local-session-dialog';
  dialog.setAttribute('aria-labelledby', 'local-session-title');
  dialog.innerHTML = `<form><h2 id="local-session-title">本机访问</h2><p class="local-session-description">每个浏览器独立保存作品与任务。内网访问请输入管理员设置的访问口令。</p><label class="local-session-field">访问口令<input type="password" autocomplete="off" required maxlength="256"></label><p class="local-session-status" role="status" aria-live="polite"></p><div class="local-session-actions"><button type="button" data-session-close>关闭</button><button type="submit">解锁访问</button></div></form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const input = dialog.querySelector('input');
  const field = dialog.querySelector('label');
  const status = dialog.querySelector('.local-session-status');
  const submit = dialog.querySelector('[type="submit"]');
  let buttons = [...document.querySelectorAll('[data-local-session]')];
  if (!buttons.length) {
    const nav = document.querySelector('.site-actions,.topbar nav,.site-nav');
    if (nav) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'local-session-button'; button.dataset.localSession = '';
      button.textContent = '本机访问'; nav.append(button); buttons = [button];
    }
  }
  const update = next => {
    const previous = session;
    session = Object.freeze({ ...next, connected: next.authenticated === true });
    buttons.forEach(button => { button.textContent = session.authenticated ? '本机访问已就绪' : '解锁本机访问'; });
    field.hidden = session.authenticated || !session.accessRequired;
    submit.hidden = field.hidden;
    input.required = !field.hidden;
    status.textContent = session.authenticated ? '本机会话已就绪。刷新页面和服务重启后可以继续查看本浏览器的作品。' : '请向本机管理员获取访问口令。';
    if (previous && (previous.ownerId !== session.ownerId || previous.authenticated !== session.authenticated)) {
      window.dispatchEvent(new CustomEvent('pintu-session-changed', { detail: { ownerId: session.ownerId, authenticated: session.authenticated } }));
    }
    window.dispatchEvent(new CustomEvent('pintu-session-updated'));
    return session;
  };
  const refresh = () => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const response = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) });
      const payload = await response.json();
      if (!response.ok || !payload.csrfToken || !payload.ownerId) throw new Error(payload.error?.message || '无法建立本机会话，请稍后重试。');
      return update(payload);
    })().finally(() => { inFlight = null; });
    return inFlight;
  };
  const ready = () => session ? Promise.resolve(session) : refresh();
  const open = () => {
    if (!dialog.open) dialog.showModal();
    void ready().then(() => { if (!field.hidden) input.focus(); }).catch(error => { status.textContent = error.message; });
  };
  buttons.forEach(button => button.addEventListener('click', open));
  dialog.querySelector('[data-session-close]').addEventListener('click', () => { input.value = ''; dialog.close(); });
  dialog.addEventListener('close', () => { input.value = ''; });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    submit.disabled = true; status.textContent = '正在解锁…';
    try {
      const local = await ready();
      // Keep the access code in this single request only, never in storage or a URL.
      const accessCode = input.value;
      input.value = '';
      const response = await fetch('/api/session/unlock', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Pintu-CSRF': local.csrfToken }, body: JSON.stringify({ accessCode }) });
      const payload = await response.json();
      if (!response.ok || !payload.authenticated) throw new Error(payload.error?.message || '解锁失败，请检查访问口令。');
      update(payload); dialog.close();
    } catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  });
  window.pintuSession = Object.freeze({ ready, refresh, session: () => session, headers: () => session?.csrfToken ? { 'X-Pintu-CSRF': session.csrfToken } : {}, open });
  void refresh().then(local => { if (!local.authenticated && document.querySelector('.analyze-button')) open(); }).catch(() => { buttons.forEach(button => { button.textContent = '检查本机访问'; }); });
})();
