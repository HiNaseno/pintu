import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { createApiOverview, createOpenApiSpec, renderApiDocsHtml } from "./api-docs.js";

dotenv.config();

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME_ROOT = process.env.PINTU_RUNTIME_ROOT
  ? path.resolve(process.env.PINTU_RUNTIME_ROOT)
  : path.join(ROOT, "runtime");
const JOB_ROOT = path.join(RUNTIME_ROOT, "jobs");
const GENERATED_ROOT = path.join(RUNTIME_ROOT, "generated");
const LOG_ROOT = path.join(RUNTIME_ROOT, "logs");
const JOB_EVENT_LOG = path.join(LOG_ROOT, "jobs.log");
const API_CONFIG_FILE = path.join(RUNTIME_ROOT, "api-config.json");
const JOB_SNAPSHOT_FILE = "job.json";
const PORT = Number(process.env.PORT || 5176);
const DEFAULT_BASE_URL = safeNormalizeBaseUrl(process.env.OPENAI_BASE_URL, "https://api.openai.com/v1");
const DEFAULT_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "";
const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "";
const DEFAULT_PREVIEW_IMAGE_MODEL = process.env.OPENAI_PREVIEW_IMAGE_MODEL || "";
const FILE_TTL_MS = Number(process.env.GENERATED_FILE_TTL_HOURS || 24) * 60 * 60 * 1000;
const AI_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 360_000);
const CONFIG_REQUEST_TIMEOUT_MS = Number(process.env.CONFIG_REQUEST_TIMEOUT_MS || 30_000);
const IMAGE_REQUEST_TIMEOUT_MS = Number(process.env.IMAGE_REQUEST_TIMEOUT_MS || 120_000);
const MAX_RECOMMENDED_SYNC_OUTPUTS = Number(process.env.MAX_RECOMMENDED_SYNC_OUTPUTS || 12);
const IMAGE_GENERATION_MAX_ATTEMPTS = Number(process.env.IMAGE_GENERATION_MAX_ATTEMPTS || 2);
const IMAGE_GENERATION_RETRY_DELAY_MS = Number(process.env.IMAGE_GENERATION_RETRY_DELAY_MS || 4_000);
const MAX_FILES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MODEL_PREVIEW_INPUT_SIZE = Number(process.env.MODEL_PREVIEW_INPUT_SIZE || 512);
const MODEL_STANDARD_INPUT_SIZE = Number(process.env.MODEL_STANDARD_INPUT_SIZE || 640);
const MODEL_HIGH_INPUT_SIZE = Number(process.env.MODEL_HIGH_INPUT_SIZE || 768);
const WRITING_VISION_INPUT_SIZE = 640;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const PUBLIC_FILES = new Set([
  "china-full.html",
  "china-full.css",
  "china-full.js",
  "api-config.css",
  "api-config.js",
  "china-workflow.html",
  "china-workflow.css",
  "china-workflow.js",
  "china-examples.html",
  "china-examples.css",
  "china-examples.js",
  "platform-flow.svg",
  "platform-flow-mobile.svg",
  "index.html",
  "styles.css",
  "script.js",
  "picset-style.html",
  "picset-style.css",
]);

const app = express();
const jobs = new Map();
const activeGenerationJobs = new Set();
let BASE_URL = DEFAULT_BASE_URL;
let TEXT_MODEL = DEFAULT_TEXT_MODEL;
let IMAGE_MODEL = DEFAULT_IMAGE_MODEL;
let PREVIEW_IMAGE_MODEL = DEFAULT_PREVIEW_IMAGE_MODEL;
let aiConfig = {
  baseUrl: BASE_URL,
  apiKey: process.env.OPENAI_API_KEY || "",
  textModel: TEXT_MODEL,
  imageModel: IMAGE_MODEL,
  previewImageModel: PREVIEW_IMAGE_MODEL,
  source: "env",
};
const modelState = {
  checkedAt: null,
  reachable: false,
  textAvailable: false,
  imageAvailable: false,
  previewImageAvailable: false,
  error: null,
};

let openai = createOpenAIClient(aiConfig);

function normalizeBaseUrl(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) throw new Error("API Base URL 不能为空");
  const url = new URL(trimmed);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API Base URL 必须以 http:// 或 https:// 开头");
  }
  return trimmed.replace(/\/+$/, "");
}

function safeNormalizeBaseUrl(value, fallback) {
  try {
    return normalizeBaseUrl(value || fallback);
  } catch {
    return String(fallback || "https://api.openai.com/v1").replace(/\/+$/, "");
  }
}

function createOpenAIClient(config, options = {}) {
  return new OpenAI({
    apiKey: config.apiKey || "missing-key",
    baseURL: config.baseUrl,
    timeout: options.timeout || AI_REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

function defaultAIConfig() {
  return {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY || "",
    textModel: DEFAULT_TEXT_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL,
    previewImageModel: DEFAULT_PREVIEW_IMAGE_MODEL,
    source: "env",
  };
}

function normalizeAIConfig(input = {}, fallback = defaultAIConfig(), options = {}) {
  const requireModels = options.requireModels !== false;
  const baseUrl = normalizeBaseUrl(input.baseUrl || fallback.baseUrl);
  const apiKey = String(input.apiKey ?? fallback.apiKey ?? "").trim();
  const textModel = String(input.textModel || fallback.textModel || "").trim();
  const imageModel = String(input.imageModel || fallback.imageModel || "").trim();
  const previewImageModel = String(input.previewImageModel || fallback.previewImageModel || imageModel).trim();
  if (requireModels && !textModel) throw new Error("请选择文字模型");
  if (requireModels && !imageModel) throw new Error("请选择图片模型");
  return {
    baseUrl,
    apiKey,
    textModel,
    imageModel,
    previewImageModel: previewImageModel || imageModel,
    source: input.source || fallback.source || "env",
  };
}

function applyAIConfig(nextConfig) {
  aiConfig = normalizeAIConfig(nextConfig, aiConfig, { requireModels: false });
  BASE_URL = aiConfig.baseUrl;
  TEXT_MODEL = aiConfig.textModel;
  IMAGE_MODEL = aiConfig.imageModel;
  PREVIEW_IMAGE_MODEL = aiConfig.previewImageModel;
  openai = createOpenAIClient(aiConfig);
}

function providerHost(baseUrl = BASE_URL) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "invalid-url";
  }
}

function publicConfigPayload(extra = {}) {
  return {
    baseUrl: BASE_URL,
    textModel: TEXT_MODEL,
    imageModel: IMAGE_MODEL,
    previewImageModel: PREVIEW_IMAGE_MODEL,
    hasApiKey: Boolean(aiConfig.apiKey),
    source: aiConfig.source,
    provider: providerHost(),
    modelState: {
      checkedAt: modelState.checkedAt,
      reachable: modelState.reachable,
      textAvailable: modelState.textAvailable,
      imageAvailable: modelState.imageAvailable,
      previewImageAvailable: modelState.previewImageAvailable,
      error: modelState.error,
    },
    ...extra,
  };
}

function classifyModels(models) {
  const ids = models.map((model) => model.id).filter(Boolean);
  const imagePattern = /(image|gpt-image|dall|dalle|flux|stable|sd-|sdxl|midjourney|mj-|jimeng|wanx|recraft|ideogram)/i;
  const textPattern = /(gpt|claude|deepseek|qwen|glm|yi-|llama|gemini|moonshot|kimi|doubao|chat|text|reason|mistral|mixtral)/i;
  const preferredText = [/^gpt-5/i, /^gpt-4/i, /deepseek/i, /qwen/i, /claude/i, /gemini/i];
  const preferredImage = [/^gpt-image/i, /image/i, /dall/i, /flux/i, /recraft/i, /ideogram/i];
  const sortByPreference = (values, patterns) =>
    [...new Set(values)].sort((a, b) => {
      const rank = (value) => {
        const index = patterns.findIndex((pattern) => pattern.test(value));
        return index === -1 ? patterns.length : index;
      };
      return rank(a) - rank(b) || a.localeCompare(b);
    });
  const imageIds = ids.filter((id) => imagePattern.test(id));
  const textIds = ids.filter((id) => !imagePattern.test(id) && textPattern.test(id));
  return {
    suggestedTextModels: sortByPreference(textIds.length ? textIds : ids.filter((id) => !imagePattern.test(id)), preferredText),
    suggestedImageModels: sortByPreference(imageIds, preferredImage),
  };
}

function updateModelStateFromModels(models) {
  const ids = new Set(models.map((model) => model.id));
  modelState.checkedAt = nowIso();
  modelState.reachable = true;
  if (!TEXT_MODEL || !IMAGE_MODEL) {
    modelState.textAvailable = false;
    modelState.imageAvailable = false;
    modelState.previewImageAvailable = false;
    modelState.error = "尚未选择文字模型或图片模型";
    return ids;
  }
  modelState.textAvailable = ids.has(TEXT_MODEL);
  modelState.imageAvailable = ids.has(IMAGE_MODEL);
  modelState.previewImageAvailable = ids.has(PREVIEW_IMAGE_MODEL);
  modelState.error =
    modelState.textAvailable && modelState.imageAvailable
      ? null
      : `模型不可用：${[
          !modelState.textAvailable ? TEXT_MODEL : null,
          !modelState.imageAvailable ? IMAGE_MODEL : null,
        ]
          .filter(Boolean)
          .join("、")}`;
  return ids;
}

async function fetchModelList(config) {
  const client = createOpenAIClient(config, { timeout: CONFIG_REQUEST_TIMEOUT_MS });
  const page = await client.models.list();
  const models = [];
  for await (const model of page) {
    models.push({
      id: model.id,
      created: model.created || null,
      ownedBy: model.owned_by || model.ownedBy || null,
    });
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return { models, ...classifyModels(models) };
}

async function loadRuntimeApiConfig() {
  const fallback = defaultAIConfig();
  try {
    const raw = await fs.readFile(API_CONFIG_FILE, "utf8");
    const saved = JSON.parse(raw);
    applyAIConfig(
      normalizeAIConfig(
        {
          ...fallback,
          ...saved,
          apiKey: saved.apiKey || fallback.apiKey,
          source: "runtime",
        },
        fallback,
        { requireModels: false }
      )
    );
  } catch (error) {
    if (error?.code !== "ENOENT") {
      console.warn(`读取 runtime/api-config.json 失败，已回退 .env：${error.message}`);
    }
    applyAIConfig(fallback);
  }
}

async function saveRuntimeApiConfig(config) {
  await fs.mkdir(RUNTIME_ROOT, { recursive: true });
  const saved = {
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    textModel: config.textModel,
    imageModel: config.imageModel,
    previewImageModel: config.previewImageModel,
    updatedAt: nowIso(),
  };
  await fs.writeFile(API_CONFIG_FILE, `${JSON.stringify(saved, null, 2)}\n`, "utf8");
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_FILES, fileSize: MAX_FILE_SIZE },
  fileFilter: (_request, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("仅支持 PNG、JPEG 和 WebP 图片"));
      return;
    }
    callback(null, true);
  },
});

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "product",
    "sellingPoints",
    "visualDirection",
    "styleSuggestions",
    "recommendedOutputPlan",
    "protectionRules",
    "outputs",
    "warnings",
  ],
  properties: {
    product: { type: "string" },
    sellingPoints: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
    visualDirection: { type: "string" },
    styleSuggestions: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "promptHint"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          promptHint: { type: "string" },
        },
      },
    },
    recommendedOutputPlan: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "label", "recommendedCount", "min", "max", "reason", "items"],
        properties: {
          type: { type: "string" },
          label: { type: "string" },
          recommendedCount: { type: "integer", minimum: 0, maximum: 12 },
          min: { type: "integer", minimum: 0, maximum: 12 },
          max: { type: "integer", minimum: 0, maximum: 12 },
          reason: { type: "string" },
          items: {
            type: "array",
            minItems: 0,
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "creativeRole", "description", "promptHint"],
              properties: {
                title: { type: "string" },
                creativeRole: { type: "string" },
                description: { type: "string" },
                promptHint: { type: "string" },
              },
            },
          },
        },
      },
    },
    protectionRules: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 8 },
    outputs: {
      type: "array",
      minItems: 1,
      maxItems: 36,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "creativeRole", "description", "prompt"],
        properties: {
          type: { type: "string" },
          title: { type: "string" },
          creativeRole: { type: "string" },
          description: { type: "string" },
          prompt: { type: "string" },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" }, maxItems: 6 },
  },
};

