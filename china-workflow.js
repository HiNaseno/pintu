const modeButtons = document.querySelectorAll("[data-mode]");
const title = document.querySelector(".generator-hero h1");
const subtitle = document.querySelector(".generator-hero p:not(.badge)");
const promptField = document.querySelector("#prompt-field");
const promptLabel = document.querySelector("#prompt-field .field-label-row > span:first-child");
const promptTextarea = document.querySelector(".requirements-input");
const promptHelperButton = document.querySelector(".prompt-helper");
const promptHelperLabel = promptHelperButton?.querySelector("b");
const promptHelperStatus = document.querySelector(".prompt-helper-status");
const uploadTitle = document.querySelector(".upload-card .card-title strong");
const uploadSubtitle = document.querySelector(".upload-card .card-title small");
const uploadCount = document.querySelector(".upload-card .card-title em");
const uploadInput = document.querySelector(".upload-input");
const uploadPreviews = document.querySelector(".upload-previews");
const uploadCard = document.querySelector(".upload-card");
const uploadAddButton = document.querySelector(".upload-add");
const dropzone = document.querySelector(".dropzone");
const dropzoneTitle = document.querySelector(".dropzone strong");
const dropzoneSubtitle = document.querySelector(".dropzone small");
const platformSelect = document.querySelector(".platform-select");
const languageSelect = document.querySelector(".language-select");
const ratioSelect = document.querySelector(".ratio-select");
const actionButton = document.querySelector(".analyze-button");
const progressSteps = Array.from(document.querySelectorAll(".progress-step"));
const resultViews = document.querySelectorAll("[data-result-view]");
const resultHeadTitle = document.querySelector(".result-head strong");
const resultHeadSubtitle = document.querySelector(".result-head small");
const resultPanel = document.querySelector(".result-panel");
const generatorLayout = document.querySelector(".generator-layout");
const resultGrid = document.querySelector(".result-grid");
const galleryCount = document.querySelector(".gallery-count");
const galleryWarning = document.querySelector(".gallery-warning");
const openStudioButton = document.querySelector(".open-studio-button");
const backResultsButton = document.querySelector(".back-results");
const reanalyzeButton = document.querySelector(".reanalyze-button");
const confirmGenerateButton = document.querySelector(".confirm-generate-button");
const retryButton = document.querySelector(".retry-button");
const resetButton = document.querySelector(".reset-button");
const sellingPointsList = document.querySelector(".analysis-selling-points");
const addSellingPointButton = document.querySelector(".add-selling-point");
const styleSuggestions = document.querySelector(".style-suggestions");
const customStyleInput = document.querySelector(".custom-style-input");
const outputPlanList = document.querySelector(".analysis-plan-list");
const studioQueueList = document.querySelector(".studio-queue-list");
const studioQueueCount = document.querySelector(".studio-queue-count");
const editTargetButtons = document.querySelectorAll("[data-edit-target]");
const studioBatchNote = document.querySelector(".studio-batch-note");
const editingTitle = document.querySelector(".editing-title");
const editStage = document.querySelector(".edit-stage");
const editingImage = document.querySelector(".editing-image");
const canvas = document.querySelector(".mask-canvas");
const brushSize = document.querySelector(".brush-size");
const undoMaskButton = document.querySelector(".undo-mask");
const clearMaskButton = document.querySelector(".clear-mask");
const compareButton = document.querySelector(".compare-original");
const versionList = document.querySelector(".version-list");
const finalVersionButton = document.querySelector(".set-final-version");
const chatMessages = document.querySelector(".chat-messages");
const chatInput = document.querySelector(".chat-input");
const sendEditButton = document.querySelector(".send-edit");
const quickPromptButtons = document.querySelectorAll("[data-quick-prompt]");
const lockStateButton = document.querySelector(".lock-state");
const selectionStatus = document.querySelector(".selection-status");
const composerNote = document.querySelector(".composer-note");
const editorBackButton = document.querySelector(".editor-back-results");
const lightbox = document.querySelector(".image-lightbox");
const lightboxImage = document.querySelector(".lightbox-image");
const lightboxType = document.querySelector(".lightbox-type");
const lightboxTitle = document.querySelector("#lightbox-title");
const lightboxMeta = document.querySelector(".lightbox-meta");
const lightboxDownload = document.querySelector(".lightbox-download");
const lightboxRefine = document.querySelector(".lightbox-refine");
const lightboxCloseButtons = document.querySelectorAll("[data-close-lightbox]");

const modeCopy = {
  main: {
    title: "电商主图生成",
    subtitle: "上传真实商品图，先确认主体保护和卖点方案，再生成可上架素材。",
    label: "主图要求",
    placeholder: "请输入商品名称、核心卖点、风格要求、平台用途等",
    uploadTitle: "上传商品素材",
    uploadSubtitle: "支持商品图片、PDF、Word 和文本资料",
    dropzoneTitle: "上传商品素材",
    dropzoneSubtitle: "支持商品图片、PDF、Word 和文本资料",
    action: "生成方案",
  },
  detail: {
    title: "生成详情页图组",
    subtitle: "先策划整套购买故事，再生成各有重点、风格统一的详情页图组。",
    label: "详情页要求",
    placeholder: "建议输入：详情页结构、核心卖点、参数、材质、尺寸、包装和服务说明等",
    uploadTitle: "详情素材",
    uploadSubtitle: "上传产品细节和场景图片",
    dropzoneTitle: "上传细节图、场景图、包装图和参数图",
    dropzoneSubtitle: "素材越完整，详情页结构越清晰",
    action: "分析详情页",
  },
  sku: {
    title: "生成SKU图组",
    subtitle: "上传不同颜色、规格或款式图片，生成适合商品页浏览的SKU图和规格对比图。",
    label: "SKU要求",
    placeholder: "建议输入：SKU颜色、款式、规格、套餐组合、命名方式和对比重点等",
    uploadTitle: "SKU素材",
    uploadSubtitle: "上传不同规格和款式图片",
    dropzoneTitle: "上传颜色、款式、规格和套餐图片",
    dropzoneSubtitle: "建议每个SKU至少上传一张清晰图片",
    action: "分析SKU",
  },
  logo: {
    title: "设计店铺Logo",
    subtitle: "输入店铺名、经营品类和品牌调性，生成适合店招、头像、包装贴纸和详情页使用的Logo方案。",
    label: "Logo要求",
    placeholder: "建议输入：店铺名、主营品类、目标客群、喜欢的风格、品牌关键词、希望避开的颜色或元素等",
    uploadTitle: "品牌素材",
    uploadSubtitle: "上传已有Logo、包装或风格参考",
    dropzoneTitle: "上传已有Logo、店铺截图、包装图或参考图",
    dropzoneSubtitle: "至少上传一张品牌或商品参考图",
    action: "分析品牌",
  },
  style: {
    title: "复刻商品图风格",
    subtitle: "上传参考图和自己的商品图，复刻光影、背景、构图和色彩氛围，生成适合自己商品的视觉方案。",
    label: "复刻要求",
    placeholder: "建议输入：希望参考的风格、需要保留的商品细节、禁止出现的元素、目标平台和输出数量等",
    uploadTitle: "商品与参考图",
    uploadSubtitle: "上传自己的商品图和风格参考图",
    dropzoneTitle: "先上传商品图，再上传参考风格图",
    dropzoneSubtitle: "系统只学习风格结构，不复制品牌素材和具体设计元素",
    action: "分析风格",
  },
  retouch: {
    title: "批量商品精修",
    subtitle: "批量统一商品白底、阴影、色温、清晰度和尺寸，让多款SKU保持同一套视觉标准。",
    label: "精修要求",
    placeholder: "建议输入：是否去背景、背景颜色、阴影强度、是否校色、目标尺寸、文件命名方式等",
    uploadTitle: "待精修图片",
    uploadSubtitle: "上传需要统一处理的商品图片",
    dropzoneTitle: "上传多张商品图、SKU图或旧版素材",
    dropzoneSubtitle: "适合旧图翻新、批量铺货和商品库统一整理",
    action: "分析精修方案",
  },
};

// randomUUID is unavailable on plain HTTP LAN origins; getRandomValues remains available.
const newRequestId = () => {
  const bytes=crypto.getRandomValues(new Uint8Array(16));
  bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
  const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};
const briefState = { data: null, busy: false, pending: null, summaryEdited: false, active: false, pollTimer: null, pollInFlight: false, error: null };
const rewriteState = { jobId: null, request: null, localSnapshot: null, sourceFingerprint: null, appliedRequestId: null, result: null, conflict: false };
const draft = { mode: "main", files: [], previewUrls: [] };

// Submitted task state is independent of the editable left-hand draft.
const state = {
  jobConfig: null,
  view: "empty",
  job: null,
  activeItemIndex: 0,
  activeVersionId: 0,
  selectedEditIndexes: new Set(),
  editTarget: "current",
  hasSelection: false,
  drawing: false,
  lastPoint: null,
  maskHistory: [],
  pollTimer: null,
  pollInFlight: false,
  requestBusy: false,
  restoring: false,
  retryAction: null,
  comparing: false,
  protectionPinned: false,
  refineSubmitting: false,
  refinePending: false,
  reconnectTimer: null,
  selectedStyleIndex: 0,
  customStyleActive: false,
  outputPlan: [],
  lightboxIndex: null,
};

const DRAFT_STORAGE_KEY = "pintu.draft.v1";
const saveDraft = () => {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
      mode: draft.mode, requirements: promptTextarea.value, platform: platformSelect.value,
      language: languageSelect.value, ratio: ratioSelect.value,
    }));
  } catch {}
};
const restoreDraft = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_STORAGE_KEY) || "null");
    if (!saved) return;
    const button = Array.from(modeButtons).find(item => item.dataset.mode === saved.mode);
    if (button) applyMode(button);
    for (const [key, element] of [["requirements", promptTextarea], ["platform", platformSelect], ["language", languageSelect], ["ratio", ratioSelect]]) {
      if (typeof saved[key] === "string" && (element === promptTextarea || Array.from(element.options).some(option => option.value === saved[key]))) element.value = saved[key];
    }
  } catch {}
};
[promptTextarea, platformSelect, languageSelect, ratioSelect].forEach(element => {
  element.addEventListener("input", saveDraft);
  element.addEventListener("change", saveDraft);
});

const draftNotice = document.createElement("p");
draftNotice.className = "draft-status";
draftNotice.setAttribute("role", "status");
draftNotice.hidden = true;
actionButton.before(draftNotice);
const setDraftNotice = (message = "") => {
  draftNotice.textContent = message;
  draftNotice.hidden = !message;
};
const taskSummary = document.createElement("p");
taskSummary.className = "task-summary";
document.querySelector(".result-head").after(taskSummary);
const renderTaskSummary = () => {
  if (state.view === "brief") {
    const config = briefState.data?.fields;
    taskSummary.textContent = config ? `当前问答：${modeCopy[config.mode]?.title || "商品素材"} · ${config.platform || ""} · 使用开始问答时的素材` : "正在准备本次问答的素材快照。";
    return;
  }
  const config = state.jobConfig;
  taskSummary.textContent = config && state.job
    ? `当前任务：${modeCopy[config.mode]?.title || "商品素材"} · ${config.platform || ""} · ${config.language || ""} · ${config.ratio || ""}`
    : "左侧用于准备素材和要求，提交后在这里查看方案与生成结果。";
};
const TASK_STORAGE_KEY = "pintu.active-task.v1";
const executionWaiting = error => error?.code === "ENGINE_RESULT_UNKNOWN";
const executionStatusCopy = code => {
  if (code === "ENGINE_BUSY") return {
    title: "等待本机空闲", short: "本张尚未开始生成",
    message: "本机有其它任务处理中，本张尚未开始生成；请稍后确认重试。本次没有派发，不会自动重新提交。",
  };
  if (code === "ENGINE_RESULT_UNKNOWN") return {
    title: "需要核对原任务", short: "请联系管理员核对原任务",
    message: "原任务的生成结果尚未确认，请联系管理员核对引擎记录和实际图片结果。保留原任务，不重复生成。",
  };
  return null;
};
const executionPendingCode = (job, refinementCode = null) => {
  const codes = [job?.execution?.pending ? job.execution.code || "ENGINE_RESULT_UNKNOWN" : null,
    job?.status !== "completed" ? job?.error?.code : null,
    ...(job?.generationItems || []).filter(item => item.status !== "completed").map(item => item.error?.code),
    ...(job?.refinementRequests || []).filter(item => item.status === "pending").map(item => item.error?.code), refinementCode];
  return codes.includes("ENGINE_RESULT_UNKNOWN") ? "ENGINE_RESULT_UNKNOWN" : null;
};
const newTaskAdmission = (job, session = null) => {
  const connected = !session || session.authenticated === true && (!session.expiresAt || Date.parse(session.expiresAt) > Date.now());
  return job?.execution?.admissionBlocked === false && connected;
};
const currentAccount = () => typeof window === "undefined" ? null : window.pintuSession?.session?.() || null;
const executionTaskCopy = (job = state.job) => {
  const copy = executionStatusCopy(executionPendingCode(job, job === state.job && state.refinePending ? state.refinePendingCode : null) || "ENGINE_RESULT_UNKNOWN");
  const session = currentAccount();
  if (newTaskAdmission(job, session)) return {...copy, message: `可继续新建独立任务；原任务仍待核对。${copy.message}`};
  if (session && !session.authenticated) return {...copy, message: `请先解锁本机访问。${copy.message}`};
  return copy;
};
const executionTaskPending = (job = state.job) => Boolean(job?.status === "reconciling" || job?.execution?.pending || executionWaiting(job?.error) || job?.generationItems?.some(item => item.status === "reconciling" || executionWaiting(item.error)) || job?.refinementRequests?.some(item => item.status === "pending") || state.refinePending);
const taskNotice = document.createElement("p");
taskNotice.className = "task-status";
taskNotice.setAttribute("role", "status");
taskNotice.hidden = true;
document.querySelector(".progress")?.after(taskNotice);
const taskIsRunning = () => ["queued", "generating"].includes(state.job?.status);
const taskIsBusy = () => state.requestBusy || state.restoring || taskIsRunning() || (executionTaskPending() && !newTaskAdmission(state.job, currentAccount())) || state.refineSubmitting || state.rewriteBusy || state.job?.promptRevision?.status === "running";
const setTaskNotice = (message = "") => { taskNotice.textContent = message; taskNotice.hidden = !message; };
const syncTaskControls = () => {
  const busy = taskIsBusy();
  document.querySelector(".brand")?.classList.toggle("is-generating", Boolean(taskIsRunning() || state.refineSubmitting || state.refinePending));
  [reanalyzeButton, resetButton].filter(Boolean).forEach(button => {
    button.disabled = busy;
    button.title = busy ? "可继续编辑左侧草稿，当前任务完成后可提交新任务" : "";
  });
  renderBrief();
  if (typeof renderRewriteControls === "function") renderRewriteControls();
};
const rememberJob = (job) => {
  if (job?.id === state.job?.id && job.results) {
    const previous = new Map((state.job.results || []).map(item => [item.id, item]));
    job.results.forEach(item => {
      const local = previous.get(item.id);
      if (local?.messages) item.messages = local.messages;
      if (local?.finalVersionId !== undefined) item.finalVersionId = local.finalVersionId;
    });
  }
  state.job = job;
  if (typeof reconcileRefinements === "function") reconcileRefinements(job);
  if (job?.config) state.jobConfig = Object.freeze({...job.config});
  if (!job?.id) return;
  const record = JSON.stringify({ id: job.id, mode: state.jobConfig?.mode, config: state.jobConfig });
  renderTaskSummary();
  try { sessionStorage.setItem(TASK_STORAGE_KEY, record); localStorage.setItem(TASK_STORAGE_KEY, record); } catch {}
  const url = new URL(location.href);
  url.searchParams.set("job", job.id);
  url.searchParams.set("mode", draft.mode);
  history.replaceState(null, "", url);
  syncTaskControls();
};
const forgetJob = () => {
  const id = state.job?.id;
  try {
    for (const storage of [sessionStorage, localStorage]) {
      const saved = JSON.parse(storage.getItem(TASK_STORAGE_KEY) || "null");
      if (!id || saved?.id === id) storage.removeItem(TASK_STORAGE_KEY);
    }
  } catch {}
  const url = new URL(location.href); url.searchParams.delete("job");
  history.replaceState(null, "", url);
};

let accountEpoch = 0;
const accountChangedError = () => Object.assign(new Error("本机会话已更改，请重新打开工作台。"), { code: "LOCAL_SESSION_CHANGED" });
const apiRequest = async (url, options = {}) => {
  const epoch = accountEpoch;
  await window.pintuSession?.ready();
  if (epoch !== accountEpoch) throw accountChangedError();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(String(options.method || "GET").toUpperCase())) {
    Object.entries(window.pintuSession?.headers() || {}).forEach(([key, value]) => headers.set(key, value));
  }
  let response;
  try {
    response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  } catch (cause) {
    if (epoch !== accountEpoch) throw accountChangedError();
    const error = new Error(
      window.location.protocol === "file:"
        ? "当前页面以本地文件方式打开，无法连接 AI。请使用 http://localhost:5176/china-workflow.html。"
        : "无法连接本地 AI 服务。请确认项目服务已启动，然后点击重试。"
    );
    error.code = "LOCAL_SERVICE_UNREACHABLE";
    error.retryable = true;
    error.cause = cause;
    throw error;
  }
  const payload = await response.json().catch(() => ({}));
  if (epoch !== accountEpoch) throw accountChangedError();
  if (!response.ok || payload.ok === false || (!payload.id && executionWaiting(payload.error))) {
    const error = new Error(payload?.error?.message || `请求失败：HTTP ${response.status}`);
    error.status = response.status;
    error.requestId = payload?.error?.requestId || null;
    error.code = payload?.error?.code || null;
    error.retryable = Boolean(payload?.error?.retryable);
    if (["LOCAL_SESSION_REQUIRED", "LOCAL_ACCESS_REQUIRED", "LOCAL_CSRF"].includes(error.code)) {
      window.pintuSession?.open();
      void window.pintuSession?.refresh().catch(() => {});
    }
    throw error;
  }
  return payload;
};

