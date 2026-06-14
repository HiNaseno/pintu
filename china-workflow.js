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
const moreModes = document.querySelector(".more-modes");
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
    title: "AI 电商主图生成",
    subtitle: "上传商品图，自动分析卖点，一键生成可上架主图",
    label: "主图要求",
    placeholder: "请输入商品名称、核心卖点、风格要求、平台用途等",
    uploadTitle: "上传商品图片",
    uploadSubtitle: "支持正面、侧面、细节、SKU 图",
    dropzoneTitle: "上传商品图片",
    dropzoneSubtitle: "支持正面、侧面、细节、SKU 图",
    action: "生成方案",
  },
  detail: {
    title: "生成详情页图组",
    subtitle: "根据商品卖点、参数、细节和SKU信息，生成结构清晰的详情页长图。",
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

const state = {
  mode: "main",
  view: "empty",
  files: [],
  previewUrls: [],
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
  retryAction: null,
  comparing: false,
  protectionPinned: false,
  refineSubmitting: false,
  reconnectTimer: null,
  selectedStyleIndex: 0,
  customStyleActive: false,
  outputPlan: [],
  lightboxIndex: null,
};

const apiRequest = async (url, options = {}) => {
  let response;
  try {
    response = await fetch(url, options);
  } catch (cause) {
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
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `请求失败：HTTP ${response.status}`);
    error.status = response.status;
    error.requestId = payload?.error?.requestId || null;
    error.code = payload?.error?.code || null;
    error.retryable = Boolean(payload?.error?.retryable);
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
    resultHeadTitle.textContent = view === "editor" ? "对话精修" : view === "empty" ? "创作画布" : "生成结果";
  }
  if (resultHeadSubtitle) {
    const subtitles = {
      empty: "上传商品图后生成推荐方案",
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
  state.retryAction = retryAction;
  document.querySelector(".error-title").textContent = error.status === 422
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
  document.querySelector(".error-message").textContent = error.message;
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
      setResultView(state.job?.results?.length ? "gallery" : "empty");
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
  state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  state.previewUrls = [];
};

const renderUploads = () => {
  clearObjectUrls();
  uploadPreviews.textContent = "";
  state.files.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    state.previewUrls.push(url);
    const item = document.createElement("div");
    item.className = "upload-preview";
    const image = document.createElement("img");
    image.className = "upload-preview-image";
    image.src = url;
    image.alt = file.name;
    image.width = 56;
    image.height = 56;
    image.decoding = "async";
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
  uploadCount.textContent = `${state.files.length}/6`;
};

const addFiles = (fileList) => {
  const accepted = Array.from(fileList).filter((file) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      showError(new Error(`${file.name} 不是支持的图片格式`), null);
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError(new Error(`${file.name} 超过 10MB`), null);
      return false;
    }
    return true;
  });
  state.files = [...state.files, ...accepted].slice(0, 6);
  renderUploads();
  if (state.view === "error") setResultView("empty");
};

const resetJob = () => {
  clearPoll();
  state.job = null;
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
  if (moreModes) moreModes.open = Boolean(button.closest(".more-modes"));
  state.mode = button.dataset.mode || "main";
  const copy = modeCopy[state.mode] || modeCopy.main;
  title.textContent = copy.title;
  subtitle.textContent = copy.subtitle;
  if (promptLabel) promptLabel.textContent = copy.label;
  if (promptTextarea) promptTextarea.placeholder = copy.placeholder;
  if (uploadTitle) uploadTitle.textContent = copy.uploadTitle;
  if (uploadSubtitle) uploadSubtitle.textContent = copy.uploadSubtitle;
  if (dropzoneTitle) dropzoneTitle.textContent = copy.dropzoneTitle;
  if (dropzoneSubtitle) dropzoneSubtitle.textContent = copy.dropzoneSubtitle;
  setActionButtonLabel(copy.action);
  if (actionButton) actionButton.disabled = false;
  resetJob();
};

