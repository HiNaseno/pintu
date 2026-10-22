(() => {
  const buttons = [...document.querySelectorAll('[data-generation-status]')];
  if (!buttons.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'service-dialog';
  dialog.setAttribute('aria-labelledby', 'service-title');
  dialog.innerHTML = `<div class="service-eyebrow">PINTU · 生成服务</div><h2 id="service-title">生成服务</h2><p>支持商品分析、图片生成与精修，确认方案后即可开始创作。</p><p class="service-state" role="status" aria-live="polite"></p><div class="service-dialog-actions"><button type="button" data-refresh>重新检查</button><button type="button" data-close>完成</button></div>`;
  document.body.append(dialog);
  const status = dialog.querySelector('.service-state');
  const refresh = dialog.querySelector('[data-refresh]');
  async function check() {
    if (refresh.disabled) return;
    refresh.disabled = true;
    status.textContent = '正在检查生成服务…';
    try {
      if (window.pintuSession) { const local = await window.pintuSession.ready(); if (!local.authenticated) { window.pintuSession.open(); throw new Error("请先解锁本机访问。"); } }
      else {
        const session = await fetch('/api/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (!session.ok) throw new Error('账号会话尚未就绪。');
      }
      const response = await fetch('/api/generation-service', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('服务暂时无法连接，请稍后重试。');
      const state = await response.json();
      buttons.forEach(button => { button.dataset.ready = String(state.ready); button.textContent = state.ready ? '生成服务已连接' : '生成服务待连接'; });
      status.textContent = state.ready ? `生成服务已就绪，可以提交生成任务。${state.pending ? `当前有 ${state.pending} 个任务处理中。` : ''}` : state.error?.message || state.error || '请在服务器配置生成服务后重新检查。';
    } catch (error) {
      buttons.forEach(button => { button.dataset.ready = 'false'; button.textContent = '生成服务待连接'; });
      status.textContent = error.name === 'TimeoutError' ? '连接超时，请稍后重试。' : error.message || '服务暂时无法连接，请稍后重试。';
    } finally { refresh.disabled = false; }
  }
  buttons.forEach(button => button.addEventListener('click', () => { dialog.showModal(); check(); }));
  refresh.addEventListener('click', check);
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } });
  check();
})();