const setActionButtonLabel = (label) => {
  if (!actionButton) return;
  const icon = actionButton.querySelector("svg");
  actionButton.textContent = "";
  if (icon) actionButton.append(icon);
  actionButton.append(` ${label}`);
};

const updateProgress = (activeIndex) => {
  const mappedIndex = progressSteps.length === 3
    ? activeIndex >= 3
      ? 2
      : activeIndex >= 2
        ? 1
        : 0
    : activeIndex;
  progressSteps.forEach((step, index) => step.classList.toggle("active", index <= mappedIndex));
};

const setResultView = (view) => {
  state.view = view;
  resultViews.forEach((item) => item.classList.toggle("active", item.dataset.resultView === view));
  resultPanel?.classList.toggle("editor-mode", view === "editor");
  generatorLayout?.classList.toggle("studio-mode", view === "editor");
  document.body.classList.toggle("studio-mode", view === "editor");
  if (backResultsButton) backResultsButton.hidden = true;
  if (resultHeadTitle) {
    resultHeadTitle.textContent = view === "editor" ? "对话精修" : view === "brief" ? "商品识别与问答" : view === "empty" ? "创作画布" : "生成结果";
  }
  if (resultHeadSubtitle) {
    const subtitles = {
      empty: "上传商品图后生成推荐方案",
      brief: "先确认商品信息，再补充真正需要澄清的要求",
      processing: "正在连接真实 AI 服务",
      confirm: "确认分析方案后开始图片生成",
      gallery: "生成结果已暂存，请下载到本机或继续精修",
      editor: "圈选需要调整的位置，通过对话生成新版本",
      error: "本次请求没有产生本地兜底结果",
    };
    resultHeadSubtitle.textContent = subtitles[view] || subtitles.empty;
  }
};

const showProcessing = (heading, copy, progressIndex) => {
  setResultView("processing");
  updateProgress(progressIndex);
  const titleNode = document.querySelector(".processing-result strong");
  const copyNode = document.querySelector(".processing-result p");
  if (titleNode) titleNode.textContent = heading;
  if (copyNode) copyNode.textContent = copy;
};

const showError = (error, retryAction) => {
  if (error.code === "LOCAL_SESSION_CHANGED") return;
  const pendingCopy = executionStatusCopy(error.code);
  state.retryAction = pendingCopy ? pollJob : retryAction;
  if (retryButton) retryButton.textContent = pendingCopy ? "刷新核对状态" : "重试";
  document.querySelector(".error-title").textContent = pendingCopy ? pendingCopy.title : error.status === 422
    ? "修改要求未通过主体保护"
    : error.code === "LOCAL_SERVICE_UNREACHABLE"
      ? "本地 AI 服务未连接"
      : error.code === "AI_QUOTA_EXCEEDED"
        ? "AI 网关额度不足"
      : error.code === "AI_RATE_LIMITED"
        ? "AI 网关限流"
      : error.code === "GATEWAY_TIMEOUT"
        ? "图片通道等待超时"
      : error.retryable || error.code === "AI_CONNECTION_INTERRUPTED"
      ? "生成连接已中断"
      : "AI 请求未完成";
  document.querySelector(".error-message").textContent = pendingCopy ? pendingCopy.message : error.message;
  const requestNode = document.querySelector(".error-request-id");
  requestNode.textContent = error.requestId ? `请求 ID：${error.requestId}` : "";
  setResultView("error");
  if (actionButton) actionButton.disabled = false;
  if (confirmGenerateButton) confirmGenerateButton.disabled = false;
  if (sendEditButton) {
    state.refineSubmitting = false;
    updateEditControls();
  }
  if (error.code === "LOCAL_SERVICE_UNREACHABLE") scheduleReconnect();
};

const scheduleReconnect = () => {
  if (state.reconnectTimer) window.clearTimeout(state.reconnectTimer);
  state.reconnectTimer = window.setTimeout(async () => {
    try {
      await apiRequest("/api/health");
      state.reconnectTimer = null;
      if (state.job?.id) await pollJob();
      else setResultView("empty");
    } catch {
      scheduleReconnect();
    }
  }, 3_000);
};

const clearPoll = () => {
  if (state.pollTimer) window.clearTimeout(state.pollTimer);
  state.pollTimer = null;
};

const clearObjectUrls = () => {
  draft.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  draft.previewUrls = [];
};

const renderUploads = () => {
  clearObjectUrls();
  uploadPreviews.textContent = "";
  draft.files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "upload-preview";
    const isImage = /\.(png|jpe?g|webp)$/i.test(file.name);
    const image = document.createElement(isImage ? "img" : "div");
    image.className = isImage ? "upload-preview-image" : "upload-preview-document";
    if (isImage) {
      const url = URL.createObjectURL(file);
      draft.previewUrls.push(url);
      image.src = url;
      image.alt = file.name;
      image.width = 56;
      image.height = 56;
      image.decoding = "async";
    } else {
      image.textContent = file.name.split(".").pop().toUpperCase();
      image.setAttribute("aria-label", "资料文件");
    }
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = file.name;
    const size = document.createElement("small");
    size.textContent = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
    copy.append(name, size);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.removeUpload = String(index);
    remove.setAttribute("aria-label", `删除 ${file.name}`);
    remove.textContent = "×";
    item.append(image, copy, remove);
    uploadPreviews.append(item);
  });
  uploadCount.textContent = `${draft.files.length}/6`;
  const hasFiles = draft.files.length > 0;
  dropzone.hidden = hasFiles;
  uploadSubtitle.hidden = hasFiles;
  document.querySelector(".material-support").hidden = hasFiles;
  uploadAddButton.hidden = !hasFiles;
  uploadAddButton.disabled = draft.files.length >= 6;
  uploadAddButton.title = draft.files.length >= 6 ? "最多 6 个素材，请先移除一个再添加" : "添加素材";
  uploadCard.classList.toggle("has-materials", hasFiles);
};

const addFiles = (fileList) => {
  let rejected = false;
  setDraftNotice();
  const accepted = Array.from(fileList).filter((file) => {
    if (!/\.(png|jpe?g|webp|pdf|docx?|txt|md|csv|json)$/i.test(file.name)) {
      rejected = true;
      setDraftNotice(`${file.name} 格式不支持，请上传图片、PDF、Word 或文本资料`);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      rejected = true;
      setDraftNotice(`${file.name} 超过 10MB`);
      return false;
    }
    return true;
  });
  if (draft.files.length + accepted.length > 6) {
    rejected = true;
    setDraftNotice("最多上传 6 个文件，超出部分未添加");
  }
  draft.files = [...draft.files, ...accepted].slice(0, 6);
  renderUploads();
  if (!rejected) setDraftNotice();
};

const resetJob = () => {
  if (taskIsBusy()) return;
  forgetJob();
  setTaskNotice();
  clearPoll();
  state.job = null;
  state.jobConfig = null;
  renderTaskSummary();
  state.activeItemIndex = 0;
  state.activeVersionId = 0;
  state.selectedEditIndexes = new Set();
  state.editTarget = "current";
  state.selectedStyleIndex = 0;
  state.customStyleActive = false;
  state.outputPlan = [];
  state.lightboxIndex = null;
  closeLightbox();
  updateProgress(0);
  setResultView("empty");
};

const applyMode = (button) => {
  modeButtons.forEach((item) => item.classList.toggle("active", item === button));
  draft.mode = button.dataset.mode || "main";
  const copy = modeCopy[draft.mode] || modeCopy.main;
  title.textContent = copy.title;
  subtitle.textContent = copy.subtitle;
  if (promptLabel) promptLabel.textContent = copy.label;
  if (promptTextarea) promptTextarea.placeholder = copy.placeholder;
  if (uploadTitle) uploadTitle.textContent = copy.uploadTitle;
  if (uploadSubtitle) uploadSubtitle.textContent = copy.uploadSubtitle;
  if (dropzoneTitle) dropzoneTitle.textContent = copy.dropzoneTitle;
  if (dropzoneSubtitle) dropzoneSubtitle.textContent = copy.dropzoneSubtitle;
  setActionButtonLabel("先聊需求，生成方案");
  const url = new URL(location.href);
  url.searchParams.set("mode", draft.mode);
  history.replaceState(null, "", url);
  syncTaskControls();
};

const buildAnalyzeForm = () => {
  const form = new FormData();
  draft.files.forEach((file) => form.append("images", file, file.name));
  form.set("mode", draft.mode);
  form.set("platform", platformSelect.value);
  form.set("requirements", promptTextarea.value.trim());
  form.set("language", languageSelect.value);
  form.set("ratio", ratioSelect.value);
  return form;
};

const setPromptHelperState = (stateName, message = "") => {
  if (!promptHelperButton) return;
  const loading = stateName === "loading";
  promptHelperButton.disabled = loading;
  promptHelperButton.classList.toggle("loading", loading);
  if (promptHelperLabel) promptHelperLabel.textContent = loading ? "正在帮写" : "AI帮写";
  if (promptHelperStatus) {
    promptHelperStatus.textContent = message;
    promptHelperStatus.classList.toggle("error", stateName === "error");
    promptHelperStatus.classList.toggle("success", stateName === "success");
  }
};

const assistWriting = async () => {
  const form = new FormData();
  draft.files.forEach((file) => form.append("images", file, file.name));
  form.set("mode", draft.mode);
  form.set("platform", platformSelect.value);
  form.set("language", languageSelect.value);
  form.set("ratio", ratioSelect.value);
  form.set("currentText", promptTextarea.value.trim());
  setPromptHelperState(
    "loading",
    draft.files.length ? "正在识别商品并整理要求…" : "正在整理生成要求…"
  );
  try {
    const payload = await apiRequest("/api/assist-writing", { method: "POST", body: form });
    promptTextarea.value = payload.suggestion;
    saveDraft();
    promptTextarea.focus();
    setPromptHelperState(
      "success",
      payload.warnings?.length
        ? `已整理生成要求。${payload.warnings.join("；")}`
        : payload.visionFallback
        ? "图片识别连接不稳定，已按当前设置完成帮写，可继续修改。"
        : payload.usedImages
          ? "已结合上传素材补全，可继续修改。"
          : "已补全生成要求，可继续修改。"
    );
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    setPromptHelperState("error", error.message);
  }
};

const appendTextItems = (container, items) => {
  container.textContent = "";
  items.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    container.append(item);
  });
};

const cleanPoint = (value) => value.replace(/\s+/g, " ").trim().slice(0, 40);

const collectSellingPoints = () =>
  Array.from(document.querySelectorAll(".selling-point-input"))
    .map((input) => cleanPoint(input.value))
    .filter(Boolean)
    .slice(0, 6);

const updateSellingPointControls = () => {
  if (!addSellingPointButton) return;
  addSellingPointButton.disabled = document.querySelectorAll(".selling-point-item").length >= 6;
};

const createSellingPointItem = (text = "") => {
  const item = document.createElement("li");
  item.className = "selling-point-item";
  const input = document.createElement("input");
  input.className = "selling-point-input";
  input.value = cleanPoint(text);
  input.maxLength = 40;
  input.placeholder = "补充卖点";
  input.setAttribute("aria-label", "核心卖点");
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove-selling-point";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "删除卖点");
  item.append(input, remove);
  return item;
};

const renderSellingPoints = (points = []) => {
  if (!sellingPointsList) return;
  sellingPointsList.textContent = "";
  const safePoints = points.map((point) => cleanPoint(String(point))).filter(Boolean).slice(0, 6);
  (safePoints.length ? safePoints : [""]).forEach((point) => sellingPointsList.append(createSellingPointItem(point)));
  updateSellingPointControls();
};

const fallbackStyles = (product = "商品") => [
  {
    name: "干净白底",
    description: `适合${product}快速上架，突出真实结构和细节。`,
    promptHint: "使用明亮白底、柔和阴影、中心构图和简洁中文卖点。",
  },
  {
    name: "浅色高级感",
    description: "适合提升质感和信任感，画面更清爽克制。",
    promptHint: "使用浅灰或米白渐变背景、柔和棚拍光、较大留白和精致排版。",
  },
  {
    name: "场景氛围",
    description: "适合让用户快速理解使用场景和购买理由。",
    promptHint: "围绕商品增加不抢主体的生活化背景、自然光影和轻量场景道具。",
  },
];

const normalizedStyles = (analysis) => {
  const styles = Array.isArray(analysis?.styleSuggestions) ? analysis.styleSuggestions : [];
  const cleanStyles = styles
    .map((style) => ({
      name: String(style?.name || "").trim().slice(0, 30),
      description: String(style?.description || "").trim().slice(0, 120),
      promptHint: String(style?.promptHint || "").trim().slice(0, 240),
      custom: Boolean(style?.custom),
    }))
    .filter((style) => style.name || style.description || style.promptHint)
    .slice(0, 5);
  return cleanStyles.length >= 3 ? cleanStyles : fallbackStyles(analysis?.product);
};

const renderStyleSuggestions = (analysis) => {
  if (!styleSuggestions) return;
  const styles = normalizedStyles(analysis);
  state.selectedStyleIndex = Math.max(0, styles.findIndex(style => style.name === analysis.selectedStyle?.name));
  state.customStyleActive = Boolean(analysis.selectedStyle?.custom);
  if (customStyleInput) customStyleInput.value = state.customStyleActive ? analysis.selectedStyle.promptHint || analysis.selectedStyle.description || "" : "";
  styleSuggestions.textContent = "";
  styles.forEach((style, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "style-card";
    button.dataset.styleIndex = String(index);
    const active = !state.customStyleActive && index === state.selectedStyleIndex;
    button.setAttribute("aria-pressed", String(active));
    if (active) button.classList.add("active");
    const name = document.createElement("strong");
    name.textContent = style.name;
    const description = document.createElement("span");
    description.textContent = style.description;
    button.append(name, description);
    styleSuggestions.append(button);
  });
};

const currentSelectedStyle = () => {
  const customValue = customStyleInput ? customStyleInput.value.trim() : "";
  if (state.customStyleActive && customValue) {
    return {
      name: "自定义风格",
      description: customValue.slice(0, 120),
      promptHint: customValue.slice(0, 240),
      custom: true,
    };
  }
  const styles = normalizedStyles(state.job?.analysis);
  return { ...(styles[state.selectedStyleIndex] || styles[0]), custom: false };
};

const analysisPatch = () => ({
  sellingPoints: collectSellingPoints(),
  selectedStyle: currentSelectedStyle(),
  language: state.jobConfig?.language || "简体中文",
});

const planDefinitions = {
  main: { label: "主图", typeLabel: "商品主图", min: 0, max: 10, roles: ["引流主图", "场景种草", "材质特写", "卖点说明", "SKU 展示"] },
  detail: { label: "详情页", typeLabel: "详情页", min: 0, max: 12, roles: ["详情页首屏", "核心卖点", "材质工艺", "使用场景", "尺寸规格", "SKU 对比"] },
  sku: { label: "SKU 图", typeLabel: "SKU 图", min: 0, max: 8, roles: ["颜色款式", "尺寸规格", "组合对比", "细节差异"] },
  logo: { label: "店铺视觉", typeLabel: "店铺 Logo", min: 0, max: 4, roles: ["店铺头像", "店招横版", "包装贴纸", "详情页角标"] },
};

const planOrder = ["main", "detail", "sku", "logo"];

const normalizePlanType = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("detail") || text.includes("详情")) return "detail";
  if (text.includes("sku") || text.includes("规格")) return "sku";
  if (text.includes("logo") || text.includes("店铺") || text.includes("视觉")) return "logo";
  return "main";
};

const clampCount = (value, min, max) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
};

const normalizeOutputPlan = (analysis) => {
  const incoming = Array.isArray(analysis?.recommendedOutputPlan) ? analysis.recommendedOutputPlan : [];
  const byType = new Map(incoming.map((item) => [normalizePlanType(item?.type || item?.label), item]));
  const fallbackCounts = { main: 3, detail: 2, sku: 1, logo: 0 };
  const plan = planOrder.map((type) => {
    const definition = planDefinitions[type];
    const source = byType.get(type) || {};
    const count = clampCount(source.recommendedCount ?? fallbackCounts[type], definition.min, definition.max);
    const sourceItems = Array.isArray(source.items) ? source.items : [];
    return {
      type,
      label: source.label || definition.label,
      recommendedCount: count,
      min: definition.min,
      max: definition.max,
      reason: String(source.reason || "").trim() || "AI 已根据商品、平台和用途推荐数量。",
      items: Array.from({ length: count }, (_, index) => {
        const item = sourceItems[index] || {};
        const role = String(item.creativeRole || definition.roles[index % definition.roles.length]).trim();
        return {
          pageId: item.pageId || newRequestId(),
          title: String(item.title ?? `${role}${definition.label}`),
          creativeRole: role.slice(0, 40),
          description: String(item.description || `围绕“${role}”生成一张可单独使用的图片。`).trim().slice(0, 140),
          promptHint: String(item.promptHint || ""),
          ...(item.visual ? {visual:{...item.visual}} : {}),
        };
      }),
    };
  });
  if (!plan.some((item) => item.recommendedCount > 0)) {
    plan[0].recommendedCount = 1;
    plan[0].items = [{
      title: "引流主图",
      creativeRole: "引流主图",
      description: "先生成一张可用于点击测试的主图。",
      promptHint: "",
    }];
  }
  return plan;
};

