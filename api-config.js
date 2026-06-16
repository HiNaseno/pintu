(() => {
  const state = {
    config: null,
    models: [],
    verified: false,
    modalReady: false,
  };

  const selectors = {
    backdrop: "[data-api-config-backdrop]",
    baseUrl: "[data-api-base-url]",
    apiKey: "[data-api-key]",
    textModel: "[data-api-text-model]",
    imageModel: "[data-api-image-model]",
    modelDependent: "[data-api-model-dependent]",
    summary: "[data-api-model-summary]",
    status: "[data-api-status]",
    verify: "[data-api-verify]",
    test: "[data-api-test]",
    save: "[data-api-save]",
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(data?.error?.message || `请求失败：${response.status}`);
    }
    return data;
  };

  const setStatus = (message, tone = "") => {
    const status = $(selectors.status);
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("good", tone === "good");
    status.classList.toggle("bad", tone === "bad");
  };

  const setButtonBusy = (button, busy, text) => {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? text : button.dataset.originalText;
  };

  const option = (value, label = value) => {
    const item = document.createElement("option");
    item.value = value;
    item.textContent = label;
    return item;
  };

  const setSingleOption = (select, value) => {
    if (!select) return;
    select.innerHTML = "";
    if (value) {
      select.append(option(value));
      select.value = value;
    } else {
      select.append(option("", "未选择模型"));
    }
  };

  const populateSelect = (select, models, suggested, currentValue) => {
    if (!select) return;
    const ids = models.map((model) => model.id).filter(Boolean);
    const suggestedIds = suggested.filter((id) => ids.includes(id));
    const selected =
      (currentValue && ids.includes(currentValue) && currentValue) ||
      suggestedIds[0] ||
      ids[0] ||
      "";
    select.innerHTML = "";
    if (!ids.length) {
      setSingleOption(select, currentValue || "");
      return;
    }
    if (suggestedIds.length) {
      const group = document.createElement("optgroup");
      group.label = "推荐模型";
      suggestedIds.forEach((id) => group.append(option(id, `${id}  · 推荐`)));
      select.append(group);
    }
    const rest = ids.filter((id) => !suggestedIds.includes(id));
    const group = document.createElement("optgroup");
    group.label = "全部模型";
    rest.forEach((id) => group.append(option(id)));
    select.append(group);
    select.value = selected;
  };

  const showModelSummary = (count, provider) => {
    const summary = $(selectors.summary);
    if (!summary) return;
    if (!count) {
      summary.classList.remove("visible");
      summary.textContent = "";
      return;
    }
    summary.classList.add("visible");
    summary.textContent = `已读取 ${count} 个模型 · ${provider || "当前网关"}`;
  };

  const setModelChoicesVisible = (visible) => {
    document.querySelectorAll(selectors.modelDependent).forEach((element) => {
      element.hidden = !visible;
    });
  };

  const focusModelChoices = () => {
    const modal = $(".api-config-modal");
    const modelSection = $(".api-config-model-section");
    if (!modal || !modelSection || modelSection.hidden) return;
    requestAnimationFrame(() => {
      if (modal.scrollHeight <= modal.clientHeight) return;
      modal.scrollTo({
        top: Math.max(0, modelSection.offsetTop - 14),
        behavior: "smooth",
      });
    });
  };

  const applyModelList = (config) => {
    state.config = { ...(state.config || {}), ...config };
    const textModel = $(selectors.textModel);
    const imageModel = $(selectors.imageModel);
    state.models = config.models || [];
    state.verified = state.models.length > 0;
    if (state.models.length) {
      populateSelect(textModel, state.models, config.suggestedTextModels || [], config.textModel || state.config?.textModel);
      populateSelect(imageModel, state.models, config.suggestedImageModels || [], config.imageModel || state.config?.imageModel);
      showModelSummary(config.count || state.models.length, config.provider);
      setModelChoicesVisible(true);
      focusModelChoices();
      return;
    }
    setSingleOption(textModel, config.textModel || state.config?.textModel || "");
    setSingleOption(imageModel, config.imageModel || state.config?.imageModel || "");
    showModelSummary(0);
    setModelChoicesVisible(false);
  };

  const ensureModal = () => {
    if (state.modalReady) return;
    const backdrop = document.createElement("div");
    backdrop.className = "api-config-backdrop";
    backdrop.dataset.apiConfigBackdrop = "";
    backdrop.innerHTML = `
      <section class="api-config-modal" role="dialog" aria-modal="true" aria-labelledby="api-config-title">
        <div class="api-config-head">
          <div>
            <h2 class="api-config-title" id="api-config-title">API 配置</h2>
            <p>填写兼容 OpenAI 格式的 API 地址和 Key，验证后选择文字模型与图片模型。</p>
          </div>
          <button class="api-config-close" type="button" aria-label="关闭 API 配置" data-api-close>×</button>
        </div>

        <div class="api-config-section">
          <h3>连接配置</h3>
          <div class="api-config-grid">
            <label class="api-config-field wide">
              <span>API Base URL</span>
              <input data-api-base-url type="url" placeholder="请输入兼容 OpenAI 的 API URL，例如 https://api.example.com/v1" autocomplete="off" />
            </label>
            <label class="api-config-field wide">
              <span>API Key</span>
              <input data-api-key type="password" placeholder="请输入 API Key" autocomplete="off" />
              <small>已保存 Key 时可留空不变；Key 不会返回到浏览器明文。</small>
            </label>
          </div>
          <div class="api-config-actions">
            <button class="api-config-primary" type="button" data-api-verify>验证并获取模型</button>
            <button class="api-config-secondary" type="button" data-api-test>重新测试当前配置</button>
          </div>
          <p class="api-config-status" data-api-status></p>
        </div>

        <div class="api-config-section api-config-model-section" data-api-model-dependent hidden>
          <h3>模型选择</h3>
          <span class="api-config-model-summary" data-api-model-summary></span>
          <div class="api-config-grid">
            <label class="api-config-field">
              <span>文字模型</span>
              <select data-api-text-model></select>
            </label>
            <label class="api-config-field">
              <span>图片模型</span>
              <select data-api-image-model></select>
            </label>
          </div>
          <p class="api-config-security">Key 只保存在本机服务端 runtime 目录，不会提交到开源仓库。公开部署时请改用服务端环境变量或密钥管理。</p>
        </div>

        <div class="api-config-footer" data-api-model-dependent hidden>
          <small>保存后会立即影响 AI 帮写、商品分析、生图和对话精修。</small>
          <button class="api-config-primary" type="button" data-api-save>保存并生效</button>
        </div>
      </section>
    `;
    document.body.append(backdrop);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop || event.target.closest("[data-api-close]")) closeModal();
    });
    $(selectors.verify, backdrop).addEventListener("click", verifyModels);
    $(selectors.test, backdrop).addEventListener("click", testConfig);
    $(selectors.save, backdrop).addEventListener("click", saveConfig);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && backdrop.classList.contains("open")) closeModal();
    });
    state.modalReady = true;
  };

  const fillFromConfig = (config = {}) => {
    state.config = config;
    const baseUrl = $(selectors.baseUrl);
    const apiKey = $(selectors.apiKey);
    const textModel = $(selectors.textModel);
    const imageModel = $(selectors.imageModel);
    if (baseUrl) baseUrl.value = config.source === "runtime" ? config.baseUrl || "" : "";
    if (apiKey) {
      apiKey.value = "";
      apiKey.placeholder = config.hasApiKey ? "已保存，可留空不变" : "请输入 API Key";
    }
    setSingleOption(textModel, config.textModel);
    setSingleOption(imageModel, config.imageModel);
    showModelSummary(0);
    setModelChoicesVisible(false);
    const modelState = config.modelState || {};
    if (!config.hasApiKey) {
      setStatus("尚未配置 API Key。填写 Key 后点击“验证并获取模型”。", "bad");
    } else if (modelState.reachable && modelState.textAvailable && modelState.imageAvailable) {
      setStatus("当前保存配置可用。模型列表读取完成后再选择模型。", "good");
    } else {
      setStatus(modelState.error || "当前配置尚未验证。", modelState.error ? "bad" : "");
    }
  };

  const refreshSavedModels = async ({ silent = false } = {}) => {
    if (!silent) setStatus("正在测试当前保存配置...");
    const config = await apiRequest("/api/config/test", { method: "POST", body: "{}" });
    fillFromConfig(config);
    applyModelList(config);
    setStatus(config.modelState?.error || "当前保存配置可用，模型列表已刷新。", config.modelState?.error ? "bad" : "good");
    return config;
  };

  const openModal = async () => {
    ensureModal();
    const backdrop = $(selectors.backdrop);
    backdrop.classList.add("open");
    backdrop.scrollTop = 0;
    document.body.style.overflow = "hidden";
    setStatus("正在读取当前配置...");
    try {
      const config = await apiRequest("/api/config");
      fillFromConfig(config);
    } catch (error) {
      setStatus(`本地服务未连接：${error.message}`, "bad");
    }
  };

  const closeModal = () => {
    const backdrop = $(selectors.backdrop);
    if (!backdrop) return;
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  };

  async function verifyModels() {
    const button = $(selectors.verify);
    const baseUrl = $(selectors.baseUrl).value.trim();
    const apiKey = $(selectors.apiKey).value.trim();
    if (!baseUrl) {
      setStatus("请先填写你要连接的 API Base URL。", "bad");
      return;
    }
    if (!apiKey) {
      setStatus("为了获取模型列表，请输入 API Key。已保存的 Key 不会回传到浏览器。", "bad");
      return;
    }
    setButtonBusy(button, true, "验证中...");
    setStatus("正在连接模型接口...");
    try {
      const result = await apiRequest("/api/config/models", {
        method: "POST",
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      state.config = {
        ...(state.config || {}),
        baseUrl,
        hasApiKey: true,
      };
      applyModelList({
        ...result,
        baseUrl,
        textModel: state.config?.textModel,
        imageModel: state.config?.imageModel,
      });
      setStatus("模型列表读取成功，请选择文字模型和图片模型。", "good");
    } catch (error) {
      state.verified = false;
      setStatus(error.message, "bad");
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function testConfig() {
    const button = $(selectors.test);
    setButtonBusy(button, true, "测试中...");
    try {
      await refreshSavedModels();
    } catch (error) {
      setStatus(error.message, "bad");
    } finally {
      setButtonBusy(button, false);
    }
  }

  async function saveConfig() {
    const button = $(selectors.save);
    const baseUrl = $(selectors.baseUrl).value.trim() || state.config?.baseUrl || "";
    const apiKey = $(selectors.apiKey).value.trim();
    const textModel = $(selectors.textModel).value;
    const imageModel = $(selectors.imageModel).value;
    if (!baseUrl || !textModel || !imageModel) {
      setStatus("请完整填写 URL，并选择文字模型和图片模型。", "bad");
      return;
    }
    setButtonBusy(button, true, "保存中...");
    setStatus("正在保存并验证配置...");
    try {
      const config = await apiRequest("/api/config", {
        method: "POST",
        body: JSON.stringify({
          baseUrl,
          apiKey,
          textModel,
          imageModel,
          previewImageModel: imageModel,
        }),
      });
      fillFromConfig(config);
      await refreshSavedModels({ silent: true }).catch(() => {});
      setStatus("配置已生效，后续 AI 请求会使用新的 URL 和模型。", "good");
      window.dispatchEvent(new CustomEvent("api-config:updated", { detail: config }));
    } catch (error) {
      setStatus(error.message, "bad");
    } finally {
      setButtonBusy(button, false);
    }
  }

  const init = () => {
    document.querySelectorAll(".api-config-button").forEach((button) => {
      button.addEventListener("click", openModal);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