const buildAnalyzeForm = () => {
  const form = new FormData();
  state.files.forEach((file) => form.append("images", file, file.name));
  form.set("mode", state.mode);
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
  state.files.forEach((file) => form.append("images", file, file.name));
  form.set("mode", state.mode);
  form.set("platform", platformSelect.value);
  form.set("language", languageSelect.value);
  form.set("ratio", ratioSelect.value);
  form.set("currentText", promptTextarea.value.trim());
  setPromptHelperState(
    "loading",
    state.files.length ? "GPT-5.5 正在识别商品并整理要求…" : "GPT-5.5 正在整理生成要求…"
  );
  try {
    const payload = await apiRequest("/api/assist-writing", { method: "POST", body: form });
    promptTextarea.value = payload.suggestion;
    promptTextarea.focus();
    setPromptHelperState(
      "success",
      payload.visionFallback
        ? "图片识别连接不稳定，已按当前设置完成帮写，可继续修改。"
        : payload.usedImages
          ? "已结合商品主图补全，可继续修改。"
          : "已补全生成要求，可继续修改。"
    );
  } catch (error) {
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
  state.selectedStyleIndex = 0;
  state.customStyleActive = false;
  if (customStyleInput) customStyleInput.value = "";
  styleSuggestions.textContent = "";
  styles.forEach((style, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "style-card";
    button.dataset.styleIndex = String(index);
    button.setAttribute("aria-pressed", String(index === 0));
    if (index === 0) button.classList.add("active");
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
  language: languageSelect.value,
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
          title: String(item.title || `${role}${definition.label}`).trim().slice(0, 80),
          creativeRole: role.slice(0, 40),
          description: String(item.description || `围绕“${role}”生成一张可单独使用的图片。`).trim().slice(0, 140),
          promptHint: String(item.promptHint || "").trim().slice(0, 500),
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
  const promptHint = item.promptHint || previous.prompt || "";
  const detailRule = planItem.type === "detail"
    ? `这是详情页第 ${index + 1} 屏的独立画面，不要拼成长图。`
    : "";
  const prompt = promptHint || [
    `生成${definition.typeLabel}：${item.title}。`,
    `创意角色：${item.creativeRole}。${item.description}`,
    detailRule,
    languageSelect.value === "无文字（纯视觉）"
      ? "不得新增任何文字，商品原有印刷内容保持不变。"
      : `可以生成${languageSelect.value}短标题或卖点文字，但必须基于确认信息和图片可见事实。`,
  ].filter(Boolean).join("\n");
  return {
    planType: planItem.type,
    type: definition.typeLabel,
    title: String(previous.title || item.title).trim().slice(0, 100),
    creativeRole: String(previous.creativeRole || item.creativeRole).trim().slice(0, 60),
    description: String(previous.description || item.description).trim().slice(0, 180),
    prompt: String(prompt).trim().slice(0, 3000),
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
    const details = document.createElement("details");
    details.className = "analysis-output-details";
    const summary = document.createElement("summary");
    summary.textContent = "完整指令";
    const promptInput = document.createElement("textarea");
    promptInput.className = "analysis-output-prompt";
    promptInput.value = output.prompt;
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

const renderAnalysis = (analysis) => {
  document.querySelector(".analysis-product").textContent = analysis.product;
  document.querySelector(".analysis-direction").textContent = analysis.visualDirection;
  renderSellingPoints(analysis.sellingPoints);
  renderStyleSuggestions(analysis);
  appendTextItems(document.querySelector(".analysis-protection"), analysis.protectionRules);
  state.outputPlan = normalizeOutputPlan(analysis);
  analysis.recommendedOutputPlan = state.outputPlan;
  analysis.outputs = outputsFromPlan(state.outputPlan, analysis.outputs);
  renderOutputPlan();
  renderOutputList(analysis.outputs);
  updateOutputCount();
  const warnings = document.querySelector(".analysis-warnings");
  warnings.hidden = !analysis.warnings?.length;
  warnings.textContent = analysis.warnings?.length ? `需要留意：${analysis.warnings.join("；")}` : "";
  const advanced = document.querySelector(".analysis-advanced");
  if (advanced) advanced.open = false;
  setResultView("confirm");
  updateProgress(2);
};

const analyzeJob = async () => {
  if (!state.files.length) {
    showError(new Error("请先上传至少一张 PNG、JPEG 或 WebP 商品图片"), analyzeJob);
    return;
  }
  clearPoll();
  actionButton.disabled = true;
  showProcessing("正在分析商品", "GPT-5.5 正在识别主体、卖点和平台图片结构", 1);
  try {
    state.job = await apiRequest("/api/jobs/analyze", { method: "POST", body: buildAnalyzeForm() });
    state.selectedEditIndexes = new Set();
    state.activeItemIndex = 0;
    state.activeVersionId = 0;
    state.editTarget = "current";
    renderAnalysis(state.job.analysis);
  } catch (error) {
    showError(error, analyzeJob);
  } finally {
    actionButton.disabled = false;
  }
};

const editedOutputs = () => {
  const titleInputs = Array.from(document.querySelectorAll(".analysis-output-title"));
  const roleInputs = Array.from(document.querySelectorAll(".analysis-output-role-input"));
  const descriptionInputs = Array.from(document.querySelectorAll(".analysis-output-description"));
  const promptInputs = Array.from(document.querySelectorAll(".analysis-output-prompt"));
  return (state.job?.analysis?.outputs || []).map((output, index) => ({
    ...output,
    title: titleInputs[index]?.value.trim() || output.title,
    creativeRole: roleInputs[index]?.value.trim() || output.creativeRole,
    description: descriptionInputs[index]?.value.trim() || output.description,
    prompt: promptInputs[index]?.value.trim() || output.prompt,
  }));
};

const editedOutputPlan = () => {
  syncOutputPlanFromInputs();
  return state.outputPlan.map((planItem) => {
    const outputs = editedOutputs().filter((output) => output.planType === planItem.type);
    return {
      ...planItem,
      items: outputs.map((output) => ({
        title: output.title,
        creativeRole: output.creativeRole,
        description: output.description,
        promptHint: output.prompt,
      })),
    };
  });
};

const generationStatusCopy = (job) => {
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
  try {
    const job = await apiRequest(`/api/jobs/${state.job.id}`);
    state.job = job;
    const hasGenerationQueue = Array.isArray(job.generationItems) && job.generationItems.length > 0;
    if (hasGenerationQueue) {
      updateProgress(3);
      renderResultGallery();
      setResultView("gallery");
    } else {
      showProcessing(job.stage || "正在生成电商素材", generationStatusCopy(job), 3);
    }
    if (job.status === "completed") {
      updateProgress(4);
      renderResultGallery();
      setResultView("gallery");
      return;
    }
    if (job.status === "failed") {
      if (hasGenerationQueue) {
        updateProgress(4);
        renderResultGallery();
        setResultView("gallery");
        return;
      }
      if (job.results?.length) {
        updateProgress(4);
        renderResultGallery();
        setResultView("gallery");
        return;
      }
      const error = new Error(job.error?.message || "图片生成失败");
      error.requestId = job.error?.requestId || null;
      error.code = job.error?.code || null;
      error.retryable = Boolean(job.error?.retryable);
      throw error;
    }
    state.pollTimer = window.setTimeout(pollJob, 1500);
  } catch (error) {
    showError(error, confirmGeneration);
  }
};

const confirmGeneration = async () => {
  if (!state.job) return;
  confirmGenerateButton.disabled = true;
  const finalPlan = editedOutputPlan();
  const totalCount = planTotalCount(finalPlan);
  showProcessing("正在提交生成任务", `确认方案已发送，预计生成 ${totalCount} 张可编辑素材`, 3);
  try {
    state.job = await apiRequest(`/api/jobs/${state.job.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputs: editedOutputs(),
        outputPlan: finalPlan,
        analysisPatch: analysisPatch(),
      }),
    });
    renderResultGallery();
    setResultView("gallery");
    await pollJob();
  } catch (error) {
    showError(error, confirmGeneration);
  } finally {
    confirmGenerateButton.disabled = false;
  }
};

const retryGenerationItem = async (index) => {
  if (!state.job) return;
  try {
    state.job = await apiRequest(`/api/jobs/${state.job.id}/items/${index}/retry`, {
      method: "POST",
    });
    renderResultGallery();
    setResultView("gallery");
    await pollJob();
  } catch (error) {
    showError(error, () => retryGenerationItem(index));
  }
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
    ? generationItems.filter((item) => ["failed", "interrupted"].includes(item.status)).length
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
    galleryWarning.hidden = !failedCount && !state.job?.error?.partial;
    galleryWarning.textContent = failedCount
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
    model.textContent = `${item.modelLabel || "图片模型"} · ${item.qualityTier || "成品"}`;
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
    actions.append(preview, refine, download);
    copy.append(heading, role, note, actions);
    card.append(visual, copy);
    resultGrid.append(card);
  };

  const renderQueueCard = (item) => {
    const status = item.status || "queued";
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
        <strong>${failed ? "生成未完成" : active ? "正在生成" : "等待生成"}</strong>
        <small>${item.progressLabel || (failed ? "可单独重试" : active ? "图片生成中" : "已加入队列")}</small>
        <div class="generation-progress" aria-hidden="true"><i style="width:${progress}%"></i></div>
      </div>
    `;
    const copy = document.createElement("div");
    copy.className = "result-card-copy";
    const heading = document.createElement("strong");
    heading.textContent = item.title || `第 ${item.index + 1} 张图片`;
    const role = document.createElement("span");
    role.className = "result-card-role";
    role.textContent = item.creativeRole || item.type || "独立生成项";
    const note = document.createElement("small");
    note.textContent = failed
      ? item.error?.message || "图片通道没有返回结果，可单独重试。"
      : item.type || "生成完成后会自动显示在这里。";
    const actions = document.createElement("div");
    actions.className = "result-card-actions";
    if (failed) {
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
  lightboxMeta.textContent = `${item.modelLabel || "图片模型"} · ${item.qualityTier || "成品"} · ${item.width}×${item.height}`;
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
  const canSend = hasPrompt && !state.refineSubmitting;
  sendEditButton.disabled = !canSend;
  sendEditButton.dataset.loading = String(state.refineSubmitting);
  sendEditButton.textContent = state.refineSubmitting
    ? "生成中"
    : targetCount > 1
      ? `发送到 ${targetCount} 张`
      : "发送修改";

  selectionStatus.textContent = state.hasSelection ? "已选中局部修改区域" : "可直接描述修改，也可圈选局部";
  selectionStatus.classList.toggle("ready", state.hasSelection);

  if (state.refineSubmitting) {
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
  state.refineSubmitting = false;
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

const submitEdit = async () => {
  const prompt = chatInput.value.trim();
  if (!prompt) {
    chatInput.focus();
    return;
  }

  const targetIndexes = activeResultIndexes();
  targetIndexes.forEach((index) => appendMessage("user", prompt, "", { index }));
  chatInput.value = "";
  state.refineSubmitting = true;
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
    const mask = state.hasSelection ? await canvasBlob() : null;
    let successCount = 0;
    for (const index of targetIndexes) {
      const item = ensureItemState(state.job.results[index]);
      const form = new FormData();
      form.set("imageId", item.id);
      form.set("versionId", String(index === state.activeItemIndex ? state.activeVersionId : item.version || 0));
      form.set("prompt", prompt);
      form.set("scope", mask && index === state.activeItemIndex ? "selection" : "whole_image");
      if (mask && index === state.activeItemIndex) form.set("mask", mask, "mask.png");
      try {
        const payload = await apiRequest(`/api/jobs/${state.job.id}/refine`, { method: "POST", body: form });
        payload.result.messages = item.messages;
        payload.result.finalVersionId = item.finalVersionId;
        state.job.results[index] = payload.result;
        successCount += 1;
        appendMessage("assistant", payload.message, "", { index });
        if (index === state.activeItemIndex) {
          state.activeVersionId = payload.version.id;
        }
      } catch (error) {
        appendMessage("system", `${item.title}：${error.message}`, "", { index });
      }
    }
    thinking.remove();
    if (state.hasSelection) clearMask();
    if (successCount && currentItem()) applyVersion(state.activeVersionId);
    if (targetIndexes.length > 1) {
      appendMessage("assistant", `批量修改完成：成功 ${successCount} / ${targetIndexes.length} 张。`);
    }
  } catch (error) {
    thinking.remove();
    appendMessage("system", error.message);
  } finally {
    state.refineSubmitting = false;
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
dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragging"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});
uploadInput.addEventListener("change", () => {
  addFiles(uploadInput.files);
  uploadInput.value = "";
});
uploadPreviews.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-upload]");
  if (!button) return;
  state.files.splice(Number(button.dataset.removeUpload), 1);
  renderUploads();
});

modeButtons.forEach((button) => button.addEventListener("click", () => applyMode(button)));
promptHelperButton?.addEventListener("click", assistWriting);
actionButton.addEventListener("click", analyzeJob);
reanalyzeButton.addEventListener("click", analyzeJob);
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
backResultsButton.addEventListener("click", () => setResultView("gallery"));
editorBackButton.addEventListener("click", () => setResultView("gallery"));

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
renderUploads();

apiRequest("/api/health").catch((error) => {
  showError(error, () => window.location.reload());
});