const outputFromPlanItem = (planItem, item, index, previous = {}) => {
  const definition = planDefinitions[planItem.type] || planDefinitions.main;
  const promptHint = previous.prompt || item.promptHint || "";
  const detailRule = planItem.type === "detail"
    ? `这是详情页第 ${index + 1} 屏的独立画面，不要拼成长图。`
    : "";
  const prompt = promptHint || [
    `生成${definition.typeLabel}：${item.title}。`,
    `创意角色：${item.creativeRole}。${item.description}`,
    detailRule,
    state.jobConfig?.language === "无文字（纯视觉）"
      ? "不得新增任何文字，商品原有印刷内容保持不变。"
      : `可以生成${state.jobConfig?.language || "简体中文"}短标题或卖点文字，但必须基于确认信息和图片可见事实。`,
  ].filter(Boolean).join("\n");
  return {
    pageId: previous.pageId || item.pageId || newRequestId(),
    planType: planItem.type,
    type: definition.typeLabel,
    title: String(previous.title ?? item.title ?? ""),
    creativeRole: String(previous.creativeRole || item.creativeRole).trim().slice(0, 60),
    description: String(previous.description || item.description).trim().slice(0, 180),
    prompt: String(prompt),
    ...(previous.visual || item.visual ? {visual:{...(previous.visual || item.visual)}} : {}),
  };
};

const outputsFromPlan = (plan, previousOutputs = []) => {
  const previous = Array.isArray(previousOutputs) ? previousOutputs : [];
  const previousByType = new Map();
  previous.forEach((output) => {
    const key = output.planType || normalizePlanType(output.type);
    if (!previousByType.has(key)) previousByType.set(key, []);
    previousByType.get(key).push(output);
  });
  const outputs = [];
  plan.forEach((planItem) => {
    const definition = planDefinitions[planItem.type] || planDefinitions.main;
    const previousForType = previousByType.get(planItem.type) || [];
    const items = Array.isArray(planItem.items) ? [...planItem.items] : [];
    while (items.length < planItem.recommendedCount) {
      const role = definition.roles[items.length % definition.roles.length];
      items.push({
        pageId: newRequestId(),
        title: `${role}${definition.label}`,
        creativeRole: role,
        description: planItem.type === "detail"
          ? `详情页第 ${items.length + 1} 屏，围绕“${role}”单独成图。`
          : `围绕“${role}”形成独立视觉方向。`,
        promptHint: "",
      });
    }
    planItem.items = items.slice(0, planItem.recommendedCount);
    planItem.items.forEach((item, index) => outputs.push(outputFromPlanItem(planItem, item, index, previousForType[index])));
  });
  return outputs;
};

const planTotalCount = (plan = state.outputPlan) => plan.reduce((total, item) => total + Number(item.recommendedCount || 0), 0);

const updateOutputCount = () => {
  const outputCountNode = document.querySelector(".analysis-output-count");
  if (outputCountNode) outputCountNode.textContent = `${planTotalCount()} 项`;
};

const renderOutputPlan = () => {
  if (!outputPlanList) return;
  outputPlanList.textContent = "";
  state.outputPlan.forEach((planItem) => {
    const card = document.createElement("article");
    card.className = `analysis-plan-item${planItem.recommendedCount ? "" : " muted"}`;
    card.dataset.planType = planItem.type;
    const copy = document.createElement("div");
    copy.className = "analysis-plan-copy";
    const title = document.createElement("strong");
    title.textContent = planItem.label;
    const reason = document.createElement("small");
    reason.textContent = planItem.reason;
    copy.append(title, reason);
    const control = document.createElement("div");
    control.className = "plan-count-control";
    const minus = document.createElement("button");
    minus.type = "button";
    minus.dataset.planStep = "-1";
    minus.dataset.planType = planItem.type;
    minus.textContent = "−";
    minus.setAttribute("aria-label", `减少${planItem.label}数量`);
    const input = document.createElement("input");
    input.className = "analysis-plan-count";
    input.type = "number";
    input.min = String(planItem.min);
    input.max = String(planItem.max);
    input.value = String(planItem.recommendedCount);
    input.dataset.planType = planItem.type;
    input.setAttribute("aria-label", `${planItem.label}数量`);
    const plus = document.createElement("button");
    plus.type = "button";
    plus.dataset.planStep = "1";
    plus.dataset.planType = planItem.type;
    plus.textContent = "+";
    plus.setAttribute("aria-label", `增加${planItem.label}数量`);
    control.append(minus, input, plus);
    card.append(copy, control);
    outputPlanList.append(card);
  });
};

const syncOutputPlanFromInputs = () => {
  state.outputPlan = state.outputPlan.map((planItem) => {
    const input = outputPlanList?.querySelector(`.analysis-plan-count[data-plan-type="${planItem.type}"]`);
    const count = clampCount(input?.value ?? planItem.recommendedCount, planItem.min, planItem.max);
    return { ...planItem, recommendedCount: count };
  });
};

const renderOutputList = (outputs) => {
  const container = document.querySelector(".analysis-outputs");
  if (!container) return;
  container.textContent = "";
  outputs.forEach((output, index) => {
    const item = document.createElement("article");
    item.className = "analysis-output";
    const type = document.createElement("span");
    type.className = "analysis-output-type";
    type.textContent = output.type;
    const main = document.createElement("div");
    main.className = "analysis-output-main";
    const titleInput = document.createElement("input");
    titleInput.className = "analysis-output-title";
    titleInput.value = output.title;
    titleInput.setAttribute("aria-label", `输出 ${index + 1} 标题`);
    const roleInput = document.createElement("input");
    roleInput.className = "analysis-output-role-input";
    roleInput.value = output.creativeRole || "";
    roleInput.placeholder = "创意角色";
    roleInput.setAttribute("aria-label", `输出 ${index + 1} 创意角色`);
    const descriptionInput = document.createElement("textarea");
    descriptionInput.className = "analysis-output-description";
    descriptionInput.value = output.description || "";
    descriptionInput.rows = 2;
    descriptionInput.setAttribute("aria-label", `输出 ${index + 1} 方向说明`);
    main.append(titleInput, roleInput, descriptionInput);
    const visual = document.createElement('div'); visual.className='output-visual';
    for(const [key,label] of [['presence','商品呈现'],['background','背景'],['composition','构图'],['shot','镜头']]) {
      const field=document.createElement('label');field.textContent=label;
      const control=document.createElement(key==='presence'?'select':'input');control.dataset.visual=key;control.dataset.outputIndex=index;
      if(key==='presence') for(const [value,text] of [['full','完整商品'],['detail','局部特写'],['none','不展示商品']]) {const option=document.createElement('option');option.value=value;option.textContent=text;control.append(option);}
      control.value=output.visual?.[key] || (key==='presence'?'full':'');field.append(control);visual.append(field);
    }
    main.append(visual);
    const details = document.createElement("details");
    details.className = "analysis-output-details";
    const summary = document.createElement("summary");
    summary.textContent = "完整指令";
    const promptInput = document.createElement("textarea");
    promptInput.className = "analysis-output-prompt";
    promptInput.value = output.prompt;
    promptInput.maxLength = 16000;
    promptInput.setAttribute("aria-label", `输出 ${index + 1} 生成指令`);
    details.append(summary, promptInput);
    item.append(type, main, details);
    container.append(item);
  });
};

const refreshOutputsFromPlan = () => {
  syncOutputPlanFromInputs();
  const currentOutputs = editedOutputs();
  const outputs = outputsFromPlan(state.outputPlan, currentOutputs);
  if (state.job?.analysis) state.job.analysis.outputs = outputs;
  renderOutputPlan();
  renderOutputList(outputs);
  updateOutputCount();
};