const SAFETY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["allowed", "reason", "safePrompt"],
  properties: {
    allowed: { type: "boolean" },
    reason: { type: "string" },
    safePrompt: { type: "string" },
  },
};

const ASSIST_WRITING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestion"],
  properties: {
    suggestion: { type: "string", minLength: 20, maxLength: 600 },
  },
};

const modeLabels = {
  main: "商品主图",
  detail: "详情页",
  sku: "SKU 图",
  logo: "店铺 Logo",
  style: "风格复刻图",
  retouch: "商品精修图",
};

const planOrder = ["main", "detail", "sku", "logo"];
const singleTypeModes = new Set(["main", "detail", "sku"]);

const outputPlanDefinitions = {
  main: {
    label: "主图",
    typeLabel: "商品主图",
    min: 0,
    max: 10,
    defaultReason: "用于搜索点击、卖点表达和商品页首屏承接。",
    roles: [
      "引流主图",
      "场景种草",
      "材质特写",
      "卖点说明",
      "SKU 展示",
      "使用场景",
      "质感背书",
      "规格对比",
      "氛围主图",
      "细节背书",
    ],
  },
  detail: {
    label: "详情页",
    typeLabel: "详情页",
    min: 0,
    max: 12,
    defaultReason: "按独立屏拆解卖点、材质、规格和使用场景。",
    roles: [
      "详情页首屏",
      "核心卖点",
      "材质工艺",
      "使用场景",
      "尺寸规格",
      "SKU 对比",
      "细节特写",
      "服务保障",
      "包装清单",
      "品质背书",
      "注意事项",
      "转化收尾",
    ],
  },
  sku: {
    label: "SKU 图",
    typeLabel: "SKU 图",
    min: 0,
    max: 8,
    defaultReason: "帮助买家快速看清颜色、尺寸、套餐和规格差异。",
    roles: [
      "颜色款式",
      "尺寸规格",
      "组合对比",
      "细节差异",
      "套餐展示",
      "规格速览",
      "多款同屏",
      "选择引导",
    ],
  },
  logo: {
    label: "店铺视觉",
    typeLabel: "店铺 Logo",
    min: 0,
    max: 4,
    defaultReason: "默认不生成；只有需要店铺头像、店招或贴纸时开启。",
    roles: ["店铺头像", "店招横版", "包装贴纸", "详情页品牌角标"],
  },
};

const platformVisualRules = [
  {
    match: /淘宝|天猫/i,
    rule:
      "淘宝/天猫视觉：质感、信任、品牌感优先；画面干净但不能空，商品占比明确，标题短促有层级，背景可用棚拍渐变、质感台面、轻场景道具。",
  },
  {
    match: /1688|批发|工厂/i,
    rule:
      "1688视觉：强调供货可靠、规格清楚、批量采购感；可使用参数区、规格对比、工厂感干净背景和理性信息层，不要做成过度奢侈广告。",
  },
  {
    match: /拼多多/i,
    rule:
      "拼多多视觉：点击理由要直接，商品更大、利益点更醒目、色彩更有冲击；允许强对比标题和卖点角标，但不得编造价格、功效或认证。",
  },
  {
    match: /抖音|快手/i,
    rule:
      "短视频电商视觉：第一眼冲击强，构图有动作感和场景感，主标题短、画面节奏快，适合直播间商品卡和内容流点击。",
  },
  {
    match: /小红书/i,
    rule:
      "小红书视觉：生活方式、种草氛围和自然光优先，少用硬促销；画面像真实好物分享，保留留白和高级配色。",
  },
  {
    match: /京东/i,
    rule:
      "京东视觉：专业、可靠、参数清楚，适合白底加质感场景的平衡；文案克制、结构清晰。",
  },
];

const defaultPlatformVisualRule =
  "国内电商通用视觉：商品真实可信，主视觉有点击理由，背景、光影、排版和卖点表达服务转化，不要只做普通白底证件照。";

const visualRecipeRules = [
  {
    match: /引流|首图|氛围主图|主图/i,
    rule:
      "构图配方：单一英雄商品为主，商品占画面 55%-72%，中心偏下或三分构图；用有质感的渐变棚拍背景、柔和阴影和 1 个核心中文标题制造点击欲。除非本张角色是 SKU/组合，不要把所有款式一起堆满画面。",
  },
  {
    match: /场景|使用|种草|生活/i,
    rule:
      "构图配方：把商品放进真实使用场景或轻生活化环境，加入不抢主体的道具、桌面、空间或手部使用暗示；让用户一眼知道购买后的使用画面。",
  },
  {
    match: /材质|工艺|质感|细节|特写/i,
    rule:
      "构图配方：采用半近景或局部特写，突出纹理、边缘、开口、五金、缝线、压纹、厚度、反光等真实质感；可加入 2-3 个细节放大标注。",
  },
  {
    match: /卖点|说明|功能|核心/i,
    rule:
      "构图配方：商品主体清晰居中，周围用信息卡片、细线指引和短卖点分层说明；信息要像可上架主图，不要像长段说明书。",
  },
  {
    match: /SKU|颜色|款式|组合|规格|对比|套餐|多款/i,
    rule:
      "构图配方：允许多款组合排列，但必须有清晰前后层级、颜色/规格标签和选择引导；不要让每一张图都采用多组合排列，本角色之外的图片应回到单品英雄、场景或细节构图。",
  },
  {
    match: /详情页首屏|首屏/i,
    rule:
      "构图配方：作为详情页独立首屏，包含大标题、核心利益点和商品完整展示，竖版信息层级清楚；不要试图把整套详情页拼到一张图里。",
  },
  {
    match: /尺寸|参数|规格/i,
    rule:
      "构图配方：使用规格信息板、尺寸线、比例参照或清晰表格感布局；只展示用户或图片可确认的信息，不编造尺寸数值。",
  },
  {
    match: /包装|清单|服务|保障|品质/i,
    rule:
      "构图配方：用整齐模块展示包装、配件、服务或品质背书，视觉可信、克制、可阅读，避免夸张促销。",
  },
  {
    match: /店招|头像|Logo|品牌|贴纸/i,
    rule:
      "构图配方：以品牌识别为核心，输出简洁可复用的店铺视觉方案，适合头像、店招、贴纸和详情页角标。",
  },
];

const defaultVisualRecipeRule =
  "构图配方：选择与本张创意角色匹配的商业摄影视角、背景层次和文字排版；画面要像成熟电商设计稿，而不是简单抠图加字。";

const getPlatformVisualRule = (platform) =>
  platformVisualRules.find((item) => item.match.test(String(platform || "")))?.rule || defaultPlatformVisualRule;

const getVisualRecipeRule = (output) => {
  const text = `${output?.creativeRole || ""} ${output?.title || ""} ${output?.description || ""}`;
  return visualRecipeRules.find((item) => item.match.test(text))?.rule || defaultVisualRecipeRule;
};

const repeatedLayoutGuard = (output) => {
  const text = `${output?.creativeRole || ""} ${output?.title || ""} ${output?.description || ""}`;
  const allowsCombination = /SKU|颜色|款式|组合|规格|对比|套餐|多款/i.test(text);
  return allowsCombination
    ? "本张允许多款或多规格组合，但要有主次、前后层级和清晰标签，不能像素材堆叠。"
    : "本张不要使用多组合排列，不要把所有颜色或款式都摆出来；优先做单品英雄、场景、细节或卖点表达。";
};

const sizeProfiles = {
  "1:1 正方形": { api: "1024x1024", width: 1024, height: 1024 },
  "2:3 竖版": { api: "1024x1536", width: 1024, height: 1536 },
  "3:2 横版": { api: "1536x1024", width: 1536, height: 1024 },
  "3:4 竖版": { api: "1024x1536", width: 1024, height: 1365 },
  "4:3 横版": { api: "1536x1024", width: 1365, height: 1024 },
  "4:5 竖版": { api: "1024x1536", width: 1024, height: 1280 },
  "5:4 横版": { api: "1536x1024", width: 1280, height: 1024 },
  "9:16 手机竖屏": { api: "1024x1536", width: 1080, height: 1920 },
  "16:9 宽屏": { api: "1536x1024", width: 1920, height: 1080 },
  "21:9 超宽屏": { api: "1536x1024", width: 1920, height: 823 },
  "750px 详情页长图": { api: "1024x1536", width: 750, height: 1125 },
  "Logo 1:1 透明底": { api: "1024x1024", width: 1024, height: 1024 },
  店招横版: { api: "1536x1024", width: 1920, height: 640 },
};

