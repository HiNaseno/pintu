const messages = {
  LOCAL_SESSION_REQUIRED: '请刷新页面建立本地会话。',
  LOCAL_ACCESS_REQUIRED: '请输入管理员提供的访问口令。',
  LOCAL_CSRF: '会话校验失败，请刷新页面后重试。',
  LOCAL_ORIGIN: '当前访问地址尚未获准，请联系管理员。',
  ENGINE_BUSY: '本机有任务正在处理，请稍后重试。',
  ENGINE_RESULT_UNKNOWN: '原任务结果尚未确认，已保留任务，请勿重复生成。',
  ENGINE_RESULT_UNAVAILABLE: '任务已结束，但保存的图片不可用，请联系管理员核对。',
  ENGINE_NOT_STARTED: '本次任务尚未开始，请稍后重试。',
  ENGINE_DISABLED: '生成引擎尚未配置或已停用，请联系管理员。',
  ENGINE_FAILED: '生成服务明确拒绝了本次请求，请检查配置或输入。',
  CONFLICT: '请求与已保存任务不一致，请刷新查看原任务。',
  STORE_VALIDATION: '本地任务参数无效。',
  STORE_UNAVAILABLE: '本地任务账本暂不可用，请联系管理员。',
  STORE_CORRUPT: '本地任务记录校验失败，请联系管理员。',
};

export class LocalError extends Error {
  constructor(code, { status = 503, retryAfter } = {}) {
    super(messages[code] || '本地服务暂未完成请求，请稍后重试。');
    this.name = 'LocalError';
    this.code = code;
    this.status = status;
    if (retryAfter) this.retryAfter = retryAfter;
  }
}

export function publicLocalError(error) {
  const code = Object.hasOwn(messages, error?.code) ? error.code : 'STORE_UNAVAILABLE';
  return { code, message: messages[code], retryable: !['ENGINE_RESULT_UNKNOWN', 'ENGINE_RESULT_UNAVAILABLE', 'CONFLICT', 'STORE_CORRUPT'].includes(code) };
}