const detailMaterialRoles = {
  primary: "商品全貌", back: "背面／其他角度", detail: "材质与细节",
  specification: "规格与参数", material: "独立材质样片", style: "风格参考", variant: "颜色／款式", other: "其他素材",
};
const isDetailV2 = () => state.job?.workflowVersion === 2 && state.jobConfig?.mode === "detail";
const detailDraftKey = id => `pintu.detail-plan.v2:${id}`;
const detailText = value => String(value ?? "");
const copyDetailOutput = output => ({
  ...output,
  pageId: output.pageId || newRequestId(), planType: "detail", type: "详情页",
  title: detailText(output.title), subtitle: detailText(output.subtitle),
  body: detailText(output.body), buyerQuestion: detailText(output.buyerQuestion),
  facts: Array.isArray(output.facts) ? output.facts.map(detailText) : [],
  referenceIds: [...new Set(output.referenceIds || [])].slice(0, 6),
  referenceCrops: structuredClone(output.referenceCrops || {}),
  visual: { presence: "full", background: "", composition: "", shot: "", ...output.visual },
});
const detailPlanFromOutputs = outputs => [{
  type: "detail", label: "详情页", min: 1, max: 12, recommendedCount: outputs.length,
  reason: "按买家疑问安排阅读顺序，每屏围绕一个重点。",
  items: outputs.map(output => ({ ...output, facts: [...output.facts], referenceIds: [...output.referenceIds], visual: { ...output.visual }, promptHint: output.prompt || "" })),
}];
const initDetailDraft = analysis => {
  if (state.detailDraft?.jobId === state.job.id) return;
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(detailDraftKey(state.job.id)) || "null"); } catch {}
  const materialIds = new Set((state.job.materials || []).map(material => material.referenceId));
  const source = saved?.jobId === state.job.id && Array.isArray(saved.outputs) && saved.outputs.length ? saved : null;
  const strategy = source?.strategy || analysis.strategy || {};
  state.detailDraft = {
    jobId: state.job.id,
    designSystem: structuredClone(source?.designSystem || analysis.designSystem || null),
    materialCoverage: structuredClone(source?.materialCoverage || analysis.materialCoverage || []),
    strategy: {
      audience: detailText(strategy.audience, 1000), purchaseReason: detailText(strategy.purchaseReason, 1000),
      readingFlow: detailText(Array.isArray(strategy.readingFlow) ? strategy.readingFlow.join(" → ") : strategy.readingFlow, 2000),
    },
    outputs: (source?.outputs || analysis.outputs || []).slice(0, 12).map(output => {
      const page = copyDetailOutput(output);
      page.referenceIds = page.referenceIds.filter(id => materialIds.has(id));
      return page;
    }),
    materials: (state.job.materials || []).map(material => {
      const override = source?.materials?.find(item => item.referenceId === material.referenceId);
      return { ...material, role: override?.role || material.role || "other", description: override?.description ?? material.description ?? "", variant: override?.variant ?? material.variant ?? "" };
    }),
  };
};
const saveDetailDraft = () => {
  if (!state.detailDraft) return;
  try { sessionStorage.setItem(detailDraftKey(state.detailDraft.jobId), JSON.stringify(state.detailDraft)); } catch {}
};
const setDetailNotice = (message = "") => {
  const notice = document.querySelector(".detail-plan-notice");
  if (notice) { notice.textContent = message; notice.hidden = !message; }
};
const detailElement = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
const detailField = (label, value, key, { multiline = false, maxLength = 2000, scope = "detailField", options } = {}) => {
  const wrapper = detailElement("label", "detail-field");
  wrapper.append(detailElement("span", "", label));
  const control = detailElement(options ? "select" : multiline ? "textarea" : "input");
  if (options) Object.entries(options).forEach(([id, text]) => { const option = detailElement("option", "", text); option.value = id; control.append(option); });
  else { control.maxLength = maxLength; if (multiline) control.rows = 3; else control.type = "text"; }
  control.dataset[scope] = key;
  control.value = value || "";
  wrapper.append(control);
  return wrapper;
};
const detailButton = (label, action, disabled = false) => {
  const button = detailElement("button", "detail-small-button", label);
  button.type = "button"; button.dataset.detailAction = action; button.disabled = disabled;
  return button;
};
const detailMaterialName = material => {
  const source = material.sourceKind === "pdf_page" ? ` · 第 ${material.ordinal || 1} 页` : material.sourceKind === "docx_image" ? ` · 内嵌图 ${material.ordinal || 1}` : "";
  return `${material.sourceName || "上传素材"}${source}`;
};
const detailThumbnail = material => {
  const image = detailElement("img", "detail-reference-image");
  image.alt = detailMaterialName(material); image.loading = "lazy";
  // Only job-owned preview URLs are accepted, never remote material URLs.
  if (typeof material.thumbnailUrl === "string" && material.thumbnailUrl.startsWith("/") && !material.thumbnailUrl.startsWith("//")) image.src = material.thumbnailUrl;
  return image;
};
const detailDesignLabels={palette:"主辅色",typography:"字体与层级",titlePlacement:"标题区域",spacing:"边距与留白",components:"信息卡片",decorations:"装饰元素",lightMood:"光影色调"};
const renderMaterialCoverage=()=>{
  let container=document.querySelector(".detail-material-coverage");
  if(!container){container=detailElement("section","detail-material-coverage");document.querySelector(".detail-proposal").append(container);}
  container.replaceChildren(detailElement("h3","","材质介绍清单"));
  const items=state.detailDraft.materialCoverage||[],pages=state.detailDraft.outputs;
  if(!items.length)container.append(detailElement("p","detail-help","未提取到已确认的材质介绍项。请先在需求或问答中确认材质；没有实拍时应标为示意，不能凭外观猜测。"));
  items.forEach(item=>{
    const row=detailElement("article","detail-material-coverage-item");const label=detailElement("label","detail-coverage-enable");
    const enabled=detailElement("input");enabled.type="checkbox";enabled.checked=item.enabled;
    enabled.onchange=()=>{item.enabled=enabled.checked;saveDetailDraft();renderMaterialCoverage();};label.append(enabled,detailElement("strong","",`${item.name} · ${item.part}`));row.append(label,detailElement("p","detail-help",`事实依据：${item.evidence}`));
    const choices=detailElement("div","detail-coverage-pages");
    pages.forEach((page,index)=>{const option=detailElement("label"),check=detailElement("input");check.type="checkbox";check.checked=item.pageIds.includes(page.pageId);check.disabled=!item.enabled;
      check.onchange=()=>{item.pageIds=check.checked?[...item.pageIds,page.pageId]:item.pageIds.filter(id=>id!==page.pageId);saveDetailDraft();renderMaterialCoverage();};option.append(check,detailElement("span","",`第 ${index+1} 屏 · ${page.title||page.creativeRole}`));choices.append(option);});
    row.append(choices);
    if(item.enabled && item.pageIds.length && !state.detailDraft.materials.some(material=>["detail","material"].includes(material.role)))row.append(detailElement("p","detail-help","暂无独立材质或细节照片：可为对应屏框选清晰局部；不清晰时补充照片后重新分析，不能凭空补造纹理。"));
    if(item.enabled&&!item.pageIds.length)row.append(detailElement("p","detail-coverage-warning","尚未选择介绍页面：请选择对应屏，或取消该项。"));container.append(row);
  });
};
const renderDetailProposal = () => {
  const strategy = document.querySelector(".detail-strategy-fields");
  strategy.replaceChildren();
  for (const [key, label] of [["audience", "面向谁"], ["purchaseReason", "为什么值得买"], ["readingFlow", "整套阅读顺序"]]) {
    strategy.append(detailField(label, state.detailDraft.strategy[key], key, { multiline: true, scope: "detailStrategy" }));
  }
  if(state.detailDraft.designSystem) {
    strategy.append(detailElement("h3","detail-design-heading","整套设计规范"));
    for(const [key,label]of Object.entries(detailDesignLabels))strategy.append(detailField(label,state.detailDraft.designSystem[key],key,{multiline:true,scope:"detailDesign",maxLength:600}));
    strategy.append(detailElement("p","detail-help","整套保留标题位置、边距、信息卡片和光影色调；具体场景与镜头按每屏主题变化。修改后需重新确认，不额外生图扣额。"));
  }
  renderMaterialCoverage();
  const library = document.querySelector(".detail-materials"); library.replaceChildren();
  if (!state.detailDraft.materials.length) library.append(detailElement("p", "", "本次只有文字资料，画面将按已确认信息生成示意。"));
  state.detailDraft.materials.forEach(material => {
    const card = detailElement("article", "detail-material-editor"); card.dataset.materialId = material.referenceId;
    card.append(detailThumbnail(material), detailElement("strong", "", detailMaterialName(material)));
    card.append(detailField("素材用途", material.role, "role", { scope: "detailMaterial", options: detailMaterialRoles }));
    card.append(detailField("素材说明", material.description, "description", { scope: "detailMaterial", maxLength: 500 }));
    card.append(detailField("对应颜色／款式（选填）", material.variant, "variant", { scope: "detailMaterial", maxLength: 100 }));
    library.append(card);
  });
};
const renderDetailReferences = (page, card) => {
  const group = detailElement("fieldset", "detail-references");
  group.append(detailElement("legend", "", "本屏参考图"));
  if (page.visual.presence === "none") group.append(detailElement("p", "detail-help", "不展示整件商品或商品局部，可选独立材质样片或风格参考；样片不能证明性能和材质等级。"));
  const materials = state.detailDraft.materials.filter(material=>page.visual.presence!=="none" || ["material","style"].includes(material.role));
  if (!materials.length) {
    group.append(detailElement("p", "detail-help", "没有可用图片，本屏将依据文字资料生成示意。"));
    card.append(group); return;
  }
  group.append(detailElement("p", "detail-help", `已选 ${page.referenceIds.length}/6 张。第一张为主参考，可调整顺序。`));
  const chosen = detailElement("ol", "detail-selected-references");
  page.referenceIds.forEach((id, index) => {
    const material = materials.find(item => item.referenceId === id); if (!material) return;
    const row = detailElement("li", ""); row.dataset.referenceId = id;
    row.append(detailThumbnail(material), detailElement("span", "", `${index ? `参考 ${index + 1}` : "主参考"} · ${detailMaterialName(material)}`));
    const controls = detailElement("div", "detail-reference-order");
    controls.append(detailButton("前移", "reference-up", index === 0), detailButton("后移", "reference-down", index === page.referenceIds.length - 1), detailButton("移除", "reference-remove"));
    controls.append(detailButton(page.referenceCrops?.[id] ? "调整局部（已框选）" : "框选局部", "reference-crop"));
    if(page.referenceCrops?.[id]) controls.append(detailButton("清除框选", "reference-crop-clear"));
    row.append(controls); chosen.append(row);
  });
  group.append(chosen);
  const candidates = detailElement("div", "detail-reference-grid");
  materials.forEach(material => {
    const label = detailElement("label", "detail-reference-option");
    const input = detailElement("input"); input.type = "checkbox"; input.dataset.detailReference = material.referenceId;
    input.checked = page.referenceIds.includes(material.referenceId);
    input.disabled = !input.checked && page.referenceIds.length >= 6;
    label.append(input, detailThumbnail(material), detailElement("span", "", detailMaterialName(material)), detailElement("small", "", `${detailMaterialRoles[material.role] || "其他素材"}${material.variant ? ` · ${material.variant}` : ""}`));
    candidates.append(label);
  });
  group.append(candidates); card.append(group);
};
const renderDetailPages = () => {
  const container = document.querySelector(".analysis-outputs"); container.replaceChildren();
  const pages = state.detailDraft.outputs;
  pages.forEach((page, index) => {
    const card = detailElement("article", "detail-page"); card.dataset.pageId = page.pageId;
    const heading = detailElement("div", "detail-page-heading");
    heading.append(detailElement("h3", "", `第 ${index + 1} 屏`));
    const controls = detailElement("div", "detail-page-controls");
    controls.append(detailButton("上移", "page-up", index === 0), detailButton("下移", "page-down", index === pages.length - 1), detailButton("删除此屏", "page-delete", pages.length <= 1));
    heading.append(controls); card.append(heading);
    const fields = detailElement("div", "detail-page-fields");
    fields.append(detailField("回答买家的什么问题", page.buyerQuestion, "buyerQuestion", { maxLength: 500 }));
    fields.append(detailField("主标题", page.title, "title", { maxLength: 240 }));
    fields.append(detailField("副标题", page.subtitle, "subtitle", { maxLength: 500 }));
    fields.append(detailField("正文／信息文案", page.body, "body", { multiline: true, maxLength: 3000 }));
    fields.append(detailField("商品呈现", page.visual.presence, "presence", { scope: "detailVisual", options: { full: "完整商品", detail: "局部特写", none: "不展示商品" } }));
    card.append(fields);
    if (page.facts.length) {
      const facts = detailElement("div", "detail-facts"); facts.append(detailElement("strong", "", "本屏事实依据"));
      const list = detailElement("ul"); page.facts.forEach(fact => list.append(detailElement("li", "", fact))); facts.append(list); card.append(facts);
    }
    renderDetailReferences(page, card);
    const advanced = detailElement("details", "detail-page-advanced"); advanced.append(detailElement("summary", "", "高级画面设置"));
    const settings = detailElement("div", "detail-page-fields");
    for (const [key, label] of [["background", "背景"], ["composition", "构图与信息布局"], ["shot", "镜头"]]) settings.append(detailField(label, page.visual[key], key, { scope: "detailVisual", maxLength: key === "shot" ? 300 : 600 }));
    settings.append(detailField("页面作用", page.creativeRole, "creativeRole", { maxLength: 240 }));
    settings.append(detailField("画面说明", page.description, "description", { multiline: true, maxLength: 1000 }));
    settings.append(detailField("补充画面要求", page.prompt, "prompt", { multiline: true, maxLength: 3000 }));
    settings.append(detailElement("p", "detail-help", "确认后会结合本屏脚本编写生图指令。标题与正文以这里填写的内容为准。"));
    advanced.append(settings); card.append(advanced); container.append(card);
  });
  renderMaterialCoverage();
  state.outputPlan = detailPlanFromOutputs(pages);
  document.querySelector(".analysis-output-count").textContent = `${pages.length} 屏`;
  document.querySelector(".detail-add-page").disabled = pages.length >= 12;
  saveDetailDraft();
};
const captureDetailOutputs = () => {
  const pages = state.detailDraft?.outputs || [];
  document.querySelectorAll(".detail-page[data-page-id]").forEach(card => {
    const page = pages.find(item => item.pageId === card.dataset.pageId); if (!page) return;
    card.querySelectorAll("[data-detail-field]").forEach(control => { page[control.dataset.detailField] = control.value; });
    card.querySelectorAll("[data-detail-visual]").forEach(control => { page.visual[control.dataset.detailVisual] = control.value; });
    const validIds=state.detailDraft.materials.filter(material=>page.visual.presence!=="none" || ["material","style"].includes(material.role)).map(material=>material.referenceId);
    page.referenceIds=page.referenceIds.filter(id=>validIds.includes(id));
    page.referenceCrops=Object.fromEntries(Object.entries(page.referenceCrops||{}).filter(([id])=>page.referenceIds.includes(id)));
  });
  saveDetailDraft();
  return pages.map(copyDetailOutput);
};
const focusDetailPage = id => document.querySelector(`.detail-page[data-page-id="${id}"] [data-detail-field="title"]`)?.focus({ preventScroll: true });
const mutateDetailPages = (action, pageId, referenceId) => {
  const pages = captureDetailOutputs(); const index = pages.findIndex(page => page.pageId === pageId);
  if (index < 0) return;
  const page = pages[index];
  if (action === "page-delete" && pages.length > 1) {pages.splice(index, 1);(state.detailDraft.materialCoverage||[]).forEach(item=>item.pageIds=item.pageIds.filter(id=>id!==pageId));}
  else if(action==="reference-crop-clear") delete page.referenceCrops[referenceId];
  else if (action === "page-up" && index > 0) [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
  else if (action === "page-down" && index < pages.length - 1) [pages[index + 1], pages[index]] = [pages[index], pages[index + 1]];
  else {
    const selectedIndex = page.referenceIds.indexOf(referenceId);
    if (action === "reference-remove" && selectedIndex >= 0) page.referenceIds.splice(selectedIndex, 1);
    else if (action === "reference-up" && selectedIndex > 0) [page.referenceIds[selectedIndex - 1], page.referenceIds[selectedIndex]] = [page.referenceIds[selectedIndex], page.referenceIds[selectedIndex - 1]];
    else if (action === "reference-down" && selectedIndex >= 0 && selectedIndex < page.referenceIds.length - 1) [page.referenceIds[selectedIndex + 1], page.referenceIds[selectedIndex]] = [page.referenceIds[selectedIndex], page.referenceIds[selectedIndex + 1]];
  }
  state.detailDraft.outputs = pages; renderDetailPages();
  focusDetailPage(pages.find(item => item.pageId === pageId)?.pageId || pages[Math.min(index, pages.length - 1)].pageId);
};

document.querySelector(".detail-add-page")?.addEventListener("click", () => {
  if (!isDetailV2()) return;
  const pages = captureDetailOutputs(); if (pages.length >= 12) return;
  const preferred = state.detailDraft.materials.find(material => material.sourceKind === "upload" && material.role === "primary") || state.detailDraft.materials.find(material => !["pdf_page", "docx_image"].includes(material.sourceKind) && material.role !== "style");
  const page = copyDetailOutput({
    pageId: newRequestId(), title: state.jobConfig?.language === "无文字（纯视觉）" ? "" : "新页面", creativeRole: "补充说明", buyerQuestion: "",
    description: "围绕本屏购买疑问展示已确认的信息，文案清晰，呼应整套品牌气质。", prompt: "",
    visual: { presence: "full", background: "沿用整套品牌配色的简洁背景", composition: "单一主题、清晰文字层级与留白", shot: "正面中景" },
    referenceIds: preferred ? [preferred.referenceId] : [],
  });
  state.detailDraft.outputs = [...pages, page]; renderDetailPages(); focusDetailPage(page.pageId);
});
document.querySelector(".analysis-outputs")?.addEventListener("click", async event => {
  if (!isDetailV2()) return;
  const button = event.target.closest("[data-detail-action]"); const card = button?.closest(".detail-page");
  if(button?.dataset.detailAction==="reference-crop" && card) {
    captureDetailOutputs();const jobId=state.job.id,epoch=accountEpoch;const page=state.detailDraft.outputs.find(item=>item.pageId===card.dataset.pageId),id=button.closest("[data-reference-id]")?.dataset.referenceId;
    const result=await window.pintuCrop.open({url:`/api/jobs/${jobId}/materials/${encodeURIComponent(id)}/crop-preview`,initial:page.referenceCrops?.[id]});
    if(result && state.job?.id===jobId && epoch===accountEpoch && state.view==="confirm" && state.detailDraft.outputs.includes(page) && page.referenceIds.includes(id)) {
      if(result.action==="clear")delete page.referenceCrops[id];else page.referenceCrops[id]=result.rect;
      renderDetailPages();
    }return;
  }
  if (button && card) mutateDetailPages(button.dataset.detailAction, card.dataset.pageId, button.closest("[data-reference-id]")?.dataset.referenceId);
});
document.querySelector(".analysis-outputs")?.addEventListener("input", event => {
  if (isDetailV2() && event.target.matches("[data-detail-field],[data-detail-visual]")) captureDetailOutputs();
});
document.querySelector(".analysis-outputs")?.addEventListener("change", event => {
  if (!isDetailV2()) return;
  const card = event.target.closest(".detail-page"); if (!card) return;
  const pages = captureDetailOutputs(); const page = pages.find(item => item.pageId === card.dataset.pageId); if (!page) return;
  const reference = event.target.dataset.detailReference;
  if (reference) {
    if (event.target.checked && page.referenceIds.length < 6 && !page.referenceIds.includes(reference)) page.referenceIds.push(reference);
    else if (!event.target.checked) {page.referenceIds = page.referenceIds.filter(id => id !== reference);delete page.referenceCrops[reference];}
  }
  if (event.target.dataset.detailVisual === "presence" && page.visual.presence === "none" && page.visual.shot === "正面中景") page.visual.shot = "平面信息排版";
  if (reference || event.target.dataset.detailVisual === "presence") { state.detailDraft.outputs = pages; renderDetailPages(); focusDetailPage(page.pageId); }
});
document.querySelector(".detail-proposal")?.addEventListener("input", event => {
  if (!isDetailV2()) return;
  const designKey=event.target.dataset.detailDesign;if(designKey)state.detailDraft.designSystem[designKey]=event.target.value;
  const strategyKey = event.target.dataset.detailStrategy;
  if (strategyKey) state.detailDraft.strategy[strategyKey] = event.target.value;
  const materialKey = event.target.dataset.detailMaterial;
  if (materialKey) {
    const material = state.detailDraft.materials.find(item => item.referenceId === event.target.closest("[data-material-id]")?.dataset.materialId);
    if (material) material[materialKey] = event.target.value;
  }
  saveDetailDraft();
});
document.querySelector(".detail-proposal")?.addEventListener("change", event => {
  if (isDetailV2() && event.target.dataset.detailMaterial) { captureDetailOutputs(); renderDetailPages(); }
});

const renderAnalysis = (analysis) => {
  restoreRewriteDraft(analysis);
  document.querySelector(".analysis-product").textContent = analysis.product;
  document.querySelector(".analysis-direction").textContent = [analysis.visualDirection, analysis.suiteStyle ? `整套统一风格：${analysis.suiteStyle}` : ""].filter(Boolean).join("\n");
  renderSellingPoints(analysis.sellingPoints);
  renderStyleSuggestions(analysis);
  appendTextItems(document.querySelector(".analysis-protection"), analysis.protectionRules);
  const detailV2 = isDetailV2();
  document.querySelector(".detail-proposal").hidden = !detailV2;
  document.querySelector(".detail-page-toolbar").hidden = !detailV2;
  outputPlanList.hidden = detailV2;
  document.querySelector(".analysis-output-subhead").hidden = detailV2;
  document.querySelector(".analysis-output-plan h2").textContent = detailV2 ? "逐屏内容脚本" : "AI 推荐生成方案";
  document.querySelector(".analysis-output-plan .analysis-section-title p").textContent = detailV2 ? "每屏回答一个购买疑问；确认后将依次完成指令编写与整套图片生成。" : "先按平台推荐一套，可在这里调整数量和方向。";
  confirmGenerateButton.textContent = detailV2 ? "确认并生成整套" : "确认生成";
  setDetailNotice();
  if (detailV2) { initDetailDraft(analysis); renderDetailProposal(); renderDetailPages(); }
  else {
    state.outputPlan = normalizeOutputPlan(analysis);
    analysis.recommendedOutputPlan = state.outputPlan;
    analysis.outputs = outputsFromPlan(state.outputPlan, analysis.outputs);
    renderOutputPlan(); renderOutputList(analysis.outputs); updateOutputCount();
  }
  const warnings = document.querySelector(".analysis-warnings");
  warnings.hidden = !analysis.warnings?.length;
  warnings.textContent = analysis.warnings?.length ? `需要留意：${analysis.warnings.join("；")}` : "";
  const advanced = document.querySelector(".analysis-advanced");
  if (advanced) advanced.open = false;
  setResultView("confirm");
  updateProgress(2);
  applyPromptRevision(state.job);
};

const briefPanel = document.querySelector(".brief-panel");
const directButton = document.createElement('button'); directButton.type='button'; directButton.className='direct-analyze'; directButton.textContent='跳过问答，直接生成方案'; actionButton.after(directButton);
const briefInput = briefPanel.querySelector('.brief-answer');
const briefSummary = briefPanel.querySelector('.brief-summary');
const briefStatus = briefPanel.querySelector('.brief-status');
const BRIEF_KEY='pintu.brief.v1';
const saveBriefReference = () => { try { if (briefState.data?.id) sessionStorage.setItem(BRIEF_KEY,JSON.stringify({id:briefState.data.id,summary:briefSummary.value,answer:briefInput.value,pending:briefState.pending,summaryEdited:briefState.summaryEdited,active:briefState.active})); } catch {} };
briefSummary.addEventListener('input',()=>{briefState.summaryEdited=true;saveBriefReference();});
briefInput.addEventListener('input',saveBriefReference);
const briefPhaseBusy = data => Boolean(data?.pending || ["analyzing", "questioning"].includes(data?.phase));
const briefNeedsInitialAnalysis = data => data?.phase === "created" && !data.productProfile && !(data.messages || []).length;
const clearBriefPoll = () => { if (briefState.pollTimer) window.clearTimeout(briefState.pollTimer); briefState.pollTimer = null; };
function renderBrief() {
  const busy = briefState.busy || briefPhaseBusy(briefState.data);
  const data = briefState.data;
  const needsRecognition = briefNeedsInitialAnalysis(data);
  const failed = Boolean(briefState.error || data?.phase === "failed");
  directButton.disabled = taskIsBusy();
  actionButton.disabled = taskIsBusy() || busy;
  actionButton.title = taskIsBusy() ? "当前任务完成后可开始新的问答，左侧草稿仍可编辑" : "";
  briefPanel.querySelector(".brief-compose").hidden = busy || !data || needsRecognition;
  briefPanel.querySelector(".brief-summary-field").hidden = busy || !data || needsRecognition;
  briefPanel.querySelector(".brief-questions").hidden = busy || needsRecognition;
  const loading = briefPanel.querySelector(".brief-loading"); loading.hidden = !busy;
  loading.querySelector("strong").textContent = data?.phase === "questioning" ? "正在准备需要确认的问题" : "正在识别商品与资料";
  briefPanel.setAttribute("aria-busy", String(busy));
  for (const b of briefPanel.querySelectorAll("button")) b.disabled = busy || taskIsBusy();
  for (const b of briefPanel.querySelectorAll(".brief-generate,.brief-skip")) b.disabled = taskIsBusy() || !data;
  const retry = briefPanel.querySelector(".brief-retry"); retry.hidden = !failed;
  retry.textContent = briefState.pending ? "重试发送回答" : "重试识别与提问";
  briefPanel.querySelector(".brief-back-task").hidden = !state.job;
}
const readableProfileText = (value, profile) => {
  let text = String(value || "");
  (profile?.sources || []).forEach((source, index) => {
    const label = `${source.sourceName || `素材 ${index + 1}`}${source.sourceKind === "pdf_page" ? ` 第 ${source.ordinal || 1} 页` : source.sourceKind === "docx_image" ? ` 内嵌图 ${source.ordinal || 1}` : ""}`;
    for (const id of [source.referenceId, source.sourceId]) if (id) text = text.replaceAll(String(id), label);
  });
  return text.replace(/参考图编号\s*/g, "").replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, "上传素材");
};
const renderProductProfile = profile => {
  const container = briefPanel.querySelector(".brief-product-profile"); container.replaceChildren(); container.hidden = !profile;
  if (!profile) return;
  container.append(detailElement("h3", "", readableProfileText(profile.product || "已识别商品", profile)));
  if (profile.category) container.append(detailElement("p", "brief-profile-category", `商品类别：${readableProfileText(profile.category, profile)}`));
  for (const [key, label] of [["features", "可见特征"], ["confirmedFacts", "已确认信息"], ["unknowns", "待确认信息"]]) {
    if (!Array.isArray(profile[key]) || !profile[key].length) continue;
    container.append(detailElement("strong", "", label));
    const list = detailElement("ul"); profile[key].forEach(value => list.append(detailElement("li", "", readableProfileText(value, profile)))); container.append(list);
  }
};
const showBrief = data => {
  const preserveSummary=briefState.data?.id===data.id && briefState.summaryEdited;
  briefState.data=data; if(!preserveSummary){briefSummary.value=data.summary || '';briefState.summaryEdited=false;}
  const messages=briefPanel.querySelector('.brief-messages'); messages.replaceChildren();
  for(const m of data.messages) {const p=document.createElement('p'); p.className=m.role;p.textContent=`${m.role==='user'?'你':'设计助手'}：${m.text}`;messages.append(p);}
  const questions=briefPanel.querySelector('.brief-questions');questions.replaceChildren();
  for(const q of data.questions || []) {const p=document.createElement('p');p.textContent=q.question;questions.append(p);for(const option of q.options){const b=document.createElement('button');b.type='button';b.textContent=option;b.addEventListener('click',()=>{briefInput.value += `${briefInput.value?'\n':''}${q.question}：${option}`;});questions.append(b);}}
  renderProductProfile(data.productProfile);
  if (data.pendingMessage && !briefInput.value) {
    briefInput.value = data.pendingMessage.text || "";
    briefState.pending = { message: data.pendingMessage.text || "", requestId: data.pendingMessage.requestId };
  }
  briefStatus.textContent = briefState.error || (data.phase === "failed" ? data.error?.message || "需求整理未完成，可重试，已输入内容仍然保留。" : briefPhaseBusy(data) ? data.phase === "questioning" ? "已识别商品，正在准备需要确认的问题…" : "正在读取商品资料，先确认真实商品信息…" : briefNeedsInitialAnalysis(data) ? "素材已保存，正在准备商品识别…" : data.ready ? '信息已充分，可编辑摘要后生成方案。' : '回答问题，或跳过后使用已有信息生成方案。');
  if (state.view === "brief") renderTaskSummary();
  saveBriefReference();renderBrief();messages.scrollTop=messages.scrollHeight;
};
const pollBrief = async () => {
  const id = briefState.data?.id; if (!id) return;
  if (briefState.pollInFlight) {
    if (!briefState.pollTimer) briefState.pollTimer = window.setTimeout(pollBrief, 1800);
    return;
  }
  clearBriefPoll(); briefState.pollInFlight = true;
  try {
    const data = await apiRequest(`/api/briefs/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
    if (briefState.data?.id !== id) return;
    briefState.busy = briefPhaseBusy(data);
    if (briefPhaseBusy(data) || data.phase === "failed") briefState.error = null;
    const pending = briefState.pending;
    if (pending && (data.messages || []).some(message => message.requestId === pending.requestId && message.role === "assistant")) {
      if (briefInput.value.trim() === pending.message.trim()) briefInput.value = "";
      briefState.pending = null;
      briefState.error = null;
    }
    showBrief(data);
    if (briefPhaseBusy(data)) briefState.pollTimer = window.setTimeout(pollBrief, 1800);
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED" || briefState.data?.id !== id) return;
    briefState.error = error.message;
    if (error.status === 404) { briefState.busy = false; briefState.data = null; briefStatus.textContent = "此问答已过期，请使用左侧素材重新开始。"; }
    else { briefStatus.textContent = "问答连接暂时中断，正在恢复；已输入内容会保留。"; briefState.pollTimer = window.setTimeout(pollBrief, 3000); }
  } finally { briefState.pollInFlight = false; renderBrief(); }
};
const analyzeBrief = async () => {
  if (!briefState.data || briefState.busy || taskIsBusy()) return;
  briefState.busy = true; briefState.error = null; renderBrief(); briefStatus.textContent = "正在识别商品与资料…";
  try { showBrief(await apiRequest(`/api/briefs/${briefState.data.id}/analyze`, { method: "POST" })); }
  catch (error) { if (error.code === "LOCAL_SESSION_CHANGED") return; briefState.error = error.message; briefStatus.textContent = error.message; }
  finally { briefState.busy = briefPhaseBusy(briefState.data); renderBrief(); }
  await pollBrief();
};
const sendBrief = async () => {
  if(briefState.busy || briefPhaseBusy(briefState.data) || !briefState.data || taskIsBusy()) return;
  const message=briefInput.value.trim();
  if(!message)return;
  const pending=briefState.pending?.message===message?briefState.pending:{message,requestId:newRequestId()};
  briefState.pending=pending;briefState.busy=true;briefState.error=null;saveBriefReference();renderBrief();briefStatus.textContent='正在整理回答，准备下一步…';
  try {
    const data = await apiRequest(`/api/briefs/${briefState.data.id}/messages`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});
    if ((data.messages || []).some(item => item.requestId === pending.requestId && item.role === "assistant")) { briefState.pending = null; briefInput.value = ''; }
    showBrief(data);
  }
  catch(error){if(error.code === "LOCAL_SESSION_CHANGED") return;briefState.error=error.message;briefStatus.textContent=error.message+'；可再次发送重试，或跳过问答。';}
  finally{briefState.busy=briefPhaseBusy(briefState.data);renderBrief();saveBriefReference();}
  await pollBrief();
};
const startBrief = async (restart=false) => {
  if(taskIsBusy() || briefState.busy || briefPhaseBusy(briefState.data)) return;
  if(briefState.data && !restart){
    briefState.active=true;setResultView("brief");renderTaskSummary();saveBriefReference();
    if (briefNeedsInitialAnalysis(briefState.data)) await analyzeBrief();
    return;
  }
  if(!draft.files.length){setDraftNotice('请先上传商品素材');return;}
  clearBriefPoll(); briefState.data=null;briefState.pending=null;briefState.summaryEdited=false;briefState.active=true;briefState.error=null;briefInput.value="";briefSummary.value="";
  briefState.busy=true;setResultView("brief");renderTaskSummary();renderBrief();renderProductProfile(null);briefStatus.textContent='正在保存本次问答的素材…';
  briefPanel.querySelector(".brief-messages").replaceChildren();briefPanel.querySelector(".brief-questions").replaceChildren();
  try {showBrief(await apiRequest('/api/briefs',{method:'POST',body:buildAnalyzeForm()}));setDraftNotice();}
  catch(error){if(error.code === "LOCAL_SESSION_CHANGED") return;briefState.error=error.message;briefStatus.textContent=error.message;return;}
  finally{briefState.busy=false;renderBrief();}
  await analyzeBrief();
};
const restoreBrief = async () => {
  if (briefState.restoreInFlight) return;
  let saved;try{saved=JSON.parse(sessionStorage.getItem(BRIEF_KEY)||'null');}catch{}
  if(!saved?.id)return;
  briefState.restoreInFlight=true;
  briefState.busy=true;briefState.active=Boolean(saved.active);renderBrief();
  let pending=false, startRecognition=false;
  try {
    const data=await apiRequest(`/api/briefs/${saved.id}`);pending=briefPhaseBusy(data);showBrief(data);
    const answered = saved.pending && (data.messages || []).some(message => message.requestId === saved.pending.requestId && message.role === "assistant");
    if (saved.answer && !(answered && saved.answer.trim() === saved.pending.message?.trim())) briefInput.value=saved.answer;
    if (saved.pending && !answered) briefState.pending=saved.pending;
    if(saved.summaryEdited && typeof saved.summary==='string'){briefSummary.value=saved.summary;briefState.summaryEdited=true;}
    saveBriefReference();
    if (!taskIsBusy() && (saved.active || !state.job)) {
      briefState.active=true;setResultView("brief");renderTaskSummary();
      startRecognition=briefNeedsInitialAnalysis(data);
    }
    if(pending){briefStatus.textContent='正在恢复进行中的问答…';briefState.pollTimer=window.setTimeout(pollBrief,1800);}
  }
  catch(error){if(error.code === "LOCAL_SESSION_CHANGED") return;setDraftNotice(error.message);}
  finally{briefState.busy=pending;renderBrief();}
  try { if(startRecognition) await analyzeBrief(); }
  finally { briefState.restoreInFlight=false; }
};
briefPanel.querySelector('.brief-send').addEventListener('click',()=>sendBrief());
briefPanel.querySelector('.brief-retry').addEventListener('click',()=>briefState.pending ? sendBrief() : briefState.data ? analyzeBrief() : startBrief(true));
briefPanel.querySelector('.brief-back-task').addEventListener('click',()=>{briefState.active=false;saveBriefReference();if(state.job)void pollJob();});
briefPanel.querySelector('.brief-restart').addEventListener('click',()=>startBrief(true));
briefPanel.querySelector('.brief-generate').addEventListener('click',()=>analyzeJob(true));
briefPanel.querySelector('.brief-skip').addEventListener('click',()=>analyzeJob(true));
directButton.addEventListener('click',()=>analyzeJob());

const analyzeJob = async (useBrief=false) => {
  if (taskIsBusy()) return;
  if (!useBrief && !draft.files.length) {
    setDraftNotice("请先上传商品图片、PDF、Word 或文本资料");
    return;
  }
  const form = useBrief ? new FormData() : buildAnalyzeForm();
  if(useBrief) {
    if(!briefState.data)return;
    Object.entries(briefState.data.fields).forEach(([key,value])=>form.set(key,value));
    form.set('briefId',briefState.data.id);form.set('summary',briefSummary.value);
  }
  const config = Object.freeze(Object.fromEntries(["mode", "platform", "language", "ratio", "requirements"].map(key => [key, form.get(key)])));
  const key=JSON.stringify({config,briefId:useBrief?briefState.data.id:null,summary:useBrief?briefSummary.value:null,files:useBrief?[]:draft.files.map(f=>[f.name,f.size,f.lastModified])});
  if(state.analysisSubmission?.key!==key) state.analysisSubmission={key,id:newRequestId()};
  form.set('submissionId',state.analysisSubmission.id);
  const previous = { job: state.job, config: state.jobConfig, view: state.view };
  setDraftNotice();
  clearPoll();
  state.requestBusy = true;
  syncTaskControls();
  setTaskNotice("正在分析素材，请保持页面打开。生成任务建立后可离开并恢复进度。");
  actionButton.disabled = true;
  showProcessing("正在分析商品", "正在读取商品素材，整理主体、卖点和平台图片结构", 1);
  try {
    const job = await apiRequest("/api/jobs/analyze", { method: "POST", body: form });
    state.jobConfig = config;
    state.analysisSubmission = null;
    rememberJob(job);
    setTaskNotice();
    state.selectedEditIndexes = new Set();
    state.activeItemIndex = 0;
    state.activeVersionId = 0;
    state.editTarget = "current";
    briefState.active=false;saveBriefReference();
    renderAnalysis(state.job.analysis);
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    state.job = previous.job;
    state.jobConfig = previous.config;
    setResultView(previous.view);
    renderTaskSummary();
    setDraftNotice(error.message);
  } finally {
    state.requestBusy = false;
    setTaskNotice();
    syncTaskControls();
  }
};

const editedOutputs = () => {
  if (isDetailV2()) return captureDetailOutputs();
  const titleInputs = Array.from(document.querySelectorAll(".analysis-output-title"));
  const roleInputs = Array.from(document.querySelectorAll(".analysis-output-role-input"));
  const descriptionInputs = Array.from(document.querySelectorAll(".analysis-output-description"));
  const promptInputs = Array.from(document.querySelectorAll(".analysis-output-prompt"));
  return (state.job?.analysis?.outputs || []).map((output, index) => ({
    ...output,
    visual: Object.fromEntries(Array.from(document.querySelectorAll(`[data-output-index="${index}"][data-visual]`)).map(input=>[input.dataset.visual,input.value])),
    title: titleInputs[index]?.value ?? output.title,
    creativeRole: roleInputs[index]?.value.trim() || output.creativeRole,
    description: descriptionInputs[index]?.value.trim() || output.description,
    prompt: promptInputs[index]?.value ?? output.prompt,
  }));
};

const editedOutputPlan = () => {
  if (isDetailV2()) return detailPlanFromOutputs(captureDetailOutputs());
  syncOutputPlanFromInputs();
  return state.outputPlan.map((planItem) => {
    const outputs = editedOutputs().filter((output) => output.planType === planItem.type);
    return {
      ...planItem,
      items: outputs.map((output) => ({
        pageId: output.pageId,
        title: output.title,
        creativeRole: output.creativeRole,
        description: output.description,
        promptHint: output.prompt,
        ...(output.visual ? {visual:output.visual} : {}),
      })),
    };
  });
};

const rewriteInput = document.querySelector(".prompt-rewrite-input");
const rewriteButton = document.querySelector(".prompt-rewrite-submit");
const rewriteRetryButton = document.querySelector(".prompt-rewrite-retry");
const rewriteStatus = document.querySelector(".prompt-rewrite-status");
const rewriteDraftKey = id => `pintu.prompt-rewrite.v1:${id}`;
const collectConfirmationSnapshot = () => ({
  outputs: editedOutputs(), outputPlan: editedOutputPlan(), analysisPatch: analysisPatch(),
  ...(isDetailV2() ? { designSystem: state.detailDraft.designSystem, materialCoverage: structuredClone(state.detailDraft.materialCoverage), strategy: { ...state.detailDraft.strategy }, materials: state.detailDraft.materials.map(({ referenceId, role, description, variant }) => ({ referenceId, role, description, variant })) } : {}),
});
const confirmationFingerprint = snapshot => JSON.stringify(snapshot);
const saveRewriteDraft = () => {
  if (!rewriteState.jobId) return;
  try { sessionStorage.setItem(rewriteDraftKey(rewriteState.jobId), JSON.stringify({ ...rewriteState, instruction: rewriteInput.value })); } catch {}
};
const restoreRewriteDraft = analysis => {
  if (rewriteState.jobId === state.job.id) return;
  let saved; try { saved = JSON.parse(sessionStorage.getItem(rewriteDraftKey(state.job.id)) || "null"); } catch {}
  Object.assign(rewriteState, { jobId: state.job.id, request: null, localSnapshot: null, sourceFingerprint: null, appliedRequestId: null, result: null, conflict: false, processedRequestId: null, error: null }, saved?.jobId === state.job.id ? saved : {});
  const snapshot = rewriteState.localSnapshot;
  if (snapshot?.outputs?.length && state.job.status === "awaiting_confirmation") {
    analysis.outputs = snapshot.outputs;
    analysis.recommendedOutputPlan = snapshot.outputPlan;
    if (snapshot.analysisPatch?.sellingPoints) analysis.sellingPoints = snapshot.analysisPatch.sellingPoints;
    if (snapshot.analysisPatch?.selectedStyle) analysis.selectedStyle = snapshot.analysisPatch.selectedStyle;
    if (snapshot.strategy) analysis.strategy = snapshot.strategy;
  }
  rewriteInput.value = saved?.instruction ?? state.job.promptRevision?.instruction ?? "";
};
const renderRewriteControls = () => {
  if (!rewriteButton || !state.job) return;
  const running = state.rewriteBusy || state.job.promptRevision?.status === "running";
  rewriteButton.disabled = taskIsBusy() || executionTaskPending();
  rewriteRetryButton.disabled = taskIsBusy() || executionTaskPending();
  rewriteInput.disabled = Boolean(running);
  rewriteRetryButton.hidden = !(rewriteState.error || state.job.promptRevision?.status === "failed");
  rewriteStatus.textContent = running ? "正在逐图改写提示词，尚未开始生图。你仍可编辑方案，新编辑会被保留。" : rewriteState.error || (state.job.promptRevision?.status === "failed" ? state.job.promptRevision.error?.message || "改写未完成，原方案与上次成功提示词已保留。" : rewriteState.conflict ? "方案中有更新的编辑，已保留。下面的提示词基于上次提交的方案，生成时会结合最新内容重新整理。" : rewriteState.appliedRequestId ? "改写完成。请展开检查每张图的画面提示词，满意后确认生成。" : "这里仅调整提示词，不会生成图片。");
  const list = document.querySelector(".prompt-rewrite-results");
  const expanded = new Set(Array.from(list.querySelectorAll("details[open]")).map(item => item.dataset.pageId));
  list.replaceChildren();
  const pages = rewriteState.result?.pages || state.job.promptRevision?.pages || [];
  pages.forEach((page, index) => {
    const details = detailElement("details"); details.dataset.pageId = page.pageId || String(index); details.open = expanded.has(details.dataset.pageId);
    const output = (state.job.analysis?.outputs || []).find(item => item.pageId === page.pageId);
    details.append(detailElement("summary", "", `第 ${index + 1} 张 · ${output?.title || output?.creativeRole || "画面提示词"}`), detailElement("pre", "", page.prompt || "")); list.append(details);
  });
  confirmGenerateButton.disabled = taskIsBusy() || executionTaskPending();
};
const applyPromptRevision = job => {
  const revision = job.promptRevision; if (!revision) { renderRewriteControls(); return; }
  const successfulId = revision.appliedRequestId || (revision.status === "completed" ? revision.requestId : null);
  if (successfulId) {
    rewriteState.appliedRequestId = successfulId;
    if (revision.pages?.length) rewriteState.result = { requestId: successfulId, pages: revision.pages };
  }
  if (revision.status === "completed" && rewriteState.processedRequestId !== revision.requestId) {
    const current = collectConfirmationSnapshot();
    const unchanged = !rewriteState.sourceFingerprint || confirmationFingerprint(current) === rewriteState.sourceFingerprint;
    if (unchanged) {
      const byId = new Map((revision.pages || []).map(page => [page.pageId, page]));
      const outputs = current.outputs.map((output, index) => {
        const rewritten = byId.get(output.pageId) || (!output.pageId ? revision.pages?.[index] : null);
        if (!rewritten?.visual) return output;
        const { background, composition, shot } = rewritten.visual;
        return { ...output, visual: { ...output.visual, presence: output.visual?.presence || rewritten.visual.presence, ...(background !== undefined ? { background } : {}), ...(composition !== undefined ? { composition } : {}), ...(shot !== undefined ? { shot } : {}) } };
      });
      // Final prompts stay in the preview. They must not become v2 supplemental requirements.
      state.job.analysis.outputs = outputs;
      if (isDetailV2()) { state.detailDraft.outputs = outputs; renderDetailPages(); }
      else renderOutputList(outputs);
    }
    rewriteState.conflict = !unchanged;
    rewriteState.processedRequestId = revision.requestId;
    rewriteState.localSnapshot = collectConfirmationSnapshot();
    rewriteState.error = null;
  } else if (revision.status === "failed") rewriteState.error = revision.error?.message || "改写未完成，原方案仍然保留，可重试。";
  saveRewriteDraft(); renderRewriteControls();
};
const rewritePrompts = async (retry = false) => {
  if (!state.job || taskIsBusy() || executionTaskPending() || state.job.status !== "awaiting_confirmation") return;
  const instruction = rewriteInput.value.trim();
  if (!instruction && !retry) { rewriteState.error = "请先填写希望调整的背景、风格或构图。"; renderRewriteControls(); return; }
  if (rewriteState.jobId !== state.job.id) restoreRewriteDraft(state.job.analysis);
  const snapshot = collectConfirmationSnapshot();
  const request = retry && rewriteState.request ? rewriteState.request : { requestId: newRequestId(), instruction, ...snapshot };
  rewriteState.request = request;
  rewriteState.localSnapshot = snapshot;
  rewriteState.sourceFingerprint = confirmationFingerprint(Object.fromEntries(Object.entries(request).filter(([key]) => !["requestId", "instruction"].includes(key))));
  rewriteState.error = null; rewriteState.conflict = false;
  state.rewriteBusy = true; saveRewriteDraft(); syncTaskControls(); renderRewriteControls();
  try {
    const job = await apiRequest(`/api/jobs/${state.job.id}/prompts/rewrite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
    const localAnalysis = state.job.analysis;
    rememberJob({ ...job, analysis: localAnalysis });
    applyPromptRevision(job);
    await pollJob();
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    rewriteState.error = error.message;
    if (!error.status || error.status === 409) await pollJob();
  } finally { state.rewriteBusy = false; saveRewriteDraft(); syncTaskControls(); renderRewriteControls(); }
};
rewriteButton?.addEventListener("click", () => rewritePrompts());
rewriteRetryButton?.addEventListener("click", () => rewritePrompts(true));
rewriteInput?.addEventListener("input", saveRewriteDraft);
const rememberConfirmationEdits = event => {
  if (state.view !== "confirm" || !state.job || rewriteState.jobId !== state.job.id || event.target.closest(".prompt-rewrite")) return;
  rewriteState.localSnapshot = collectConfirmationSnapshot();
  saveRewriteDraft();
};
document.querySelector(".confirm-card")?.addEventListener("input", rememberConfirmationEdits);
document.querySelector(".confirm-card")?.addEventListener("change", rememberConfirmationEdits);
document.querySelector(".confirm-card")?.addEventListener("click", event => { if (event.target.closest("button")) rememberConfirmationEdits(event); });

const generationStatusCopy = (job) => {
  if (executionTaskPending(job)) return executionTaskCopy(job).message;
  if (["pending", "running"].includes(job?.compilation?.status)) return "正在编写生图指令，完成后自动生成图片";
  const items = Array.isArray(job?.generationItems) ? job.generationItems : [];
  if (!items.length) return `真实生成进度 ${job?.progress || 0}%`;
  const completed = items.filter((item) => item.status === "completed").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const interrupted = items.filter((item) => item.status === "interrupted").length;
  const retrying = items.filter((item) => item.status === "retrying").length;
  const generating = items.filter((item) => item.status === "generating").length;
  const parts = [`已完成 ${completed}/${items.length} 张`];
  if (generating) parts.push(`生成中 ${generating} 张`);
  if (retrying) parts.push(`自动重试 ${retrying} 张`);
  if (failed + interrupted) parts.push(`待重试 ${failed + interrupted} 张`);
  return parts.join(" · ");
};

const pollJob = async () => {
  const id = state.job?.id;
  if (!id || state.pollInFlight) return;
  clearPoll();
  state.pollInFlight = true;
  try {
    const job = await apiRequest(`/api/jobs/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(15000) });
    if (state.job?.id !== id) return;
    if (job.status === "awaiting_confirmation" && state.view === "confirm" && job.promptRevision && state.job.analysis) job.analysis = state.job.analysis;
    rememberJob(job);
    state.restoring = false;
    syncTaskControls();
    if (job.status === "awaiting_confirmation") {
      setTaskNotice();
      if (state.view !== "confirm" || !job.promptRevision) renderAnalysis(job.analysis);
      else applyPromptRevision(job);
      if (job.promptRevision?.status === "running") state.pollTimer = window.setTimeout(pollJob, 1500);
      return;
    }
    if (["pending", "running"].includes(job.compilation?.status)) {
      showProcessing("正在编写生图指令", "正在把已确认的整套提案、逐屏文案和参考图整理为画面指令，完成后自动开始生图。", 3);
      setTaskNotice("正在后台准备整套画面。左侧可继续编辑草稿；离开后返回会恢复当前任务。");
      state.pollTimer = window.setTimeout(pollJob, 1500);
      return;
    }
    if (job.compilation?.status === "failed") {
      setTaskNotice();
      showError(new Error(job.compilation.error?.message || "生图指令编写暂未完成，已确认方案仍然保留。"), retryDetailCompilation);
      const errorTitle = document.querySelector(".error-title");
      if (errorTitle) errorTitle.textContent = "生图指令编写未完成";
      if (retryButton) retryButton.textContent = "重新编写生图指令";
      updateProgress(3);
      return;
    }
    const hasQueue = Boolean(job.generationItems?.length);
    if (state.view !== "editor") {
      if (hasQueue || job.results?.length) {
        renderResultGallery();
        setResultView("gallery");
      } else {
        showProcessing(job.stage || "正在生成电商素材", generationStatusCopy(job), 3);
      }
    }
    if (executionTaskPending()) {
      setTaskNotice(executionTaskCopy().message);
      state.pollTimer = window.setTimeout(pollJob, 5000);
    } else if (taskIsRunning()) {
      updateProgress(3);
      setTaskNotice("正在后台生成。左侧可继续准备下一份草稿，不影响当前任务；返回工作台会自动恢复进度。");
      state.pollTimer = window.setTimeout(pollJob, 1500);
    } else {
      updateProgress(4);
      setTaskNotice();
      if (job.status === "failed" && !hasQueue && !job.results?.length) {
        const error = new Error(job.error?.message || "图片生成失败");
        showError(error, pollJob);
      }
    }
  } catch (error) {
    if (state.job?.id !== id) return;
    if (error.status === 404) {
      state.restoring = false;
      forgetJob();
      state.job = null;
      state.jobConfig = null;
      renderTaskSummary();
      syncTaskControls();
      setTaskNotice();
      showError(new Error("此任务已过期或不存在，请重新上传素材开始任务。"), resetJob);
      return;
    }
    // A failed GET must never resubmit generation or discard its task ID.
    setTaskNotice("进度连接暂时中断，正在自动重连；后台任务不会因此取消。");
    state.pollTimer = window.setTimeout(pollJob, 3000);
  } finally {
    state.pollInFlight = false;
    syncTaskControls();
  }
};

const confirmGeneration = async () => {
  if (!state.job || taskIsBusy() || executionTaskPending()) return;
  const detailV2 = isDetailV2();
  const finalOutputs = editedOutputs();
  const finalPlan = editedOutputPlan();
  if (detailV2) {
    const missingMaterial=(state.detailDraft.materialCoverage||[]).find(item=>item.enabled&&!item.pageIds.length);
    if(missingMaterial){setDetailNotice(`请为“${missingMaterial.name}”选择介绍页面，或取消该项。`);document.querySelector(".detail-material-coverage")?.scrollIntoView({block:"nearest"});return;}
    const missingQuestion = finalOutputs.findIndex(output => !output.buyerQuestion.trim());
    if (missingQuestion >= 0) {
      setDetailNotice(`请填写第 ${missingQuestion + 1} 屏要回答的买家问题，让这一屏有明确重点。`);
      document.querySelector(`.detail-page[data-page-id="${finalOutputs[missingQuestion].pageId}"] [data-detail-field="buyerQuestion"]`)?.focus();
      return;
    }
    const missingReferences = state.detailDraft.materials.length ? finalOutputs.findIndex(output => output.visual.presence !== "none" && !output.referenceIds.length) : -1;
    if (missingReferences >= 0) {
      const index = missingReferences;
      setDetailNotice(`请为第 ${index + 1} 屏选择至少一张参考图，或将商品呈现改为“不展示商品”。`);
      focusDetailPage(finalOutputs[index].pageId);
      return;
    }
    const missingCrop = finalOutputs.findIndex(output => {
      if (output.visual.presence !== "detail" || !output.referenceIds.length) return false;
      if (output.referenceIds.some(id => ["detail", "material"].includes(state.detailDraft.materials.find(material => material.referenceId === id)?.role))) return false;
      return !output.referenceIds.some(id => {
        const rect = output.referenceCrops?.[id];
        if (!rect || typeof rect !== "object" || Array.isArray(rect) || Object.keys(rect).some(key => !["x", "y", "width", "height"].includes(key))) return false;
        const { x, y, width, height } = rect;
        return [x, y, width, height].every(Number.isFinite) && x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1;
      });
    });
    if (missingCrop >= 0) {
      setDetailNotice(`第 ${missingCrop + 1} 屏需要真实清晰局部：请先点击参考图旁的“框选局部”，或选择已确认用途的细节照片/材质样片；若看不清，请补拍局部照片，或改为不展示商品的材质示意页。`);
      focusDetailPage(finalOutputs[missingCrop].pageId);
      return;
    }
  }
  const submission = {
    outputs: finalOutputs, outputPlan: finalPlan, analysisPatch: analysisPatch(),
    ...(detailV2 ? {
      designSystem: state.detailDraft.designSystem, materialCoverage: structuredClone(state.detailDraft.materialCoverage),
      strategy: { ...state.detailDraft.strategy },
      materials: state.detailDraft.materials.map(({ referenceId, role, description, variant }) => ({ referenceId, role, description, variant })),
    } : {}),
    ...(rewriteState.appliedRequestId ? { promptRevisionId: rewriteState.appliedRequestId } : {}),
  };
  state.requestBusy = true;
  rememberJob(state.job);
  syncTaskControls();
  confirmGenerateButton.disabled = true;
  const totalCount = planTotalCount(finalPlan);
  showProcessing(detailV2 ? "正在编写生图指令" : "正在提交生成任务", detailV2 ? `已确认 ${totalCount} 屏，正在准备各屏画面指令，随后自动生成整套。` : `确认方案已发送，预计生成 ${totalCount} 张可编辑素材`, 3);
  try {
    rememberJob(await apiRequest(`/api/jobs/${state.job.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    }));
    if (!detailV2) { renderResultGallery(); setResultView("gallery"); }
    await pollJob();
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    if (["ENGINE_BUSY"].includes(error.code) || (error.status >= 400 && error.status < 500 && error.status !== 409)) {
      // The server rejected admission/validation before freezing this proposal.
      // Reveal the existing confirmation DOM instead of rebuilding edited fields.
      setResultView("confirm");
      const message = executionStatusCopy(error.code)?.message || error.message;
      detailV2 ? setDetailNotice(message) : setTaskNotice(message);
    } else {
      setTaskNotice("正在确认任务状态，请稍候…");
      await pollJob();
    }
  } finally {
    state.requestBusy = false;
    syncTaskControls();
    confirmGenerateButton.disabled = false;
  }
};