await fs.mkdir(JOB_ROOT, { recursive: true });
await fs.mkdir(GENERATED_ROOT, { recursive: true });
await fs.mkdir(LOG_ROOT, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use("/generated", express.static(GENERATED_ROOT, { maxAge: "1h", fallthrough: false }));
app.use("/assets", express.static(path.join(ROOT, "assets"), { maxAge: "1h", fallthrough: false }));
app.get("/api", (_request, response) => {
  response.json(
    createApiOverview({
      port: PORT,
      provider: providerHost(),
      models: {
        text: TEXT_MODEL,
        image: IMAGE_MODEL,
        previewImage: PREVIEW_IMAGE_MODEL,
      },
    })
  );
});
app.get("/api/openapi.json", (_request, response) => {
  response.json(
    createOpenApiSpec({
      port: PORT,
      provider: providerHost(),
      models: {
        text: TEXT_MODEL,
        image: IMAGE_MODEL,
        previewImage: PREVIEW_IMAGE_MODEL,
      },
    })
  );
});
app.get("/api/docs", (_request, response) => {
  response
    .type("html")
    .send(
      renderApiDocsHtml({
        port: PORT,
        provider: providerHost(),
        models: {
          text: TEXT_MODEL,
          image: IMAGE_MODEL,
          previewImage: PREVIEW_IMAGE_MODEL,
        },
      })
    );
});
app.get("/api/config", (_request, response) => {
  response.json(publicConfigPayload());
});
app.post("/api/config/models", async (request, response) => {
  try {
    const body = request.body || {};
    const baseUrl = normalizeBaseUrl(body.baseUrl || DEFAULT_BASE_URL);
    const apiKey = String(body.apiKey || "").trim();
    if (!apiKey) {
      return response.status(400).json({ error: { message: "请先填写 API Key 后再获取模型列表" } });
    }
    const probeConfig = normalizeAIConfig(
      {
        baseUrl,
        apiKey,
        textModel: TEXT_MODEL,
        imageModel: IMAGE_MODEL,
        previewImageModel: PREVIEW_IMAGE_MODEL,
        source: "probe",
      },
      aiConfig,
      { requireModels: false }
    );
    const { models, suggestedTextModels, suggestedImageModels } = await fetchModelList(probeConfig);
    response.json({
      provider: providerHost(baseUrl),
      count: models.length,
      models,
      suggestedTextModels,
      suggestedImageModels,
    });
  } catch (error) {
    response.status(error?.status || 400).json({ error: cleanError(error, "无法读取模型列表") });
  }
});
app.post("/api/config", async (request, response) => {
  try {
    const body = request.body || {};
    const apiKey = String(body.apiKey || "").trim() || aiConfig.apiKey;
    if (!apiKey) {
      return response.status(400).json({ error: { message: "首次配置必须填写 API Key" } });
    }
    const nextConfig = normalizeAIConfig(
      {
        baseUrl: body.baseUrl,
        apiKey,
        textModel: body.textModel,
        imageModel: body.imageModel,
        previewImageModel: body.previewImageModel || body.imageModel,
        source: "runtime",
      },
      aiConfig,
      { requireModels: true }
    );
    const { models } = await fetchModelList(nextConfig);
    const ids = new Set(models.map((model) => model.id));
    if (!ids.has(nextConfig.textModel)) {
      return response.status(400).json({ error: { message: `文字模型不可用：${nextConfig.textModel}` } });
    }
    if (!ids.has(nextConfig.imageModel)) {
      return response.status(400).json({ error: { message: `图片模型不可用：${nextConfig.imageModel}` } });
    }
    applyAIConfig(nextConfig);
    updateModelStateFromModels(models);
    await saveRuntimeApiConfig(aiConfig);
    response.json(publicConfigPayload({ saved: true }));
  } catch (error) {
    response.status(error?.status || 400).json({ error: cleanError(error, "API 配置保存失败") });
  }
});
app.post("/api/config/test", async (_request, response) => {
  try {
    if (!aiConfig.apiKey) {
      return response.status(400).json({ error: { message: "尚未配置 API Key" } });
    }
    const { models, suggestedTextModels, suggestedImageModels } = await fetchModelList(aiConfig);
    updateModelStateFromModels(models);
    response.json(
      publicConfigPayload({
        tested: true,
        count: models.length,
        models,
        suggestedTextModels,
        suggestedImageModels,
      })
    );
  } catch (error) {
    modelState.checkedAt = nowIso();
    modelState.reachable = false;
    modelState.textAvailable = false;
    modelState.imageAvailable = false;
    modelState.previewImageAvailable = false;
    modelState.error = cleanError(error, "API 配置测试失败").message;
    response.status(error?.status || 400).json({ error: cleanError(error, "API 配置测试失败") });
  }
});
app.get("/api/download/:jobId/:filename", async (request, response) => {
  const { jobId, filename } = request.params;
  const validJobId = /^[a-f0-9-]{36}$/i.test(jobId);
  const validFilename = /^result-\d+(?:-version-\d+)?\.png$/i.test(filename);
  if (!validJobId || !validFilename) {
    return response.status(400).json({ error: { message: "下载地址无效" } });
  }

  const sourcePath = path.join(GENERATED_ROOT, jobId, filename);
  try {
    await fs.access(sourcePath);
  } catch {
    return response.status(404).json({ error: { message: "图片已过期或不存在，请重新生成" } });
  }

  const requestedName = String(request.query.name || "品图AI-生成图片")
    .replace(/[\\/:*?"<>|\r\n]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const downloadName = `${requestedName || "品图AI-生成图片"}.png`;
  response.setHeader("Cache-Control", "private, no-store");
  response.download(sourcePath, downloadName, (error) => {
    if (error && !response.headersSent) {
      response.status(500).json({ error: { message: "图片下载失败，请稍后重试" } });
    }
  });
});
app.get("/", (_request, response) => response.sendFile(path.join(ROOT, "china-full.html")));
app.get("/:publicFile", (request, response, next) => {
  if (!PUBLIC_FILES.has(request.params.publicFile)) {
    next();
    return;
  }
  response.sendFile(path.join(ROOT, request.params.publicFile));
});

const nowIso = () => new Date().toISOString();

const publicJob = (job) => ({
  id: job.id,
  status: job.status,
  progress: job.progress,
  stage: job.stage,
  generationProfile: job.generationProfile || null,
  generationItems: (job.generationItems || []).map((item) => ({
    ...item,
    progressLabel: item.progressLabel || generationItemProgressLabel(item),
  })),
  canRetryFailedItems: canRetryFailedItems(job),
  analysis: job.analysis,
  results: job.results,
  failedResults: job.failedResults || [],
  error: job.error,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

const generationItemProgressLabel = (item) => {
  if (!item) return "";
  if (item.status === "completed") return "已完成";
  if (item.status === "generating") return `生成中，第 ${item.attempts || 1} 次`;
  if (item.status === "retrying") return `自动重试中，第 ${item.attempts || 1} 次`;
  if (item.status === "failed") return "生成失败，可单独重试";
  if (item.status === "interrupted") return "服务中断，可单独重试";
  return "排队中";
};

const canRetryFailedItems = (job) =>
  Boolean(
    job &&
      !activeGenerationJobs.has(job.id) &&
      (job.generationItems || []).some((item) => ["failed", "interrupted"].includes(item.status))
  );

const updateJob = (job, patch) => {
  Object.assign(job, patch, { updatedAt: nowIso() });
  void persistJob(job);
};

const jobDirectory = (jobId) => path.join(JOB_ROOT, jobId);
const jobSnapshotPath = (jobId) => path.join(jobDirectory(jobId), JOB_SNAPSHOT_FILE);

const persistJob = async (job) => {
  if (!job?.id) return;
  try {
    await fs.mkdir(jobDirectory(job.id), { recursive: true });
    await fs.writeFile(
      jobSnapshotPath(job.id),
      JSON.stringify({ ...job, persistedAt: nowIso() }, null, 2)
    );
  } catch (error) {
    console.warn(`[job:persist-failed] job=${job.id} ${error.message}`);
  }
};

const logJobEvent = (event, detail = {}) => {
  const safeDetail = { ...detail };
  delete safeDetail.apiKey;
  const line = `${JSON.stringify({ ts: nowIso(), event, ...safeDetail })}\n`;
  void fs.appendFile(JOB_EVENT_LOG, line).catch((error) => {
    console.warn(`[job:log-failed] ${error.message}`);
  });
};

const markInterruptedJob = (job) => {
  if (!["queued", "generating"].includes(job.status)) return job;
  const hasResults = Array.isArray(job.results) && job.results.length > 0;
  const message = hasResults
    ? "服务重启后，已完成图片已保留，未完成图片需要重新生成。"
    : "服务重启后，正在生成的任务已中断，请重新点击生成。";
  const generationItems = Array.isArray(job.generationItems)
    ? job.generationItems.map((item) =>
        ["queued", "generating", "retrying"].includes(item.status)
          ? {
              ...item,
              status: "interrupted",
              error: {
                message,
                code: "SERVER_RESTARTED",
                retryable: true,
              },
              progressLabel: "服务中断，可单独重试",
              completedAt: nowIso(),
            }
          : item
      )
    : [];
  return {
    ...job,
    status: hasResults ? "completed" : "failed",
    stage: hasResults ? "服务重启，已保留已完成图片" : "生成任务因服务重启中断",
    progress: hasResults ? 100 : job.progress || 0,
    generationItems,
    error: {
      message,
      code: "SERVER_RESTARTED",
      retryable: true,
      partial: hasResults,
    },
    updatedAt: nowIso(),
  };
};

const loadPersistedJobs = async () => {
  const entries = await fs.readdir(JOB_ROOT, { withFileTypes: true }).catch(() => []);
  let loaded = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const snapshot = await fs.readFile(jobSnapshotPath(entry.name), "utf8");
      const job = markInterruptedJob(JSON.parse(snapshot));
      if (!job?.id || Date.now() - Date.parse(job.updatedAt || job.createdAt || 0) > FILE_TTL_MS) continue;
      jobs.set(job.id, job);
      loaded += 1;
      if (job.error?.code === "SERVER_RESTARTED") await persistJob(job);
    } catch (error) {
      if (error.code !== "ENOENT") console.warn(`[job:load-failed] ${entry.name} ${error.message}`);
    }
  }
  logJobEvent("jobs_loaded", { count: loaded });
  return loaded;
};

const countRuntimeDirectories = async (directory) => {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory()).length;
};

const readRecentJobEvents = async (limit = 20) => {
  const text = await fs.readFile(JOB_EVENT_LOG, "utf8").catch(() => "");
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
};

const requestIdFromError = (error) =>
  error?.request_id || error?.requestId || error?.headers?.get?.("x-request-id") || null;

const cleanError = (error, fallback = "AI 服务暂时不可用") => {
  const rawMessage = String(error?.message || fallback).replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]");
  const status = Number(error?.status || error?.code || 0);
  const imageInvalid = /invalid image file or mode/i.test(rawMessage);
  const quotaExceeded =
    status === 429 &&
    /quota|billing|plan|exceeded your current quota|exceeded current quota/i.test(rawMessage);
  const rateLimited = status === 429 && !quotaExceeded;
  const gatewayTimeout = /\b524\b|status code \(no body\)/i.test(rawMessage);
  const connectionInterrupted =
    /connection error|terminated|timed?\s*out|timeout|abort(?:ed)?|socket hang up|econnreset|connection (?:was )?(?:closed|reset)/i.test(
      rawMessage
    ) || gatewayTimeout;
  const message = imageInvalid
    ? "图片模型无法读取原始文件。系统会自动转换相机原片、校正方向并压缩尺寸，请重试本次生成。"
    : quotaExceeded
      ? "当前 AI 网关额度不足或套餐用量已超限，模型请求被拒绝。请检查 .env 中 API_KEY 对应账号的余额、套餐和计费状态，或更换有额度的图片通道。"
    : rateLimited
      ? "AI 网关当前限流，请稍后重试，或减少本次生成张数后再试。"
    : gatewayTimeout
      ? "第三方图片通道等待超时，没有返回生成结果。通常是图片模型生成时间超过网关单次等待窗口；系统不会自动降级模型，请稍后重试、先生成少量图片，或更换支持长任务轮询的图片通道。"
    : connectionInterrupted
      ? "AI 服务连接暂时中断，请稍后重试。"
      : rawMessage;
  return {
    message: message.slice(0, 500),
    requestId: requestIdFromError(error),
    code: imageInvalid
      ? "INVALID_IMAGE_INPUT"
      : quotaExceeded
        ? "AI_QUOTA_EXCEEDED"
        : rateLimited
          ? "AI_RATE_LIMITED"
      : gatewayTimeout
        ? "GATEWAY_TIMEOUT"
        : connectionInterrupted
          ? "AI_CONNECTION_INTERRUPTED"
          : null,
    retryable: imageInvalid || rateLimited || connectionInterrupted || status >= 500,
  };
};

const requireModels = (_request, response, next) => {
  if (!aiConfig.apiKey) {
    return response.status(503).json({ error: { message: "未配置 API Key，请先在右上角打开 API 配置" } });
  }
  if (!TEXT_MODEL || !IMAGE_MODEL) {
    return response.status(503).json({ error: { message: "文字模型或图片模型尚未选择，请先完成 API 配置" } });
  }
  if (
    !modelState.reachable ||
    !modelState.textAvailable ||
    !modelState.imageAvailable
  ) {
    return response.status(503).json({
      error: {
        message: modelState.error || "指定模型当前不可用，请稍后重试",
        models: { text: TEXT_MODEL, image: IMAGE_MODEL, previewImage: PREVIEW_IMAGE_MODEL },
      },
    });
  }
  next();
};

const requireTextModel = (_request, response, next) => {
  if (!aiConfig.apiKey) {
    return response.status(503).json({ error: { message: "未配置 API Key，请先在右上角打开 API 配置" } });
  }
  if (!TEXT_MODEL) {
    return response.status(503).json({ error: { message: "文字模型尚未选择，请先完成 API 配置" } });
  }
  if (!modelState.reachable || !modelState.textAvailable) {
    return response.status(503).json({
      error: {
        message: modelState.error || "文字模型当前不可用，请稍后重试",
        model: TEXT_MODEL,
      },
    });
  }
  next();
};

const parseJsonOutput = (outputText) => {
  const text = String(outputText || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate);
};

const imageToDataUrl = (file) => `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

const writingVisionDataUrl = async (file) => {
  const buffer = await sharp(file.buffer, { failOn: "none" })
    .rotate()
    .resize(WRITING_VISION_INPUT_SIZE, WRITING_VISION_INPUT_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .toColourspace("srgb")
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
};

const normalizePlanType = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("detail") || text.includes("详情")) return "detail";
  if (text.includes("sku") || text.includes("规格")) return "sku";
  if (text.includes("logo") || text.includes("店铺") || text.includes("视觉")) return "logo";
  return "main";
};

const clampInteger = (value, min, max) => {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
};

const defaultPlanCounts = (fields) => {
  const platform = String(fields.platform || "");
  const requirements = String(fields.requirements || "");
  const counts = { main: 3, detail: 2, sku: 1, logo: 0 };

  if (/淘宝|天猫|京东|拼多多/.test(platform)) Object.assign(counts, { main: 5, detail: 6, sku: 2 });
  if (/1688|批发|工厂/.test(platform)) Object.assign(counts, { main: 4, detail: 6, sku: 4 });
  if (/抖音|快手|小红书/.test(platform)) Object.assign(counts, { main: 3, detail: 3, sku: 1 });
  if (/全套|一套|详情|详情页/.test(requirements)) counts.detail = Math.max(counts.detail, 6);
  if (/SKU|sku|规格|颜色|款式/.test(requirements)) counts.sku = Math.max(counts.sku, 3);
  if (/logo|Logo|LOGO|店招|头像|品牌/.test(requirements)) counts.logo = Math.max(counts.logo, 2);

  if (fields.mode === "main") Object.assign(counts, { main: Math.max(counts.main, 3), detail: 0, sku: 0, logo: 0 });
  if (fields.mode === "detail") Object.assign(counts, { main: 0, detail: Math.max(counts.detail, 8), sku: 0, logo: 0 });
  if (fields.mode === "sku") Object.assign(counts, { main: 0, detail: 0, sku: Math.max(counts.sku, 4), logo: 0 });
  if (fields.mode === "logo") Object.assign(counts, { main: 0, detail: 0, sku: 0, logo: 4 });
  if (fields.mode === "style") Object.assign(counts, { main: 4, detail: Math.max(counts.detail, 3), sku: 1 });
  if (fields.mode === "retouch") Object.assign(counts, { main: 3, detail: 0, sku: Math.max(counts.sku, 3), logo: 0 });

  return counts;
};

const capInitialPlanForSyncChannel = (plan, fields) => {
  const maxTotal = Math.max(1, Math.min(12, MAX_RECOMMENDED_SYNC_OUTPUTS));
  const total = plan.reduce((sum, item) => sum + Number(item.recommendedCount || 0), 0);
  if (total <= maxTotal) return plan;

  const mode = String(fields.mode || "main");
  const preferredOrder =
    mode === "detail"
      ? ["detail", "main", "sku", "logo"]
      : mode === "sku"
        ? ["sku", "main", "detail", "logo"]
        : mode === "logo"
          ? ["logo", "main", "detail", "sku"]
          : ["main", "detail", "sku", "logo"];
  let remaining = maxTotal;
  const cappedCounts = new Map();

  preferredOrder.forEach((type) => {
    const item = plan.find((entry) => entry.type === type);
    if (!item || remaining <= 0) {
      cappedCounts.set(type, 0);
      return;
    }
    const preferredCap =
      type === mode || (mode === "main" && type === "main")
        ? Math.min(item.recommendedCount, remaining)
        : Math.min(item.recommendedCount, remaining > 0 ? 1 : 0);
    const nextCount = Math.max(0, Math.min(remaining, preferredCap));
    cappedCounts.set(type, nextCount);
    remaining -= nextCount;
  });

  return plan.map((item) => {
    const recommendedCount = cappedCounts.has(item.type)
      ? cappedCounts.get(item.type)
      : 0;
    const capped = {
      ...item,
      recommendedCount,
      items: item.items.slice(0, recommendedCount),
    };
    if (recommendedCount < item.recommendedCount) {
      capped.reason = `${item.reason} 已按当前同步图片通道改为首批生成，完整套装建议分批继续生成。`;
    }
    return capped;
  });
};

const planItemFromDefinition = (type, count, reason = "") => {
  const definition = outputPlanDefinitions[type];
  return {
    type,
    label: definition.label,
    recommendedCount: count,
    min: definition.min,
    max: definition.max,
    reason: cleanShortText(reason, 120) || definition.defaultReason,
    items: [],
  };
};

const normalizeOutputPlan = (planItems, fields) => {
  const defaults = defaultPlanCounts(fields);
  const incomingByType = new Map();
  if (Array.isArray(planItems)) {
    planItems.forEach((item) => incomingByType.set(normalizePlanType(item?.type || item?.label), item));
  }

  const normalized = planOrder.map((type) => {
    const definition = outputPlanDefinitions[type];
    const incoming = incomingByType.get(type);
    const requestedCount = incoming?.recommendedCount ?? defaults[type];
    const count = clampInteger(requestedCount, definition.min, definition.max);
    const item = planItemFromDefinition(type, count, incoming?.reason);
    const sourceItems = Array.isArray(incoming?.items) ? incoming.items : [];
    item.items = Array.from({ length: count }, (_, index) => {
      const source = sourceItems[index] || {};
      const fallbackRole = definition.roles[index % definition.roles.length];
      return {
        title: cleanShortText(source.title, 80) || `${fallbackRole}${definition.label}`,
        creativeRole: cleanShortText(source.creativeRole, 40) || fallbackRole,
        description:
          cleanShortText(source.description, 140) ||
          (type === "detail"
            ? `详情页第 ${index + 1} 屏，围绕“${fallbackRole}”单独成图。`
            : `围绕“${fallbackRole}”形成独立视觉方向。`),
        promptHint: cleanShortText(source.promptHint, 500) || "",
      };
    });
    return item;
  });

  const activeSingleType = singleTypeModes.has(fields.mode) ? fields.mode : null;
  const scoped = activeSingleType
    ? normalized.map((item) =>
        item.type === activeSingleType
          ? item
          : {
              ...item,
              recommendedCount: 0,
              items: [],
              reason: "本次只生成当前选择的素材类型，其他类型可另开任务生成。",
            }
      )
    : normalized;

  const capped = capInitialPlanForSyncChannel(scoped, fields);

  if (!capped.some((item) => item.recommendedCount > 0)) {
    capped[0].recommendedCount = 1;
    capped[0].items = [
      {
        title: "引流主图",
        creativeRole: "引流主图",
        description: "先生成一张可用于点击测试的主图。",
        promptHint: "",
      },
    ];
  }

  return capped;
};

const outputPromptFromPlan = (planItem, item, index, fields) => {
  const definition = outputPlanDefinitions[planItem.type] || outputPlanDefinitions.main;
  const noText = fields.language === "无文字（纯视觉）";
  const outputLike = {
    title: item.title,
    creativeRole: item.creativeRole,
    description: item.description,
  };
  const base = item.promptHint
    ? `${item.promptHint}`
    : `生成${definition.typeLabel}：${item.title}。画面角色是${item.creativeRole}，${item.description}`;
  const detailRule =
    planItem.type === "detail"
      ? `这是详情页第 ${index + 1} 屏的独立画面，只完成本屏主题，不要拼成长图，不要把整套详情页信息塞进一张图。`
      : "";
  const skuRule = planItem.type === "sku" ? "重点帮助买家看清规格、颜色、尺寸、套餐或差异点。" : "";
  const logoRule =
    planItem.type === "logo" ? "这是店铺视觉素材，应适合头像、店招、贴纸或详情页角标使用。" : "";
  const textRule = noText
    ? "本图不得新增任何文字，商品原有印刷内容保持不变。"
    : `允许使用${fields.language}短标题或卖点文字，但必须基于用户确认信息和图片可见事实。`;
  return [
    base,
    getPlatformVisualRule(fields.platform),
    getVisualRecipeRule(outputLike),
    repeatedLayoutGuard(outputLike),
    detailRule,
    skuRule,
    logoRule,
    textRule,
    "商业完成度要求：画面应有明确主视觉、辅助信息层、背景层次和转化理由；避免空白背景上简单放商品与大字。",
  ]
    .filter(Boolean)
    .join("\n");
};

const outputsFromPlan = (job, planItems, overrides = []) => {
  const plan = normalizeOutputPlan(planItems, job.fields);
  const overrideList = Array.isArray(overrides) ? overrides : [];
  const outputs = [];
  plan.forEach((planItem) => {
    const definition = outputPlanDefinitions[planItem.type] || outputPlanDefinitions.main;
    planItem.items.forEach((item, itemIndex) => {
      const override = overrideList[outputs.length] || {};
      outputs.push({
        planType: planItem.type,
        type: definition.typeLabel,
        title: cleanShortText(override.title, 100) || item.title,
        creativeRole: cleanShortText(override.creativeRole, 60) || item.creativeRole,
        description: cleanShortText(override.description, 180) || item.description,
        prompt:
          cleanShortText(override.prompt, 3000) ||
          outputPromptFromPlan(planItem, item, itemIndex, job.fields),
      });
    });
  });
  return { plan, outputs };
};

const buildAnalysisPrompt = (fields) => {
  const activeSingleType = singleTypeModes.has(fields.mode) ? fields.mode : null;
  const singleTypeRule = activeSingleType
    ? `本次是单类生成任务，只推荐和输出 ${outputPlanDefinitions[activeSingleType].typeLabel}。recommendedOutputPlan 仍必须包含 main、detail、sku、logo 四类，但除 ${activeSingleType} 外的 recommendedCount 必须为 0，outputs 只能展开 ${activeSingleType} 的 items。`
    : "recommendedOutputPlan 必须包含 4 类计划，type 固定为 main、detail、sku、logo；请根据商品、平台和用途推荐数量，不要套用固定套餐。";
  const outputExpansionRule = activeSingleType
    ? `outputs 必须只展开 ${activeSingleType} 这一类，数量等于该类 recommendedCount，顺序保持该类 items 顺序。每个 output 必须包含 creativeRole，用来说明这张图承担的电商任务。`
    : "outputs 必须是 recommendedOutputPlan 展开后的完整生成清单，数量等于四类 recommendedCount 之和，顺序按 main、detail、sku、logo 展开。每个 output 必须包含 creativeRole，用来说明这张图承担的电商任务。";

  return `你是资深中国电商视觉策划师和主图创意导演。请先分析用户上传的真实商品素材，再为图片模型写出一套有购买欲、可执行、且每张图分工不同的电商创意脚本。

模式：${modeLabels[fields.mode] || modeLabels.main}
目标平台：${fields.platform}
用户要求：${fields.requirements || "未补充"}
目标语言：${fields.language}
尺寸：${fields.ratio}

核心方向：
1. 最高优先级是保留用户上传商品的真实模样：轮廓、结构、材质、真实颜色、包装形状、封口/拉链/孔位/挂绳/配件位置、品牌识别和原有印刷内容不得被改写。
2. 在商品真实不变的基础上大胆增强电商表现力：背景、光影、构图、道具、留白、文字排版、场景氛围和卖点表达都要更能激发点击和购买欲。
2a. 风格元素只能作用于商品外部。不得建议或指令图片模型在商品表面新增国风纹样、山水云纹、印章、贴纸、Logo、文字、图案、包装插画或材质效果；如果需要这些视觉元素，只能放在背景、标题区、边框、信息卡片、道具或光影层。
3. 面向国内商家，默认可以生成简洁中文电商文字，但只能基于用户输入、图片可见信息和你提炼的核心卖点，不得臆造品牌、规格、功效、认证、价格或无法确认的参数。
4. 不得照搬参考图中的品牌、商标或具体设计素材。
5. styleSuggestions 必须给出 ${fields.mode === "logo" ? "适合该店铺/品类" : "适合该商品品类"}的 3-5 个常见电商视觉风格，用来给用户选择思路。
6. ${singleTypeRule} Logo / 店铺视觉默认不启用，除非用户选择 Logo 模式、用户明确提出品牌视觉，或你判断确实对上架有帮助。
7. 推荐数量边界：main 0-10、detail 0-12、sku 0-8、logo 0-4。普通商品主图通常推荐 3-5 张；详情页必须按独立屏推荐，不能只给一张拼凑式长图冒充完整套装；SKU 按颜色、尺寸、款式、套餐复杂度推荐。
8. recommendedOutputPlan.items 要写出每张 / 每屏的 title、creativeRole、description、promptHint。promptHint 必须包含：构图方式、背景/场景、光影、文字层级、购买欲触发点，不要只写“白底展示、加标题”。详情页如果推荐 8 屏，就写 8 个独立 detail items，每屏只承担一个主题。
9. ${outputExpansionRule}
10. 多张主图必须角色互不重复，可从“引流主图、场景种草、材质特写、卖点说明、SKU 展示、使用场景、质感背书、规格对比”中选择或改写。“多组合排列”最多只能作为其中一张图的创意角色或构图方式，不能让整套图都重复多组合排列。
11. 每个 output.description 用一句短话说明“为什么这样生成”；每个 output.prompt 都要写成可以直接交给图片生成模型的完整中文指令：先描述画面创意、商业落地场景、构图、光影、背景、文字层级和购买欲，再说明主体真实锁定，避免堆砌长篇禁止清单。
12. 如果用户没有明确要求纯白底，不要把整套图都设计成“清洗背景 + 商品 + 大字”；至少让主图套装中出现场景种草、材质细节、卖点卡片、规格/SKU 或品质背书等不同商业表达。
13. ${
  fields.language === "无文字（纯视觉）"
    ? "所有 output.prompt 必须明确禁止新增任何文字、数字、Logo、标签、标题、角标和水印，并要求商品原有印刷内容保持不变。"
    : `可以生成${fields.language}电商文字；文字要短、可信、基于核心卖点，不得臆造无法确认的信息。`
}

只返回符合指定 JSON schema 的内容。`;
};

const analyzeWithAI = async (files, fields) => {
  const content = [{ type: "input_text", text: buildAnalysisPrompt(fields) }];
  files.forEach((file) => content.push({ type: "input_image", image_url: imageToDataUrl(file) }));
  const response = await openai.responses.create({
    model: TEXT_MODEL,
    input: [{ role: "user", content }],
    text: {
      format: {
        type: "json_schema",
        name: "product_analysis",
        strict: true,
        schema: ANALYSIS_SCHEMA,
      },
    },
  });
  const analysis = parseJsonOutput(response.output_text);
  const normalized = outputsFromPlan({ analysis, fields }, analysis.recommendedOutputPlan, analysis.outputs);
  analysis.recommendedOutputPlan = normalized.plan;
  analysis.outputs = normalized.outputs;
  return analysis;
};

const assistWritingWithAI = async (files, fields) => {
  const noText = fields.language === "无文字（纯视觉）";
  const content = [
    {
      type: "input_text",
      text: `你是中国电商生图要求撰写助手。请把用户当前提供的信息整理成一段可以直接用于图片生成的清晰要求。

生成类型：${modeLabels[fields.mode] || modeLabels.main}
目标平台：${fields.platform}
目标语言：${fields.language}
尺寸比例：${fields.ratio}
用户已有内容：${fields.currentText || "暂无"}

写作要求：
1. 只写最终可编辑的“生成要求”，不要解释、不要使用 Markdown、不要添加标题。
2. 使用简洁自然的中文，控制在 80–180 个汉字。
3. 优先描述商品主体、目标人群、构图、背景、光影、色彩、卖点表达和平台使用场景。
4. 不得编造图片和用户输入中无法确认的材质、规格、品牌、功效、认证或价格。
5. 明确要求保持商品轮廓、结构、材质、真实颜色、包装和品牌标识不变。
6. ${
        noText
          ? "这是纯视觉模式：明确写出画面不得新增文字、数字、Logo、标签、角标和水印，商品原有印刷内容保持不变。"
          : `如需文字，只建议表达方向，不得臆造具体参数；文字使用${fields.language}。`
      }
7. 如果已有内容不为空，在不改变事实的前提下补全和润色，不要重复堆砌。`,
    },
  ];
  if (files[0]) {
    content.push({ type: "input_image", image_url: await writingVisionDataUrl(files[0]) });
  }

  const requestSuggestion = async (requestContent) => {
    const response = await openai.responses.create(
      {
        model: TEXT_MODEL,
        input: [{ role: "user", content: requestContent }],
        text: {
          format: {
            type: "json_schema",
            name: "assist_writing",
            strict: true,
            schema: ASSIST_WRITING_SCHEMA,
          },
        },
      },
      { timeout: 90_000, maxRetries: 1 }
    );
    return parseJsonOutput(response.output_text);
  };

  try {
    return {
      result: await requestSuggestion(content),
      usedImages: files[0] ? 1 : 0,
      visionFallback: false,
    };
  } catch (error) {
    const cleaned = cleanError(error, "AI 帮写失败");
    if (!files[0] || cleaned.code !== "AI_CONNECTION_INTERRUPTED") throw error;
    return {
      result: await requestSuggestion(content.filter((item) => item.type !== "input_image")),
      usedImages: 0,
      visionFallback: true,
    };
  }
};

const saveUploads = async (jobId, files) => {
  const directory = path.join(JOB_ROOT, jobId);
  await fs.mkdir(directory, { recursive: true });
  return Promise.all(
    files.map(async (file, index) => {
      const extension = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
      const filePath = path.join(directory, `input-${index + 1}.${extension}`);
      await fs.writeFile(filePath, file.buffer);
      return { path: filePath, mimetype: file.mimetype, originalname: file.originalname };
    })
  );
};

const prepareImageModelInput = async (input, targetSize = MODEL_PREVIEW_INPUT_SIZE) => {
  const directory = path.dirname(input.path);
  const filename = `${path.parse(input.path).name}-model-${targetSize}.png`;
  const outputPath = path.join(directory, filename);

  try {
    await fs.access(outputPath);
  } catch {
    await sharp(input.path, { failOn: "none" })
      .rotate()
      .resize(targetSize, targetSize, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        withoutEnlargement: false,
      })
      .flatten({ background: "#ffffff" })
      .toColourspace("srgb")
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
  }

  const metadata = await sharp(outputPath).metadata();
  if (
    metadata.format !== "png" ||
    metadata.width !== targetSize ||
    metadata.height !== targetSize ||
    metadata.space !== "srgb"
  ) {
    throw new Error("图片标准化失败，请重新上传 PNG、JPEG 或 WebP 文件");
  }

  return { path: outputPath, mimetype: "image/png", originalname: filename };
};

const getImagePayload = (response) => {
  const item = response?.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) return fetch(item.url).then(async (result) => {
    if (!result.ok) throw new Error(`无法下载模型返回的图片：HTTP ${result.status}`);
    return Buffer.from(await result.arrayBuffer());
  });
  throw new Error("图片模型没有返回可用图片");
};

const imageRequestProfile = (job) => {
  const preview = job.fields.quality === "快速";
  const highQuality = job.fields.quality === "高清";
  const model = preview ? PREVIEW_IMAGE_MODEL : IMAGE_MODEL;
  return {
    model,
    modelLabel: preview ? "GPT Image 1 Mini" : "GPT Image 2",
    tier: preview ? "构图预览" : highQuality ? "高清终稿" : "标准成品",
    inputSize: highQuality
      ? MODEL_HIGH_INPUT_SIZE
      : preview
        ? MODEL_PREVIEW_INPUT_SIZE
        : MODEL_STANDARD_INPUT_SIZE,
    quality: preview ? "low" : highQuality ? "high" : "medium",
    outputFormat: preview ? "jpeg" : "png",
    outputCompression: preview ? 72 : null,
    isPreview: preview,
  };
};

const cleanShortText = (value, maxLength) => String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);

const normalizeSellingPoints = (points) =>
  Array.isArray(points)
    ? points.map((item) => cleanShortText(item, 40)).filter(Boolean).slice(0, 6)
    : [];

const normalizeSelectedStyle = (style) => {
  if (!style || typeof style !== "object") return null;
  const normalized = {
    name: cleanShortText(style.name, 30),
    description: cleanShortText(style.description, 120),
    promptHint: cleanShortText(style.promptHint, 240),
    custom: Boolean(style.custom),
  };
  return normalized.name || normalized.description || normalized.promptHint ? normalized : null;
};

const applyAnalysisPatch = (job, patch = {}) => {
  const sellingPoints = normalizeSellingPoints(patch.sellingPoints);
  if (sellingPoints.length) job.analysis.sellingPoints = sellingPoints;

  if (["无文字（纯视觉）", "中文（简体）", "中文（繁体）", "英语", "中英结合"].includes(patch.language)) {
    job.fields.language = patch.language;
  }

  const selectedStyle = normalizeSelectedStyle(patch.selectedStyle);
  if (selectedStyle) job.analysis.selectedStyle = selectedStyle;
};

const productLockDirective = (protectionSummary = "") =>
  [
    "主体锁定是最高优先级：把用户上传的商品视为不可重新设计的实物照片层。",
    "必须严格保留商品轮廓、比例、结构、材质、真实颜色、包装形状、封口/拉链/孔位/挂绳/配件位置、品牌识别和原有印刷内容。",
    "不得在商品表面新增、替换或重绘任何图案、纹样、贴纸、印章、Logo、文字、商标、插画、装饰边框或材质效果。",
    "如果选择国风、山水、云纹、茶席、礼盒、科技感、生活方式等风格，只能作用于商品外部的背景、台面、道具、标题区、信息卡片、光影、留白和版式，不得画到商品本体上。",
    "商品本体应像从原图中真实保留下来的实拍产品，而不是重新生成的新包装设计。",
    protectionSummary ? `保护要点：${protectionSummary}。` : "",
  ]
    .filter(Boolean)
    .join("\n");

const buildImagePrompt = (job, output, index = 0) => {
  const noText = job.fields.language === "无文字（纯视觉）";
  const sellingPoints = normalizeSellingPoints(job.analysis.sellingPoints);
  const sellingPointRule = sellingPoints.length
    ? `用户确认卖点：${sellingPoints.join("；")}。`
    : "用户未确认具体卖点时，只根据图片可见信息和用户输入做简洁表达。";
  const selectedStyle = normalizeSelectedStyle(job.analysis.selectedStyle);
  const styleRule = selectedStyle
    ? `用户选择风格：${selectedStyle.name}。${selectedStyle.description} ${selectedStyle.promptHint}`
    : `视觉方向：${job.analysis.visualDirection}`;
  const languageRule = noText
    ? "不新增任何文字、数字、Logo、标签、标题、角标或水印；商品原有印刷内容保持原样。"
    : `可使用${job.fields.language}短标题/卖点，必须来自用户确认信息或图片可见事实，不编造品牌、规格、功效、认证、价格；商品原有印刷内容保持原样。`;

  const roleRule = output.creativeRole
    ? `本张图创意角色：${output.creativeRole}。请让画面明确服务这个角色，不要复制其他输出图的构图。`
    : "本张图需要有独立的电商创意角色，不要与其他输出重复构图。";
  const platformRule = getPlatformVisualRule(job.fields.platform);
  const recipeRule = getVisualRecipeRule(output);
  const layoutGuard = repeatedLayoutGuard(output);
  const detailIndependenceRule =
    output.planType === "detail" || output.type === "详情页"
      ? "详情页规则：这是一个独立屏，不是整张长图；只围绕本屏主题构图，可作为后续拼接长图的一屏使用。"
      : "";
  const commercialDirectorRule =
    "做成可上架的国内电商图：主视觉清楚，背景有层次，光影有质感，文字少而有层级，有明确点击理由；不要只做白底商品加大字。";
  const conciseOutputPrompt = cleanShortText(output.prompt, 1200);
  const protectionSummary = cleanShortText((job.analysis.protectionRules || []).slice(0, 4).join("；"), 360);

  return `【本张生成任务】
第 ${index + 1} 张：${output.type} / ${output.creativeRole || output.title}
${conciseOutputPrompt}

【平台与构图】
${styleRule}
${sellingPointRule}
${roleRule}
${platformRule}
${recipeRule}
${layoutGuard}
${detailIndependenceRule}
输出类型：${output.type}。目标平台：${job.fields.platform}。目标语言：${job.fields.language}。
${commercialDirectorRule}
${languageRule}
${productLockDirective(protectionSummary)}
创意只作用于商品外部的背景、光影、构图、留白、排版和可信卖点表达。`;
};

const buildRetryImagePrompt = (job, output, index = 0) => {
  const noText = job.fields.language === "无文字（纯视觉）";
  const selectedStyle = normalizeSelectedStyle(job.analysis.selectedStyle);
  const sellingPoints = normalizeSellingPoints(job.analysis.sellingPoints);
  return `重试生成第 ${index + 1} 张${output.type}。
主题：${output.title}。创意角色：${output.creativeRole || "独立电商主图"}。
画面方向：${cleanShortText(output.description || output.prompt, 260)}
${selectedStyle ? `风格：${selectedStyle.name}，${selectedStyle.promptHint}` : `风格：${cleanShortText(job.analysis.visualDirection, 180)}`}
${sellingPoints.length ? `确认卖点：${sellingPoints.slice(0, 4).join("；")}。` : ""}
要求：做成可上架的国内电商图，商品真实、主视觉清楚、背景和光影有购买欲，构图不要重复普通白底证件照。
${noText ? "不新增任何文字，保留商品原有印刷内容。" : `可以使用${job.fields.language}短标题或卖点文字，但不得编造品牌、规格、功效、认证或价格。`}
${productLockDirective()}`;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateOneImage = async (job, output, index, options = {}) => {
  const profile = sizeProfiles[job.fields.ratio] || sizeProfiles["1:1 正方形"];
  const requestProfile = imageRequestProfile(job);
  const prompt = options.retry ? buildRetryImagePrompt(job, output, index) : buildImagePrompt(job, output, index);
  let response;
  if (job.fields.mode === "logo") {
    response = await openai.images.generate(
      {
        model: requestProfile.model,
        prompt,
        n: 1,
        size: profile.api,
        quality: requestProfile.quality,
        output_format: requestProfile.outputFormat,
        ...(requestProfile.outputCompression
          ? { output_compression: requestProfile.outputCompression }
          : {}),
      },
      { timeout: IMAGE_REQUEST_TIMEOUT_MS, maxRetries: 0 }
    );
  } else {
    const input =
      job.preparedInputs?.[0] || (await prepareImageModelInput(job.inputs[0], requestProfile.inputSize));
    response = await openai.images.edit(
      {
        model: requestProfile.model,
        image: await toFile(await fs.readFile(input.path), path.basename(input.path), { type: input.mimetype }),
        prompt,
        n: 1,
        size: profile.api,
        quality: requestProfile.quality,
        output_format: requestProfile.outputFormat,
        ...(requestProfile.outputCompression
          ? { output_compression: requestProfile.outputCompression }
          : {}),
      },
      { timeout: IMAGE_REQUEST_TIMEOUT_MS, maxRetries: 0 }
    );
  }

  const sourceBuffer = await getImagePayload(response);
  const outputDirectory = path.join(GENERATED_ROOT, job.id);
  await fs.mkdir(outputDirectory, { recursive: true });
  const filename = `result-${index + 1}.png`;
  const outputPath = path.join(outputDirectory, filename);
  await sharp(sourceBuffer)
    .resize(profile.width, profile.height, { fit: "cover", position: "centre" })
    .png({ quality: 95 })
    .toFile(outputPath);

  return {
    id: `result-${index + 1}`,
    type: output.type,
    title: output.title,
    creativeRole: output.creativeRole || "",
    note: output.description,
    url: `/generated/${job.id}/${filename}`,
    width: profile.width,
    height: profile.height,
    model: requestProfile.model,
    modelLabel: requestProfile.modelLabel,
    qualityTier: requestProfile.tier,
    preview: requestProfile.isPreview,
    version: 0,
    versions: [{ id: 0, label: "原图", url: `/generated/${job.id}/${filename}`, prompt: "首次生成" }],
  };
};

const maxGenerationAttempts = () => Math.max(1, IMAGE_GENERATION_MAX_ATTEMPTS);

const createGenerationItems = (outputs) =>
  outputs.map((output, index) => ({
    index,
    type: output.type,
    title: output.title,
    creativeRole: output.creativeRole || "",
    status: "queued",
    attempts: 0,
    maxAttempts: maxGenerationAttempts(),
    resultId: null,
    error: null,
    progressLabel: "排队中",
    startedAt: null,
    completedAt: null,
  }));

const ensureGenerationItems = (job, { reset = false } = {}) => {
  if (
    reset ||
    !Array.isArray(job.generationItems) ||
    job.generationItems.length !== job.analysis.outputs.length
  ) {
    job.generationItems = createGenerationItems(job.analysis.outputs);
  } else {
    job.generationItems = job.generationItems.map((item, index) => ({
      ...createGenerationItems(job.analysis.outputs)[index],
      ...item,
      index,
      type: job.analysis.outputs[index].type,
      title: job.analysis.outputs[index].title,
      creativeRole: job.analysis.outputs[index].creativeRole || item.creativeRole || "",
      maxAttempts: maxGenerationAttempts(),
      progressLabel: generationItemProgressLabel(item),
    }));
  }
  return job.generationItems;
};

const removeFailedResult = (job, index) => {
  job.failedResults = (job.failedResults || []).filter((item) => item.index !== index);
};

const upsertGeneratedResult = (job, generated) => {
  const results = Array.isArray(job.results) ? [...job.results] : [];
  const existingIndex = results.findIndex((item) => item.id === generated.id);
  if (existingIndex >= 0) {
    results[existingIndex] = generated;
  } else {
    results.push(generated);
  }
  results.sort((a, b) => {
    const numberA = Number(String(a.id || "").match(/\d+/)?.[0] || 0);
    const numberB = Number(String(b.id || "").match(/\d+/)?.[0] || 0);
    return numberA - numberB;
  });
  job.results = results;
};

const generationSummary = (job) => {
  const items = job.generationItems || [];
  const completed = items.filter((item) => item.status === "completed").length;
  const failed = items.filter((item) => ["failed", "interrupted"].includes(item.status)).length;
  const active = items.filter((item) => ["generating", "retrying"].includes(item.status)).length;
  const queued = items.filter((item) => item.status === "queued").length;
  const total = items.length || 1;
  return {
    completed,
    failed,
    active,
    queued,
    total,
    progress: 25 + Math.round(((completed + failed) / total) * 65),
  };
};

const updateGenerationState = (job, stage) => {
  const summary = generationSummary(job);
  updateJob(job, {
    progress: summary.progress,
    stage,
    results: job.results || [],
    failedResults: job.failedResults || [],
    generationItems: job.generationItems || [],
  });
};

const finishGenerationJob = (job) => {
  const summary = generationSummary(job);
  const hasResults = Boolean(job.results?.length);
  if (!hasResults) {
    const firstFailure = job.failedResults?.[0] || job.generationItems?.find((item) => item.error)?.error;
    updateJob(job, {
      status: "failed",
      progress: 100,
      stage: firstFailure?.code === "GATEWAY_TIMEOUT" ? "图片通道超时，可单张重试" : "生成失败，可单张重试",
      error: {
        message: firstFailure?.message || "本次没有生成可用图片，请稍后重试",
        requestId: firstFailure?.requestId || null,
        code: firstFailure?.code || null,
        retryable: firstFailure?.retryable ?? true,
      },
    });
    logJobEvent("generation_failed", {
      jobId: job.id,
      failed: summary.failed,
      total: summary.total,
    });
    return;
  }
  updateJob(job, {
    status: "completed",
    progress: 100,
    stage: summary.failed ? "部分图片未完成，可单张重试" : "生成完成",
    error: summary.failed
      ? {
          message: `已生成 ${summary.completed} 张，${summary.failed} 张未完成。可先使用已完成图片，失败项可单独重试。`,
          requestId: job.failedResults?.find((item) => item.requestId)?.requestId || null,
          code: "PARTIAL_GENERATION",
          retryable: true,
          partial: true,
        }
      : null,
  });
  logJobEvent("generation_completed", {
    jobId: job.id,
    results: job.results?.length || 0,
    failed: summary.failed,
    partial: Boolean(summary.failed),
  });
};

const runGeneration = async (job) => {
  if (activeGenerationJobs.has(job.id)) return;
  activeGenerationJobs.add(job.id);
  try {
    const requestProfile = imageRequestProfile(job);
    const generationItems = ensureGenerationItems(job);
    const total = generationItems.length;
    job.generationProfile = {
      model: requestProfile.model,
      modelLabel: requestProfile.modelLabel,
      qualityTier: requestProfile.tier,
      preview: requestProfile.isPreview,
      maxAttempts: maxGenerationAttempts(),
    };
    updateJob(job, {
      status: "generating",
      progress: job.progress || 25,
      stage: "正在处理生成队列",
      error: null,
      failedResults: job.failedResults || [],
      results: job.results || [],
      generationItems,
    });
    if (job.fields.mode !== "logo") {
      job.preparedInputs = [
        await prepareImageModelInput(job.inputs[0], imageRequestProfile(job).inputSize),
      ];
    }
    console.log(
      `[generation:start] job=${job.id} count=${total} model=${requestProfile.model} quality=${requestProfile.quality} attempts=${maxGenerationAttempts()}`
    );
    logJobEvent("generation_started", {
      jobId: job.id,
      count: total,
      model: requestProfile.model,
      quality: requestProfile.quality,
      maxAttempts: maxGenerationAttempts(),
    });
    for (let index = 0; index < total; index += 1) {
      const current = job.analysis.outputs[index];
      const itemState = generationItems[index];
      if (itemState.status !== "queued") continue;
      removeFailedResult(job, index);
      itemState.status = "generating";
      itemState.startedAt = itemState.startedAt || nowIso();
      itemState.error = null;
      itemState.progressLabel = generationItemProgressLabel(itemState);
      updateGenerationState(job, `正在生成 ${index + 1} / ${total} · ${current.type}`);

      let generated = null;
      let finalError = null;
      const maxAttempts = maxGenerationAttempts();
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        itemState.attempts = attempt;
        itemState.status = attempt > 1 ? "retrying" : "generating";
        itemState.progressLabel = generationItemProgressLabel(itemState);
        updateGenerationState(
          job,
          attempt > 1
            ? `正在重试 ${index + 1} / ${total} · 第 ${attempt} 次`
            : `正在生成 ${index + 1} / ${total} · ${current.type}`
        );
        try {
          generated = await generateOneImage(job, current, index, { retry: attempt > 1 });
          break;
        } catch (error) {
          const cleaned = cleanError(error);
          finalError = cleaned;
          itemState.error = cleaned;
          console.warn(
            `[generation:attempt-failed] job=${job.id} index=${index + 1}/${total} attempt=${attempt}/${maxAttempts} code=${cleaned.code || "UNKNOWN"} requestId=${cleaned.requestId || "-"} title=${current.title}`
          );
          logJobEvent("generation_attempt_failed", {
            jobId: job.id,
            index,
            attempt,
            maxAttempts,
            code: cleaned.code || "UNKNOWN",
            requestId: cleaned.requestId || null,
            title: current.title,
          });
          if (!cleaned.retryable || attempt >= maxAttempts) break;
          updateGenerationState(
            job,
            `${current.title} 连接中断，${Math.round(IMAGE_GENERATION_RETRY_DELAY_MS / 1000)} 秒后自动重试`
          );
          await wait(IMAGE_GENERATION_RETRY_DELAY_MS);
        }
      }

      if (generated) {
        itemState.status = "completed";
        itemState.resultId = generated.id;
        itemState.error = null;
        itemState.progressLabel = generationItemProgressLabel(itemState);
        itemState.completedAt = nowIso();
        upsertGeneratedResult(job, generated);
        logJobEvent("generation_item_completed", {
          jobId: job.id,
          index,
          resultId: generated.id,
          title: generated.title,
          attempts: itemState.attempts,
        });
        updateGenerationState(
          job,
          generationSummary(job).completed + generationSummary(job).failed < total
            ? `已完成 ${generationSummary(job).completed} 张，继续生成下一张`
            : "生成收尾中"
        );
        continue;
      }

      itemState.status = "failed";
      itemState.completedAt = nowIso();
      const cleaned = finalError || { message: "图片生成失败", code: null, retryable: true, requestId: null };
      itemState.error = cleaned;
      itemState.progressLabel = generationItemProgressLabel(itemState);
      job.failedResults = (job.failedResults || []).filter((item) => item.index !== index);
      job.failedResults.push({
        index,
        type: current.type,
        title: current.title,
        creativeRole: current.creativeRole || "",
        message: cleaned.message,
        code: cleaned.code,
        retryable: cleaned.retryable,
        requestId: cleaned.requestId,
        attempts: itemState.attempts,
      });
      logJobEvent("generation_item_failed", {
        jobId: job.id,
        index,
        code: cleaned.code || "UNKNOWN",
        requestId: cleaned.requestId || null,
        title: current.title,
        attempts: itemState.attempts,
      });
      updateGenerationState(
        job,
        cleaned.code === "GATEWAY_TIMEOUT"
          ? `${current.title} 多次等待超时，继续处理下一张`
          : `${current.title} 多次生成失败，继续处理下一张`
      );
    }
    finishGenerationJob(job);
  } catch (error) {
    const cleaned = cleanError(error);
    updateJob(job, {
      status: "failed",
      stage:
        cleaned.code === "GATEWAY_TIMEOUT"
          ? "图片通道超时，可减少张数后重试"
          : cleaned.retryable
            ? "生成连接中断，可重试"
            : "生成失败",
      error: cleaned,
    });
    logJobEvent("generation_crashed", {
      jobId: job.id,
      code: cleaned.code || "UNKNOWN",
      requestId: cleaned.requestId || null,
    });
  } finally {
    activeGenerationJobs.delete(job.id);
  }
};

const safetyCheck = async (job, prompt, scope = "whole_image") => {
  const scopeInstruction =
    scope === "selection"
      ? "本次用户提供了圈选区域，请优先修改圈选区域，未圈选区域尽量保持不变。"
      : "本次用户没有提供圈选区域，请按整张图理解修改要求，主要调整背景、文字、卖点、排版、留白、光影和整体电商表达。";
  const response = await openai.responses.create({
    model: TEXT_MODEL,
    input: `判断下面的图片修改要求是否会改变真实商品的形状、材质、真实颜色、结构、配件或品牌标识。
允许修改背景、文字、卖点、排版、留白、光影和清晰度。
修改范围：${scopeInstruction}
商品保护规则：${job.analysis.protectionRules.join("；")}
用户要求：${prompt}
如果允许，safePrompt 必须重写为清晰的图片编辑指令，并再次强调：只修改商品外部背景、文字、卖点、排版、留白、光影或圈选区域，不得在商品表面新增或替换图案、纹样、贴纸、Logo、文字、商标、包装插画或材质效果，保持真实商品主体不变。`,
    text: {
      format: {
        type: "json_schema",
        name: "edit_safety",
        strict: true,
        schema: SAFETY_SCHEMA,
      },
    },
  });
  return parseJsonOutput(response.output_text);
};

const buildEditMask = async (maskBuffer, sourcePath) => {
  const metadata = await sharp(sourcePath).metadata();
  const { data, info } = await sharp(maskBuffer)
    .resize(metadata.width, metadata.height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const output = Buffer.alloc(info.width * info.height * 4);
  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < data.length; sourceIndex += info.channels, targetIndex += 4) {
    output[targetIndex] = 255;
    output[targetIndex + 1] = 255;
    output[targetIndex + 2] = 255;
    output[targetIndex + 3] = data[sourceIndex + info.channels - 1] > 0 ? 0 : 255;
  }
  return sharp(output, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
};

const findResult = (job, imageId) => job.results.find((item) => item.id === imageId);

app.get("/api/health", (_request, response) => {
  response.json({
    ok:
      modelState.reachable &&
      modelState.textAvailable &&
      modelState.imageAvailable,
    provider: providerHost(),
    models: {
      text: { id: TEXT_MODEL, available: modelState.textAvailable },
      image: { id: IMAGE_MODEL, available: modelState.imageAvailable },
      previewImage: { id: PREVIEW_IMAGE_MODEL, available: modelState.previewImageAvailable },
    },
    checkedAt: modelState.checkedAt,
    error: modelState.error,
  });
});

app.get("/api/diagnostics", async (_request, response) => {
  const byStatus = {};
  const allItems = [];
  for (const job of jobs.values()) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
    (job.generationItems || []).forEach((item) => allItems.push({ job, item }));
  }
  const itemDurations = allItems
    .map(({ item }) => {
      if (!item.startedAt || !item.completedAt) return null;
      const started = Date.parse(item.startedAt);
      const completed = Date.parse(item.completedAt);
      return Number.isFinite(started) && Number.isFinite(completed) && completed >= started
        ? completed - started
        : null;
    })
    .filter((value) => value !== null);
  const timeoutCount = allItems.filter(({ item }) => item.error?.code === "GATEWAY_TIMEOUT").length;
  const interruptedCount = allItems.filter(({ item }) => item.status === "interrupted").length;
  const failedItemCount = allItems.filter(({ item }) => item.status === "failed").length;
  const completedItemCount = allItems.filter(({ item }) => item.status === "completed").length;
  const averageItemDurationMs = itemDurations.length
    ? Math.round(itemDurations.reduce((sum, value) => sum + value, 0) / itemDurations.length)
    : null;
  const activeJobs = Array.from(jobs.values())
    .filter((job) => ["queued", "generating"].includes(job.status))
    .map((job) => ({
      id: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      results: job.results?.length || 0,
      failedResults: job.failedResults?.length || 0,
      generationItems: (job.generationItems || []).map((item) => ({
        index: item.index,
        title: item.title,
        status: item.status,
        attempts: item.attempts,
        progressLabel: item.progressLabel || generationItemProgressLabel(item),
        code: item.error?.code || null,
        requestId: item.error?.requestId || null,
      })),
      updatedAt: job.updatedAt,
    }));
  response.json({
    ok: modelState.reachable && modelState.textAvailable && modelState.imageAvailable,
    uptimeSeconds: Math.round(process.uptime()),
    provider: providerHost(),
    models: {
      text: { id: TEXT_MODEL, available: modelState.textAvailable },
      image: { id: IMAGE_MODEL, available: modelState.imageAvailable },
      previewImage: { id: PREVIEW_IMAGE_MODEL, available: modelState.previewImageAvailable },
    },
    imageChannel: {
      requestTimeoutMs: AI_REQUEST_TIMEOUT_MS,
      imageRequestTimeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
      maxRecommendedSyncOutputs: MAX_RECOMMENDED_SYNC_OUTPUTS,
      maxAttempts: IMAGE_GENERATION_MAX_ATTEMPTS,
      retryDelayMs: IMAGE_GENERATION_RETRY_DELAY_MS,
      inputSizes: {
        preview: MODEL_PREVIEW_INPUT_SIZE,
        standard: MODEL_STANDARD_INPUT_SIZE,
        high: MODEL_HIGH_INPUT_SIZE,
      },
    },
    jobs: {
      inMemory: jobs.size,
      byStatus,
      items: {
        total: allItems.length,
        completed: completedItemCount,
        failed: failedItemCount,
        interrupted: interruptedCount,
        timeout: timeoutCount,
        averageItemDurationMs,
        activeWorkers: activeGenerationJobs.size,
      },
      active: activeJobs,
      persistedDirectories: await countRuntimeDirectories(JOB_ROOT),
      generatedDirectories: await countRuntimeDirectories(GENERATED_ROOT),
    },
    recentEvents: await readRecentJobEvents(20),
    checkedAt: modelState.checkedAt,
    error: modelState.error,
  });
});

app.post(
  "/api/assist-writing",
  requireTextModel,
  upload.array("images", MAX_FILES),
  async (request, response) => {
    try {
      const fields = {
        mode: request.body.mode || "main",
        platform: request.body.platform || "智能匹配",
        language: request.body.language || "中文（简体）",
        ratio: request.body.ratio || "1:1 正方形",
        currentText: String(request.body.currentText || "").trim().slice(0, 2000),
      };
      const assisted = await assistWritingWithAI(request.files || [], fields);
      response.json({
        suggestion: assisted.result.suggestion.trim(),
        model: TEXT_MODEL,
        usedImages: assisted.usedImages,
        visionFallback: assisted.visionFallback,
      });
    } catch (error) {
      const cleaned = cleanError(error, "AI 帮写失败");
      logJobEvent("assist_writing_failed", {
        code: cleaned.code || "UNKNOWN",
        requestId: cleaned.requestId || null,
        status: error?.status || null,
      });
      response.status(error?.status || 502).json({ error: cleaned });
    }
  }
);

app.post("/api/jobs/analyze", requireModels, upload.array("images", MAX_FILES), async (request, response) => {
  try {
    if (!request.files?.length) {
      return response.status(400).json({ error: { message: "请至少上传一张商品图片" } });
    }
    const fields = {
      mode: request.body.mode || "main",
      platform: request.body.platform || "智能匹配",
      requirements: request.body.requirements || "",
      language: request.body.language || "中文（简体）",
      ratio: request.body.ratio || "1:1 正方形",
      quality: "标准",
      generationCount: request.body.generationCount || "",
    };
    const id = crypto.randomUUID();
    const inputs = await saveUploads(id, request.files);
    const analysis = await analyzeWithAI(request.files, fields);
    const job = {
      id,
      status: "awaiting_confirmation",
      progress: 20,
      stage: "等待确认生成方案",
      fields,
      inputs,
      analysis,
      results: [],
      error: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    jobs.set(id, job);
    await persistJob(job);
    logJobEvent("job_created", {
      jobId: id,
      mode: fields.mode,
      platform: fields.platform,
      outputs: analysis.outputs.length,
    });
    response.status(201).json(publicJob(job));
  } catch (error) {
    const cleaned = cleanError(error, "商品分析失败");
    logJobEvent("analysis_failed", {
      code: cleaned.code || "UNKNOWN",
      requestId: cleaned.requestId || null,
      status: error?.status || null,
    });
    response.status(error?.status || 502).json({ error: cleaned });
  }
});

app.post("/api/jobs/:jobId/generate", requireModels, (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) return response.status(404).json({ error: { message: "生成任务不存在或已过期" } });
  if (job.status !== "awaiting_confirmation" && job.status !== "failed") {
    return response.status(409).json({ error: { message: "当前任务状态不能开始生成" } });
  }
  if (request.body.analysisPatch && typeof request.body.analysisPatch === "object") {
    applyAnalysisPatch(job, request.body.analysisPatch);
  }
  if (Array.isArray(request.body.outputPlan)) {
    const normalized = outputsFromPlan(job, request.body.outputPlan, request.body.outputs);
    if (!normalized.outputs.length) {
      return response.status(400).json({ error: { message: "生成方案至少需要包含 1 张图片" } });
    }
    if (normalized.outputs.some((item) => !item.title?.trim() || !item.prompt?.trim())) {
      return response.status(400).json({ error: { message: "确认方案中的标题和生成指令不能为空" } });
    }
    job.analysis.recommendedOutputPlan = normalized.plan;
    job.analysis.outputs = normalized.outputs;
  } else if (Array.isArray(request.body.outputs)) {
    if (
      request.body.outputs.length !== job.analysis.outputs.length ||
      request.body.outputs.some((item) => !item?.title?.trim() || !item?.prompt?.trim())
    ) {
      return response.status(400).json({ error: { message: "确认方案中的标题和生成指令不能为空" } });
    }
    job.analysis.outputs = request.body.outputs.map((item, index) => ({
      ...job.analysis.outputs[index],
      title: String(item.title).trim().slice(0, 100),
      creativeRole: String(item.creativeRole || job.analysis.outputs[index].creativeRole || "").trim().slice(0, 60),
      description: String(item.description || job.analysis.outputs[index].description || "").trim().slice(0, 180),
      prompt: String(item.prompt).trim().slice(0, 3000),
    }));
  }
  if (["标准", "高清"].includes(request.body.quality)) {
    job.fields.quality = request.body.quality;
    job.preparedInputs = null;
  }
  ensureGenerationItems(job, { reset: true });
  updateJob(job, {
    status: "queued",
    progress: 22,
    stage: "已进入生成队列",
    error: null,
    results: [],
    failedResults: [],
    generationItems: job.generationItems,
  });
  logJobEvent("job_queued", {
    jobId: job.id,
    outputs: job.analysis.outputs.length,
    mode: job.fields.mode,
    platform: job.fields.platform,
  });
  void runGeneration(job);
  response.status(202).json(publicJob(job));
});

app.post("/api/jobs/:jobId/items/:index/retry", requireModels, (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) return response.status(404).json({ error: { message: "生成任务不存在或已过期" } });
  if (activeGenerationJobs.has(job.id)) {
    return response.status(409).json({ error: { message: "当前任务正在生成，请稍后再重试单张图片" } });
  }
  ensureGenerationItems(job);
  const index = Number.parseInt(request.params.index, 10);
  const item = job.generationItems[index];
  if (!item) return response.status(404).json({ error: { message: "待重试图片不存在" } });
  if (!["failed", "interrupted"].includes(item.status)) {
    return response.status(409).json({ error: { message: "只有失败或中断的图片可以单独重试" } });
  }

  removeFailedResult(job, index);
  Object.assign(item, {
    status: "queued",
    attempts: 0,
    resultId: null,
    error: null,
    progressLabel: "排队中",
    startedAt: null,
    completedAt: null,
  });
  updateJob(job, {
    status: "queued",
    progress: generationSummary(job).progress,
    stage: `已重新排队：${item.title}`,
    error: null,
    failedResults: job.failedResults || [],
    generationItems: job.generationItems,
  });
  logJobEvent("generation_item_requeued", {
    jobId: job.id,
    index,
    title: item.title,
  });
  void runGeneration(job);
  response.status(202).json(publicJob(job));
});

app.get("/api/jobs/:jobId", (request, response) => {
  const job = jobs.get(request.params.jobId);
  if (!job) return response.status(404).json({ error: { message: "生成任务不存在或已过期" } });
  response.json(publicJob(job));
});

app.post(
  "/api/jobs/:jobId/refine",
  requireModels,
  upload.single("mask"),
  async (request, response) => {
    try {
      const job = jobs.get(request.params.jobId);
      if (!job) return response.status(404).json({ error: { message: "生成任务不存在或已过期" } });
      const result = findResult(job, request.body.imageId);
      if (!result) return response.status(404).json({ error: { message: "待修改图片不存在" } });
      const prompt = String(request.body.prompt || "").trim();
      if (!prompt) return response.status(400).json({ error: { message: "请输入修改要求" } });
      const scope = request.file ? "selection" : "whole_image";

      const safety = await safetyCheck(job, prompt, scope);
      if (!safety.allowed) {
        return response.status(422).json({ error: { message: safety.reason, code: "PRODUCT_PROTECTED" } });
      }

      const activeVersionId = Number(request.body.versionId || result.version || 0);
      const activeVersion = result.versions.find((item) => item.id === activeVersionId) || result.versions[0];
      const sourcePath = path.join(GENERATED_ROOT, job.id, path.basename(activeVersion.url));
      const maskBuffer = request.file ? await buildEditMask(request.file.buffer, sourcePath) : null;
      const requestProfile = imageRequestProfile(job);
      const edited = await openai.images.edit(
        {
          model: requestProfile.model,
          image: await toFile(await fs.readFile(sourcePath), path.basename(sourcePath), { type: "image/png" }),
          ...(maskBuffer ? { mask: await toFile(maskBuffer, "mask.png", { type: "image/png" }) } : {}),
          prompt: safety.safePrompt,
          n: 1,
          size: "auto",
          quality: requestProfile.quality,
          output_format: requestProfile.outputFormat,
          ...(requestProfile.outputCompression
            ? { output_compression: requestProfile.outputCompression }
            : {}),
        },
        { timeout: IMAGE_REQUEST_TIMEOUT_MS, maxRetries: 0 }
      );
      const sourceBuffer = await getImagePayload(edited);
      const versionId = result.versions.length;
      const filename = `${result.id}-version-${versionId}.png`;
      const outputPath = path.join(GENERATED_ROOT, job.id, filename);
      const metadata = await sharp(sourcePath).metadata();
      await sharp(sourceBuffer)
        .resize(metadata.width, metadata.height, { fit: "cover", position: "centre" })
        .png({ quality: 95 })
        .toFile(outputPath);
      const version = {
        id: versionId,
        label: `版本 ${versionId}`,
        url: `/generated/${job.id}/${filename}`,
        prompt,
      };
      result.versions.push(version);
      result.version = versionId;
      result.url = version.url;
      updateJob(job, { stage: "精修完成" });
      logJobEvent("refine_completed", {
        jobId: job.id,
        imageId: result.id,
        versionId,
        scope,
      });
      response.status(201).json({
        result,
        version,
        message:
          scope === "selection"
            ? "已按圈选区域生成新版本，原图和历史版本均已保留。"
            : "已按整张图修改要求生成新版本，原图和历史版本均已保留。",
      });
    } catch (error) {
      const cleaned = cleanError(error, "图片精修失败");
      logJobEvent("refine_failed", {
        jobId: request.params.jobId,
        code: cleaned.code || "UNKNOWN",
        requestId: cleaned.requestId || null,
        status: error?.status || null,
      });
      response.status(error?.status || 502).json({ error: cleaned });
    }
  }
);

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "单张图片不能超过 10MB"
        : error.code === "LIMIT_FILE_COUNT"
          ? "最多上传 6 张图片"
          : "图片上传失败";
    return response.status(400).json({ error: { message } });
  }
  response.status(400).json({ error: cleanError(error, "请求处理失败") });
});

const checkModels = async () => {
  modelState.checkedAt = nowIso();
  if (!aiConfig.apiKey) {
    modelState.reachable = false;
    modelState.textAvailable = false;
    modelState.imageAvailable = false;
    modelState.previewImageAvailable = false;
    modelState.error = "未配置 API Key";
    return;
  }
  if (!TEXT_MODEL || !IMAGE_MODEL) {
    modelState.reachable = false;
    modelState.textAvailable = false;
    modelState.imageAvailable = false;
    modelState.previewImageAvailable = false;
    modelState.error = "尚未选择文字模型或图片模型";
    return;
  }
  try {
    const page = await openai.models.list();
    const ids = new Set();
    for await (const model of page) ids.add(model.id);
    modelState.reachable = true;
    modelState.textAvailable = ids.has(TEXT_MODEL);
    modelState.imageAvailable = ids.has(IMAGE_MODEL);
    modelState.previewImageAvailable = ids.has(PREVIEW_IMAGE_MODEL);
    modelState.error =
      modelState.textAvailable && modelState.imageAvailable
        ? null
        : `模型不可用：${[
            !modelState.textAvailable ? TEXT_MODEL : null,
            !modelState.imageAvailable ? IMAGE_MODEL : null,
          ]
            .filter(Boolean)
            .join("、")}`;
  } catch (error) {
    modelState.reachable = false;
    modelState.textAvailable = false;
    modelState.imageAvailable = false;
    modelState.previewImageAvailable = false;
    modelState.error = cleanError(error, "无法读取模型列表").message;
  }
};

const cleanupExpiredFiles = async () => {
  const cutoff = Date.now() - FILE_TTL_MS;
  for (const [id, job] of jobs) {
    if (Date.parse(job.updatedAt) < cutoff) jobs.delete(id);
  }
  for (const directory of [JOB_ROOT, GENERATED_ROOT]) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const target = path.join(directory, entry.name);
          const stat = await fs.stat(target);
          if (stat.mtimeMs < cutoff) await fs.rm(target, { recursive: true, force: true });
        })
    );
  }
};

await loadRuntimeApiConfig();
const restoredJobs = await loadPersistedJobs();
await checkModels();
const modelCheckTimer = setInterval(() => void checkModels(), 10 * 60 * 1000);
const cleanupTimer = setInterval(() => void cleanupExpiredFiles(), 60 * 60 * 1000);

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`品图 AI 服务已启动：http://localhost:${PORT}/china-full.html`);
  console.log(`已恢复历史任务：${restoredJobs} 个`);
  console.log(
    modelState.reachable &&
      modelState.textAvailable &&
      modelState.imageAvailable
      ? `模型已就绪：${TEXT_MODEL} / ${IMAGE_MODEL}`
      : `AI 暂不可用：${modelState.error || "未配置"}`
  );
});

const shutdown = (signal) => {
  console.log(`收到 ${signal}，正在关闭品图 AI 服务`);
  clearInterval(modelCheckTimer);
  clearInterval(cleanupTimer);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (error) => {
  const cleaned = cleanError(error, "未处理的异步错误");
  logJobEvent("server_unhandled_rejection", {
    code: cleaned.code || "UNKNOWN",
    requestId: cleaned.requestId || null,
    message: cleaned.message,
  });
  console.error("[server:unhandled-rejection]", cleaned.message);
});
process.on("uncaughtException", (error) => {
  const cleaned = cleanError(error, "未捕获的服务错误");
  logJobEvent("server_uncaught_exception", {
    code: cleaned.code || "UNKNOWN",
    requestId: cleaned.requestId || null,
    message: cleaned.message,
  });
  console.error("[server:uncaught-exception]", cleaned.message);
});