const retryDetailCompilation = async () => {
  if (!state.job || taskIsBusy() || executionTaskPending()) return;
  const id = state.job.id;
  state.requestBusy = true; syncTaskControls(); retryButton.disabled = true;
  showProcessing("正在重新编写生图指令", "使用本任务已确认的方案与素材继续，不会读取左侧新草稿。", 3);
  try {
    rememberJob(await apiRequest(`/api/jobs/${encodeURIComponent(id)}/compile/retry`, { method: "POST" }));
    await pollJob();
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    if (executionWaiting(error)) { showError(error, pollJob); await pollJob(); return; }
    if (error.status && error.status !== 409) {
      showError(error, retryDetailCompilation); retryButton.textContent = "重新编写生图指令";
    } else { setTaskNotice("正在确认任务状态，请稍候…"); await pollJob(); }
  } finally { state.requestBusy = false; syncTaskControls(); retryButton.disabled = false; }
};

const RETRY_STORAGE_KEY = "pintu.item-retries.v1";
const retryGenerationItem = async (index) => {
  if (!state.job || taskIsBusy() || executionTaskPending() || executionWaiting(state.job.generationItems?.[index]?.error)) return;
  const jobId = state.job.id;
  const item = state.job.generationItems?.[index];
  const attempt = Number.isSafeInteger(item?.attempts) ? item.attempts : Number.isSafeInteger(item?.attempt) ? item.attempt : 0;
  const key = `${jobId}:${index}`;
  let intents = {};
  try { const stored = JSON.parse(sessionStorage.getItem(RETRY_STORAGE_KEY) || "{}"); if (stored && typeof stored === "object" && !Array.isArray(stored)) intents = stored; } catch {}
  const candidate = intents[key];
  const previous = candidate && typeof candidate.requestId === "string" && /^[a-f0-9-]{36}$/i.test(candidate.requestId) ? candidate : null;
  // Once a server response acknowledges a retry, a later explicit click starts a new action.
  const intent = previous && !previous.acknowledged ? previous : { requestId: newRequestId(), attempt };
  intents[key] = intent;
  try { sessionStorage.setItem(RETRY_STORAGE_KEY, JSON.stringify(intents)); } catch {}
  state.requestBusy = true;
  syncTaskControls();
  try {
    const job = await apiRequest(`/api/jobs/${jobId}/items/${index}/retry`, {
      method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": intent.requestId },
      body: JSON.stringify({ requestId: intent.requestId }),
    });
    intent.acknowledged = true;
    try { sessionStorage.setItem(RETRY_STORAGE_KEY, JSON.stringify(intents)); } catch {}
    rememberJob(job); renderResultGallery(); setResultView("gallery"); await pollJob();
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED") return;
    setTaskNotice(executionStatusCopy(error.code)?.message || "正在确认重试任务状态，请稍候；再次提交会查询同一次重试。");
    await pollJob();
  } finally { state.requestBusy = false; syncTaskControls(); }
};

const downloadHrefFor = (item) => {
  const imagePath = new URL(item.url, window.location.origin).pathname.split("/").filter(Boolean);
  const jobId = imagePath[1];
  const filename = imagePath[2];
  return `/api/download/${encodeURIComponent(jobId)}/${encodeURIComponent(filename)}?name=${encodeURIComponent(
    item.title
  )}`;
};

const renderResultGallery = () => {
  resultGrid.textContent = "";
  const results = state.job?.results || [];
  const generationItems = Array.isArray(state.job?.generationItems) ? state.job.generationItems : [];
  const hasQueue = generationItems.length > 0;
  const failedResults = state.job?.failedResults || [];
  const completedCount = hasQueue
    ? generationItems.filter((item) => item.status === "completed").length
    : results.length;
  const failedCount = hasQueue
    ? generationItems.filter((item) => ["failed", "interrupted"].includes(item.status) && !executionWaiting(item.error)).length
    : failedResults.length;
  const totalCount = hasQueue ? generationItems.length : results.length;
  resultGrid.classList.toggle("single-result", totalCount === 1);
  galleryCount.textContent = hasQueue
    ? failedCount
      ? `已完成 ${completedCount} / ${totalCount} 张，${failedCount} 张可重试`
      : `已完成 ${completedCount} / ${totalCount} 张`
    : failedResults.length
      ? `已生成 ${results.length} 张，${failedResults.length} 张未完成`
      : `已生成 ${results.length} 张可编辑素材`;
  if (galleryWarning) {
    galleryWarning.hidden = !executionTaskPending() && !failedCount && !state.job?.error?.partial;
    galleryWarning.textContent = executionTaskPending() ? executionTaskCopy().message : failedCount
      ? `有 ${failedCount} 张图片未完成。已完成图片可先使用，失败项可以单独重试，不会重新生成整单。`
      : "";
  }
  if (openStudioButton) openStudioButton.disabled = !results.length;
  if (results.length && !state.selectedEditIndexes.size) state.selectedEditIndexes.add(0);
  const renderCompletedCard = (item, index) => {
    ensureItemState(item);
    const card = document.createElement("article");
    card.className = "result-card";
    const visual = document.createElement("button");
    visual.type = "button";
    visual.className = "result-card-visual";
    visual.dataset.previewIndex = String(index);
    visual.setAttribute("aria-label", `放大查看 ${item.title}`);
    const image = document.createElement("img");
    image.src = item.url;
    image.alt = item.title;
    const type = document.createElement("em");
    type.textContent = item.type;
    const model = document.createElement("span");
    model.className = `result-card-model${item.preview ? " preview" : ""}`;
    model.textContent = `${item.qualityTier || "成品"}`;
    visual.append(image, type, model);
    const copy = document.createElement("div");
    copy.className = "result-card-copy";
    const heading = document.createElement("strong");
    heading.textContent = item.title;
    const role = document.createElement("span");
    role.className = "result-card-role";
    role.textContent = item.creativeRole || "独立创意方向";
    const note = document.createElement("small");
    note.textContent = item.note;
    const actions = document.createElement("div");
    actions.className = "result-card-actions";
    const preview = document.createElement("button");
    preview.type = "button";
    preview.dataset.previewIndex = String(index);
    preview.textContent = "查看大图";
    const refine = document.createElement("button");
    refine.type = "button";
    refine.dataset.refineIndex = String(index);
    refine.textContent = "对话修改";
    const download = document.createElement("a");
    download.href = downloadHrefFor(item);
    download.className = "download-result";
    download.setAttribute("aria-label", `下载 ${item.title}`);
    download.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 19h14"/></svg><span>下载图片</span>';
    const feedback=document.createElement("button");feedback.type="button";feedback.textContent="反馈这张图";
    feedback.onclick=()=>window.pintuFeedback?.open({jobId:state.job.id,pageId:state.job.analysis.outputs[item.index ?? index]?.pageId,label:`第 ${Number(item.index ?? index)+1} 屏`});
    actions.append(preview, refine, download,feedback);
    copy.append(heading, role, note, actions);
    card.append(visual, copy);
    resultGrid.append(card);
  };

  const renderQueueCard = (item) => {
    const status = item.status || "queued";
    const pendingCopy = executionStatusCopy(item.error?.code) || (["reconciling", "uncertain", "settlement_pending"].includes(status) ? executionTaskCopy() : null);
    const waiting = Boolean(pendingCopy);
    const unavailable = item.error?.code === "ENGINE_RESULT_UNAVAILABLE";
    const failed = ["failed", "interrupted"].includes(status);
    const active = ["generating", "retrying"].includes(status);
    const card = document.createElement("article");
    card.className = `result-card result-card-queue ${failed ? "failed" : active ? "active" : "pending"}`;
    const visual = document.createElement("div");
    visual.className = "result-card-visual queue-card-visual";
    const progress =
      status === "completed" ? 100 : failed ? 100 : status === "retrying" ? 68 : status === "generating" ? 46 : 12;
    visual.innerHTML = `
      <div class="queue-placeholder">
        <span class="queue-status-dot${active ? " active" : ""}${failed ? " failed" : ""}"></span>
        <strong></strong>
        <small></small>
        <div class="generation-progress" aria-hidden="true"><i style="width:${progress}%"></i></div>
      </div>
    `;
    visual.querySelector("strong").textContent = pendingCopy?.title || (unavailable ? "原图片暂不可用" : failed ? "生成未完成" : active ? "正在生成" : "等待生成");
    visual.querySelector("small").textContent = pendingCopy?.short || (unavailable ? "请联系管理员核对图片保存记录" : item.progressLabel || (failed ? "可单独重试" : active ? "图片生成中" : "已加入队列"));
    const copy = document.createElement("div");
    copy.className = "result-card-copy";
    const heading = document.createElement("strong");
    heading.textContent = item.title || `第 ${item.index + 1} 张图片`;
    const role = document.createElement("span");
    role.className = "result-card-role";
    role.textContent = item.creativeRole || item.type || "独立生成项";
    const note = document.createElement("small");
    note.textContent = waiting ? pendingCopy.message : failed
      ? item.error?.message || "图片通道没有返回结果，可单独重试。"
      : item.type || "生成完成后会自动显示在这里。";
    const actions = document.createElement("div");
    actions.className = "result-card-actions";
    if (failed && !waiting && !unavailable && !executionTaskPending()) {
      const retry = document.createElement("button");
      retry.type = "button";
      retry.dataset.retryItemIndex = String(item.index);
      retry.textContent = "重试此张";
      actions.append(retry);
    }
    copy.append(heading, role, note, actions);
    card.append(visual, copy);
    resultGrid.append(card);
  };

  if (hasQueue) {
    generationItems.forEach((item) => {
      const resultIndex = results.findIndex((result) => result.id === item.resultId || result.id === `result-${item.index + 1}`);
      if (item.status === "completed" && resultIndex >= 0) {
        renderCompletedCard(results[resultIndex], resultIndex);
      } else {
        renderQueueCard(item);
      }
    });
    return;
  }

  results.forEach(renderCompletedCard);
};

const closeLightbox = () => {
  if (!lightbox) return;
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
  state.lightboxIndex = null;
};

const openLightbox = (index) => {
  const item = state.job?.results?.[index];
  if (!item || !lightbox) return;
  state.lightboxIndex = index;
  lightboxImage.src = item.url;
  lightboxImage.alt = item.title;
  lightboxType.textContent = item.type;
  lightboxTitle.textContent = item.title;
  lightboxMeta.textContent = `${item.qualityTier || "成品"} · ${item.width}×${item.height}`;
  lightboxDownload.href = downloadHrefFor(item);
  lightboxDownload.setAttribute("aria-label", `下载 ${item.title}`);
  lightbox.classList.add("active");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  lightboxRefine.focus();
};

const currentItem = () => state.job?.results?.[state.activeItemIndex];

const ensureItemState = (item) => {
  if (!item) return null;
  if (!Array.isArray(item.messages)) item.messages = [];
  if (item.finalVersionId === undefined) item.finalVersionId = null;
  return item;
};

const activeResultIndexes = () => {
  const results = state.job?.results || [];
  const selected = Array.from(state.selectedEditIndexes).filter((index) => results[index]);
  if (state.hasSelection) return [state.activeItemIndex];
  if (state.editTarget === "selected" && selected.length) return selected;
  return [state.activeItemIndex];
};

const updateTargetButtons = () => {
  editTargetButtons.forEach((button) => {
    const active = button.dataset.editTarget === state.editTarget;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
};

const latestVersion = (item) => item?.versions?.find((version) => version.id === item.version) || item?.versions?.[0];

const renderStudioQueue = () => {
  if (!studioQueueList) return;
  const results = state.job?.results || [];
  studioQueueList.textContent = "";
  if (studioQueueCount) studioQueueCount.textContent = `${results.length} 张`;
  results.forEach((item, index) => {
    ensureItemState(item);
    const version = latestVersion(item);
    const card = document.createElement("article");
    card.className = "queue-card";
    card.classList.toggle("active", index === state.activeItemIndex);
    card.classList.toggle("selected", state.selectedEditIndexes.has(index));
    card.classList.toggle("final", item.finalVersionId === item.version);

    const select = document.createElement("button");
    select.type = "button";
    select.className = "queue-select";
    select.dataset.queueSelectIndex = String(index);
    select.setAttribute("aria-label", `${state.selectedEditIndexes.has(index) ? "取消选择" : "选择"} ${item.title}`);
    select.textContent = state.selectedEditIndexes.has(index) ? "✓" : "";

    const open = document.createElement("button");
    open.type = "button";
    open.className = "queue-open";
    open.dataset.queueIndex = String(index);
    open.setAttribute("aria-label", `切换到 ${item.title}`);
    const thumbnail = document.createElement("img");
    thumbnail.src = version?.url || item.url;
    thumbnail.alt = "";
    const copy = document.createElement("span");
    const label = document.createElement("strong");
    label.textContent = item.title;
    const meta = document.createElement("small");
    meta.textContent = `${item.type}${item.creativeRole ? ` · ${item.creativeRole}` : ""}`;
    const count = document.createElement("em");
    count.textContent = `${item.versions?.length || 1} 版`;
    copy.append(label, meta, count);
    open.append(thumbnail, copy);
    card.append(select, open);
    studioQueueList.append(card);
  });
  updateTargetButtons();
};

const renderVersions = () => {
  versionList.textContent = "";
  const item = ensureItemState(currentItem());
  item?.versions?.forEach((version) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "version-item";
    if (version.id === state.activeVersionId) button.classList.add("active");
    if (version.id === item.finalVersionId) button.classList.add("final");
    button.dataset.versionId = String(version.id);
    button.setAttribute("aria-label", `切换到${version.label}`);
    const thumbnail = document.createElement("img");
    thumbnail.src = version.url;
    thumbnail.alt = "";
    const copy = document.createElement("span");
    copy.className = "version-item-copy";
    const label = document.createElement("strong");
    label.textContent = version.label;
    const note = document.createElement("small");
    note.textContent = version.id === 0 ? "首次生成" : "对话修改";
    copy.append(label, note);
    button.append(thumbnail, copy);
    versionList.append(button);
  });
  const isFinal = item?.finalVersionId === state.activeVersionId;
  finalVersionButton.disabled = Boolean(isFinal);
  finalVersionButton.textContent = isFinal ? "已设为最终成品" : "设为最终成品";
  renderStudioQueue();
};

const applyVersion = (versionId) => {
  const item = ensureItemState(currentItem());
  const version = item?.versions?.find((entry) => entry.id === versionId);
  if (!version) return;
  state.activeVersionId = versionId;
  item.version = versionId;
  item.url = version.url;
  state.comparing = false;
  editingImage.src = version.url;
  compareButton.setAttribute("aria-pressed", "false");
  compareButton.setAttribute("aria-label", "对比原图");
  compareButton.title = "对比原图";
  renderVersions();
};

const updateEditControls = () => {
  const hasPrompt = Boolean(chatInput.value.trim());
  const targetIndexes = activeResultIndexes();
  const targetCount = targetIndexes.length;
  const canSend = hasPrompt && !state.refineSubmitting && !executionTaskPending();
  sendEditButton.disabled = !canSend;
  sendEditButton.dataset.loading = String(state.refineSubmitting);
  sendEditButton.textContent = state.refineSubmitting
    ? "生成中"
    : executionTaskPending() ? executionTaskCopy().title : targetCount > 1
      ? `发送到 ${targetCount} 张`
      : "发送修改";

  selectionStatus.textContent = state.hasSelection ? "已选中局部修改区域" : "可直接描述修改，也可圈选局部";
  selectionStatus.classList.toggle("ready", state.hasSelection);

  if (executionTaskPending()) {
    composerNote.textContent = executionTaskCopy().message;
  } else if (state.refineSubmitting) {
    composerNote.textContent = targetCount > 1 ? `AI 正在依次修改 ${targetCount} 张图片` : "AI 正在生成新版本";
  } else if (!hasPrompt) {
    composerNote.textContent = state.hasSelection
      ? "已圈选局部，输入修改要求后会只修改当前图。"
      : state.editTarget === "selected" && targetCount > 1
        ? `已选择 ${targetCount} 张，可输入统一修改要求。`
        : "未圈选时，AI 会按整张图理解修改。";
  } else if (state.hasSelection) {
    composerNote.textContent = "局部圈选只会作用于当前图，避免误改其他图片。";
  } else if (targetCount > 1) {
    composerNote.textContent = `将把这条修改要求应用到 ${targetCount} 张选中图片。`;
  } else {
    composerNote.textContent = "将按整张图理解修改，并保留原图。";
  }
  if (studioBatchNote) {
    studioBatchNote.textContent =
      state.editTarget === "selected" && targetCount > 1 && !state.hasSelection
        ? `当前会批量修改 ${targetCount} 张；每张图会保留独立版本。`
        : "多选后可批量应用文字修改；圈选局部时只修改当前图。";
  }
  composerNote.classList.toggle("ready", hasPrompt && !state.refineSubmitting);
};

const setProtectionVisible = (visible) => {
  editStage.classList.toggle("show-protection", visible);
};

const setupCanvas = () => {
  const rect = editStage.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  state.maskHistory = [];
  state.hasSelection = false;
  editStage.classList.remove("has-selection");
  updateEditControls();
};

const clearMask = () => {
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  state.maskHistory = [];
  state.hasSelection = false;
  editStage.classList.remove("has-selection");
  updateEditControls();
};

const messageElement = ({ role, text, extraClass = "" }) => {
  const message = document.createElement("div");
  message.className = `message ${role} ${extraClass}`.trim();
  message.textContent = text;
  return message;
};

const renderChatMessages = () => {
  chatMessages.textContent = "";
  const item = ensureItemState(currentItem());
  item?.messages?.forEach((entry) => chatMessages.append(messageElement(entry)));
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

const appendMessage = (role, text, extraClass = "", options = {}) => {
  const index = options.index ?? state.activeItemIndex;
  const item = ensureItemState(state.job?.results?.[index]);
  const entry = { role, text, extraClass };
  if (item && options.persist !== false) item.messages.push(entry);
  const message = messageElement(entry);
  if (index === state.activeItemIndex) {
    chatMessages.append(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  if (index !== state.activeItemIndex) return null;
  return message;
};

const openEditor = (index) => {
  const results = state.job?.results || [];
  if (!results[index]) return;
  state.activeItemIndex = index;
  const item = ensureItemState(currentItem());
  state.activeVersionId = item?.version || 0;
  state.selectedEditIndexes.add(index);
  state.editTarget = "current";
  state.protectionPinned = false;
  chatInput.value = "";
  lockStateButton.setAttribute("aria-pressed", "false");
  lockStateButton.title = "显示商品主体保护范围";
  setProtectionVisible(false);
  editingTitle.textContent = `${item.title} · AI 精修`;
  if (!item.messages.length) {
    item.messages.push({
      role: "assistant",
      text: "商品主体已锁定。你可以直接描述想怎么改；需要局部调整时，再在图片上圈选位置。",
      extraClass: "",
    });
  }
  setResultView("editor");
  renderStudioQueue();
  renderChatMessages();
  renderVersions();
  window.requestAnimationFrame(() => {
    setupCanvas();
    applyVersion(state.activeVersionId);
  });
};

const canvasBlob = () =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("无法读取圈选区域"))), "image/png");
  });

const REFINE_STORAGE_KEY = "pintu.refinements.v1";
let pendingRefinements = [];
const saveRefinements = () => { try { sessionStorage.setItem(REFINE_STORAGE_KEY, JSON.stringify(pendingRefinements)); } catch {} };
const restoreRefinements = () => { try { const saved = JSON.parse(sessionStorage.getItem(REFINE_STORAGE_KEY) || "[]"); pendingRefinements = Array.isArray(saved) ? saved.filter(item => typeof item.requestId === "string" && typeof item.key === "string") : []; } catch {} };
// A local payload fingerprint only selects the same request ID on retry. The server validates the actual payload.
const refineFingerprint = value => {
  let a = 2166136261, b = 2246822507;
  for (let i = 0; i < value.length; i += 1) { const c = typeof value === "string" ? value.charCodeAt(i) : value[i]; a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 3266489909); }
  return `${value.length}:${a >>> 0}:${b >>> 0}`;
};
function reconcileRefinements(job) {
  if (!job?.id) return;
  const completed = new Set((job.results || []).flatMap(item => (item.versions || []).map(version => version.requestId)).filter(Boolean));
  const terminal = new Set((job.refinementRequests || []).filter(item => ["completed", "failed"].includes(item.status)).map(item => item.requestId));
  for (const request of pendingRefinements.filter(item => item.jobId === job.id && completed.has(item.requestId))) {
    const result = job.results.find(item => item.id === request.imageId);
    const version = result?.versions?.find(item => item.requestId === request.requestId);
    if (state.view === "editor" && currentItem()?.id === request.imageId && state.activeVersionId === request.versionId && version) {
      applyVersion(version.id);
      if (request.promptKey === refineFingerprint(chatInput.value.trim())) chatInput.value = "";
      if (request.scope === "selection" && state.hasSelection) clearMask();
      appendMessage("assistant", "已恢复上次修改的结果，原请求已完成。");
    }
  }
  pendingRefinements = pendingRefinements.filter(item => item.jobId !== job.id || !completed.has(item.requestId) && !terminal.has(item.requestId));
  state.refinePending = pendingRefinements.some(item => item.jobId === job.id && item.status === "waiting");
  state.refinePendingCode = pendingRefinements.find(item => item.jobId === job.id && item.status === "waiting" && executionStatusCopy(item.errorCode))?.errorCode || null;
  saveRefinements();
  if (state.view === "editor") updateEditControls();
}

const submitEdit = async () => {
  if (!state.job || taskIsBusy() || executionTaskPending()) return;
  const prompt = chatInput.value.trim();
  if (!prompt) {
    chatInput.focus();
    return;
  }

  const jobId = state.job.id;
  const epoch = accountEpoch;
  const activeIndex = state.activeItemIndex;
  const activeVersionId = state.activeVersionId;
  const hasSelection = state.hasSelection;
  const targetIndexes = activeResultIndexes();
  const targets = targetIndexes.map(index => ({ index, item: ensureItemState(state.job.results[index]), versionId: index === activeIndex ? activeVersionId : state.job.results[index].version || 0 }));
  targetIndexes.forEach((index) => appendMessage("user", prompt, "", { index }));
  chatInput.value = "";
  state.refineSubmitting = true;
  syncTaskControls();
  updateEditControls();
  const thinking = appendMessage(
    "assistant",
    state.hasSelection
      ? "正在按当前图的圈选区域生成新版本…"
      : targetIndexes.length > 1
        ? `正在依次修改 ${targetIndexes.length} 张选中图片…`
        : "正在按整张图理解修改要求并生成新版本…",
    "thinking",
    { persist: false }
  );
  try {
    const mask = hasSelection ? await canvasBlob() : null;
    const maskFingerprint = mask ? refineFingerprint(new Uint8Array(await mask.arrayBuffer())) : "none";
    if (epoch !== accountEpoch || state.job?.id !== jobId) return;
    let successCount = 0;
    let failed = false;
    for (const [position, { index, item, versionId }] of targets.entries()) {
      if (epoch !== accountEpoch || state.job?.id !== jobId) return;
      const scope = mask && index === activeIndex ? "selection" : "whole_image";
      const key = refineFingerprint(JSON.stringify({ jobId, imageId: item.id, versionId, prompt, scope, mask: scope === "selection" ? maskFingerprint : "none" }));
      let request = pendingRefinements.find(entry => entry.jobId === jobId && entry.imageId === item.id && entry.key === key);
      if (!request) {
        request = { requestId: newRequestId(), jobId, imageId: item.id, versionId, key, promptKey: refineFingerprint(prompt), scope, status: "sending" };
        pendingRefinements.push(request); saveRefinements();
      }
      const form = new FormData();
      form.set("requestId", request.requestId);
      form.set("imageId", item.id);
      form.set("versionId", String(versionId));
      form.set("prompt", prompt);
      form.set("scope", scope);
      if (scope === "selection") form.set("mask", mask, "mask.png");
      try {
        const payload = await apiRequest(`/api/jobs/${jobId}/refine`, { method: "POST", body: form });
        if (epoch !== accountEpoch || state.job?.id !== jobId) return;
        payload.result.messages = item.messages;
        payload.result.finalVersionId = item.finalVersionId;
        state.job.results[index] = payload.result;
        successCount += 1;
        pendingRefinements = pendingRefinements.filter(entry => entry.requestId !== request.requestId);
        saveRefinements();
        appendMessage("assistant", payload.message, "", { index });
        if (index === state.activeItemIndex) {
          state.activeVersionId = payload.version.id;
        }
        await pollJob();
        if (epoch !== accountEpoch || state.job?.id !== jobId) return;
        if (executionTaskPending()) {
          appendMessage("system", executionTaskCopy().message, "", { index });
          if (position + 1 < targets.length) {
            failed = true; chatInput.value = prompt;
            state.selectedEditIndexes = new Set(targets.slice(position + 1).map(target => target.index));
            state.editTarget = "selected"; updateTargetButtons();
          }
          break;
        }
      } catch (error) {
        if (error.code === "LOCAL_SESSION_CHANGED" || state.job?.id !== jobId) return;
        failed = true;
        request.status = executionWaiting(error) ? "waiting" : "retryable";
        request.errorCode = executionStatusCopy(error.code) ? error.code : null;
        if ([400, 422].includes(error.status)) pendingRefinements = pendingRefinements.filter(entry => entry !== request);
        state.refinePending = pendingRefinements.some(entry => entry.jobId === jobId && entry.status === "waiting");
        state.refinePendingCode = state.refinePending ? request.errorCode : null;
        saveRefinements();
        appendMessage("system", `${item.title}：${executionStatusCopy(error.code)?.message || `${error.message}；修改要求已保留，再次发送会查询或继续原请求。`}`, "", { index });
        chatInput.value = prompt;
        if (targets.length > 1) { state.selectedEditIndexes = new Set(targets.slice(position).map(target => target.index)); state.editTarget = "selected"; updateTargetButtons(); }
        state.pollTimer = window.setTimeout(pollJob, 5000);
        break;
      }
    }
    thinking?.remove();
    if (state.hasSelection && !failed) clearMask();
    if (successCount && currentItem()) applyVersion(state.activeVersionId);
    if (targetIndexes.length > 1) {
      appendMessage("assistant", `本次已完成 ${successCount} / ${targetIndexes.length} 张修改。${failed ? "剩余图片的修改要求已保留。" : ""}`);
    }
    void window.pintuSession?.refresh().catch(() => {});
  } catch (error) {
    if (error.code === "LOCAL_SESSION_CHANGED" || epoch !== accountEpoch) return;
    thinking?.remove();
    chatInput.value = prompt;
    appendMessage("system", error.message);
  } finally {
    if (epoch !== accountEpoch) return;
    state.refineSubmitting = false;
    syncTaskControls();
    renderStudioQueue();
    renderChatMessages();
    updateEditControls();
  }
};

const getCanvasPoint = (event) => {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
};

dropzone.addEventListener("click", () => uploadInput.click());
uploadAddButton.addEventListener("click", () => uploadInput.click());
uploadCard.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadCard.classList.add("dragging");
});
uploadCard.addEventListener("dragleave", () => uploadCard.classList.remove("dragging"));
uploadCard.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadCard.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});
uploadInput.addEventListener("change", () => {
  addFiles(uploadInput.files);
  uploadInput.value = "";
});
uploadPreviews.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-upload]");
  if (!button) return;
  draft.files.splice(Number(button.dataset.removeUpload), 1);
  renderUploads();
});

modeButtons.forEach((button) => button.addEventListener("click", () => { applyMode(button); saveDraft(); }));
promptHelperButton?.addEventListener("click", assistWriting);
actionButton.addEventListener("click", () => startBrief());
reanalyzeButton.addEventListener("click", () => startBrief());
confirmGenerateButton.addEventListener("click", confirmGeneration);
retryButton.addEventListener("click", () => state.retryAction?.());
resetButton?.addEventListener("click", resetJob);
addSellingPointButton?.addEventListener("click", () => {
  if (!sellingPointsList || document.querySelectorAll(".selling-point-item").length >= 6) return;
  const item = createSellingPointItem("");
  sellingPointsList.append(item);
  item.querySelector("input")?.focus();
  updateSellingPointControls();
});
sellingPointsList?.addEventListener("input", (event) => {
  const input = event.target.closest(".selling-point-input");
  if (!input) return;
  input.value = cleanPoint(input.value);
});
sellingPointsList?.addEventListener("focusout", (event) => {
  const input = event.target.closest(".selling-point-input");
  if (input) input.value = cleanPoint(input.value);
});
sellingPointsList?.addEventListener("click", (event) => {
  const remove = event.target.closest(".remove-selling-point");
  if (!remove) return;
  remove.closest(".selling-point-item")?.remove();
  if (!sellingPointsList.children.length) sellingPointsList.append(createSellingPointItem(""));
  updateSellingPointControls();
});
styleSuggestions?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-style-index]");
  if (!card) return;
  state.selectedStyleIndex = Number(card.dataset.styleIndex || 0);
  state.customStyleActive = false;
  if (customStyleInput) customStyleInput.value = "";
  styleSuggestions.querySelectorAll(".style-card").forEach((item) => {
    const active = item === card;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
});
customStyleInput?.addEventListener("input", () => {
  state.customStyleActive = Boolean(customStyleInput.value.trim());
  styleSuggestions?.querySelectorAll(".style-card").forEach((item) => {
    item.classList.remove("active");
    item.setAttribute("aria-pressed", "false");
  });
});
outputPlanList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-plan-step]");
  if (!button) return;
  const planItem = state.outputPlan.find((item) => item.type === button.dataset.planType);
  if (!planItem) return;
  const input = outputPlanList.querySelector(`.analysis-plan-count[data-plan-type="${planItem.type}"]`);
  const nextValue = clampCount(Number(input?.value || planItem.recommendedCount) + Number(button.dataset.planStep), planItem.min, planItem.max);
  if (input) input.value = String(nextValue);
  refreshOutputsFromPlan();
});
outputPlanList?.addEventListener("change", (event) => {
  if (!event.target.closest(".analysis-plan-count")) return;
  refreshOutputsFromPlan();
});
openStudioButton?.addEventListener("click", () => openEditor(0));
resultGrid.addEventListener("click", (event) => {
  const retry = event.target.closest("[data-retry-item-index]");
  if (retry) {
    retryGenerationItem(Number(retry.dataset.retryItemIndex));
    return;
  }
  const preview = event.target.closest("[data-preview-index]");
  if (preview) {
    openLightbox(Number(preview.dataset.previewIndex));
    return;
  }
  const button = event.target.closest("[data-refine-index]");
  if (button) openEditor(Number(button.dataset.refineIndex));
  const download = event.target.closest(".download-result");
  if (download) {
    download.classList.add("downloading");
    const label = download.querySelector("span");
    if (label) label.textContent = "正在保存";
    window.setTimeout(() => {
      download.classList.remove("downloading");
      if (label) label.textContent = "下载图片";
    }, 1800);
  }
});
studioQueueList?.addEventListener("click", (event) => {
  const select = event.target.closest("[data-queue-select-index]");
  if (select) {
    const index = Number(select.dataset.queueSelectIndex);
    if (state.selectedEditIndexes.has(index)) {
      state.selectedEditIndexes.delete(index);
    } else {
      state.selectedEditIndexes.add(index);
    }
    if (!state.selectedEditIndexes.size) state.selectedEditIndexes.add(state.activeItemIndex);
    renderStudioQueue();
    updateEditControls();
    return;
  }
  const open = event.target.closest("[data-queue-index]");
  if (!open) return;
  const index = Number(open.dataset.queueIndex);
  if (!state.job?.results?.[index]) return;
  state.activeItemIndex = index;
  const item = ensureItemState(currentItem());
  state.activeVersionId = item.version || 0;
  state.comparing = false;
  clearMask();
  editingTitle.textContent = `${item.title} · AI 精修`;
  if (!item.messages.length) {
    item.messages.push({
      role: "assistant",
      text: "商品主体已锁定。你可以直接描述想怎么改；需要局部调整时，再在图片上圈选位置。",
      extraClass: "",
    });
  }
  renderStudioQueue();
  renderChatMessages();
  renderVersions();
  window.requestAnimationFrame(() => {
    setupCanvas();
    applyVersion(state.activeVersionId);
  });
});
editTargetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.editTarget = button.dataset.editTarget || "current";
    if (state.editTarget === "selected" && !state.selectedEditIndexes.size) {
      state.selectedEditIndexes.add(state.activeItemIndex);
    }
    updateTargetButtons();
    renderStudioQueue();
    updateEditControls();
  });
});
lightboxCloseButtons.forEach((button) => button.addEventListener("click", closeLightbox));
lightboxRefine?.addEventListener("click", () => {
  const index = state.lightboxIndex;
  closeLightbox();
  if (Number.isInteger(index)) openEditor(index);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox?.classList.contains("active")) closeLightbox();
});
const returnToResults = () => {
  renderResultGallery();
  setResultView("gallery");
};
backResultsButton.addEventListener("click", returnToResults);
editorBackButton.addEventListener("click", returnToResults);

quickPromptButtons.forEach((button) => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.quickPrompt || "";
    chatInput.focus();
    updateEditControls();
  });
});
sendEditButton.addEventListener("click", submitEdit);
chatInput.addEventListener("input", updateEditControls);
chatInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitEdit();
});

lockStateButton.addEventListener("pointerenter", () => setProtectionVisible(true));
lockStateButton.addEventListener("pointerleave", () => {
  if (!state.protectionPinned) setProtectionVisible(false);
});
lockStateButton.addEventListener("click", () => {
  state.protectionPinned = !state.protectionPinned;
  lockStateButton.setAttribute("aria-pressed", String(state.protectionPinned));
  lockStateButton.title = state.protectionPinned ? "隐藏商品主体保护范围" : "显示商品主体保护范围";
  setProtectionVisible(state.protectionPinned);
});

canvas.addEventListener("pointerdown", (event) => {
  const context = canvas.getContext("2d");
  state.maskHistory.push(context.getImageData(0, 0, canvas.width, canvas.height));
  state.drawing = true;
  state.lastPoint = getCanvasPoint(event);
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!state.drawing || !state.lastPoint) return;
  const point = getCanvasPoint(event);
  const context = canvas.getContext("2d");
  const ratio = canvas.width / canvas.getBoundingClientRect().width;
  context.save();
  context.strokeStyle = "rgba(8, 145, 178, 0.48)";
  context.lineWidth = Number(brushSize.value || 28) * ratio;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(state.lastPoint.x, state.lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  context.restore();
  state.lastPoint = point;
  if (!state.hasSelection) {
    state.hasSelection = true;
    updateEditControls();
  }
  editStage.classList.add("has-selection");
});

const stopDrawing = (event) => {
  if (!state.drawing) return;
  state.drawing = false;
  state.lastPoint = null;
  if (event?.pointerId !== undefined && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
};

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
undoMaskButton.addEventListener("click", () => {
  const snapshot = state.maskHistory.pop();
  if (!snapshot) return;
  canvas.getContext("2d").putImageData(snapshot, 0, 0);
  state.hasSelection = state.maskHistory.length > 0;
  editStage.classList.toggle("has-selection", state.hasSelection);
  updateEditControls();
});
clearMaskButton.addEventListener("click", clearMask);
compareButton.addEventListener("click", () => {
  const item = currentItem();
  const current = item.versions.find((version) => version.id === state.activeVersionId);
  state.comparing = !state.comparing;
  editingImage.src = state.comparing ? item.versions[0].url : current.url;
  compareButton.setAttribute("aria-pressed", String(state.comparing));
  const label = state.comparing ? "查看当前版本" : "对比原图";
  compareButton.setAttribute("aria-label", label);
  compareButton.title = label;
});
versionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-version-id]");
  if (button) applyVersion(Number(button.dataset.versionId));
});
finalVersionButton.addEventListener("click", () => {
  const item = ensureItemState(currentItem());
  if (!item) return;
  item.finalVersionId = state.activeVersionId;
  renderVersions();
  appendMessage("assistant", `已将${state.activeVersionId === 0 ? "原图" : `版本 ${state.activeVersionId}`}设为最终成品。`);
});
window.addEventListener("resize", () => {
  if (state.view === "editor") setupCanvas();
});
window.addEventListener("beforeunload", clearObjectUrls);

const initialMode = new URLSearchParams(window.location.search).get("mode");
const initialButton =
  Array.from(modeButtons).find((button) => button.dataset.mode === initialMode) ||
  document.querySelector("[data-mode].active");
if (initialButton) applyMode(initialButton);
renderTaskSummary();
renderUploads();

const ACCOUNT_SCOPE_KEY = "pintu.session-scope.v1";
let accountScope;
let workspaceReady = false;
let workspaceBooting = false;
const clearAccountWorkspace = () => {
  accountEpoch += 1;
  clearPoll(); clearBriefPoll();
  if (state.reconnectTimer) window.clearTimeout(state.reconnectTimer);
  forgetJob(); closeLightbox();
  Object.assign(state, { job: null, jobConfig: null, requestBusy: false, restoring: false, refineSubmitting: false, refinePending: false, refinePendingCode: null, rewriteBusy: false, retryAction: null, reconnectTimer: null, pollInFlight: false, analysisSubmission: null, detailDraft: null, outputPlan: [], activeItemIndex: 0, activeVersionId: 0, selectedEditIndexes: new Set(), editTarget: "current", hasSelection: false, drawing: false, maskHistory: [] });
  Object.assign(briefState, { data: null, busy: false, pending: null, active: false, error: null, summaryEdited: false, pollInFlight: false, restoreInFlight: false });
  Object.assign(rewriteState, { jobId: null, request: null, localSnapshot: null, sourceFingerprint: null, appliedRequestId: null, processedRequestId: null, result: null, conflict: false, error: null });
  pendingRefinements = [];
  for (const storage of [sessionStorage, localStorage]) {
    try {
      for (const key of Object.keys(storage)) {
        if ([TASK_STORAGE_KEY, DRAFT_STORAGE_KEY, BRIEF_KEY, REFINE_STORAGE_KEY, RETRY_STORAGE_KEY].includes(key) || key.startsWith("pintu.detail-plan.v2:") || key.startsWith("pintu.prompt-rewrite.v1:")) storage.removeItem(key);
      }
    } catch {}
  }
  draft.files = []; clearObjectUrls(); renderUploads(); uploadInput.value = "";
  for (const input of [promptTextarea, chatInput, briefInput, briefSummary, rewriteInput, customStyleInput]) if (input) input.value = "";
  document.querySelectorAll(".confirm-card input, .confirm-card textarea").forEach(input => { input.value = ""; });
  for (const selector of [".analysis-selling-points", ".analysis-outputs", ".analysis-plan-list", ".detail-strategy-fields", ".detail-material-coverage", ".detail-materials", ".detail-page-list", ".style-suggestions", ".analysis-protection", ".analysis-warnings", ".prompt-rewrite-results", ".brief-messages", ".brief-questions", ".brief-product-profile", ".studio-queue-list", ".version-list", ".chat-messages", ".result-grid"]) document.querySelector(selector)?.replaceChildren();
  for (const image of [editingImage, lightboxImage]) image?.removeAttribute("src");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  setPromptHelperState("idle"); setTaskNotice(); setResultView("empty"); updateProgress(0); renderTaskSummary(); syncTaskControls(); updateEditControls();
};
const applyAccountScope = () => {
  const session = window.pintuSession?.session();
  if (!session) return;
  const scope = session.ownerId || "unconfigured";
  let previous = accountScope;
  if (previous === undefined) { try { previous = sessionStorage.getItem(ACCOUNT_SCOPE_KEY) || localStorage.getItem(ACCOUNT_SCOPE_KEY); } catch {} }
  if (previous !== scope) {
    clearAccountWorkspace();
    if (previous) setDraftNotice("本机会话已更新，旧会话的素材和任务已从当前页面清除。");
  }
  accountScope = scope;
  try { sessionStorage.setItem(ACCOUNT_SCOPE_KEY, scope); localStorage.setItem(ACCOUNT_SCOPE_KEY, scope); } catch {}
};
window.addEventListener("pintu-session-changed", () => { applyAccountScope(); if (!workspaceReady && !workspaceBooting) void initializeWorkspace(); });
window.addEventListener("storage", event => { if (event.key === ACCOUNT_SCOPE_KEY && event.newValue !== accountScope) void window.pintuSession?.refresh().catch(() => {}); });

const restoreTask = async () => {
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(TASK_STORAGE_KEY) || localStorage.getItem(TASK_STORAGE_KEY) || "null"); } catch {}
  const requested = new URLSearchParams(location.search).get("job");
  const id = requested || saved?.id;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return;
  const mode = saved?.id === id ? saved.mode : initialMode;
  state.jobConfig = Object.freeze(saved?.id === id && saved.config ? saved.config : { mode: mode || "main", language: "简体中文" });
  state.restoring = true;
  state.job = { id, status: "restoring", results: [] };
  renderTaskSummary();
  syncTaskControls();
  showProcessing("正在恢复任务", "正在读取已保存的生成进度和结果…", 3);
  await pollJob();
};
const initializeWorkspace = async () => {
  if (workspaceBooting || workspaceReady) return;
  workspaceBooting = true; state.restoring = true; syncTaskControls();
  try {
    const session = await window.pintuSession?.ready();
    if (!session?.authenticated) { window.pintuSession?.open(); return; }
    applyAccountScope(); restoreDraft(); restoreRefinements();
    workspaceReady = true; state.restoring = false;
    await restoreTask(); await restoreBrief();
  } catch (error) { state.restoring = false; setDraftNotice(error.message); }
  finally { workspaceBooting = false; syncTaskControls(); }
};
void initializeWorkspace();
window.addEventListener("online", () => { if (state.view === "brief" && briefState.data?.id) void pollBrief(); else if (state.job?.id) void pollJob(); });
window.addEventListener("pintu-session-updated", () => { syncTaskControls(); if (state.job?.id && executionTaskPending()) void pollJob(); });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.job?.id && (taskIsRunning() || executionTaskPending() || state.restoring)) void pollJob();
});

window.pintuFeedbackContext=()=>state.job?{jobId:state.job.id,label:"当前任务"}:null;
